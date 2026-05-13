import { NextRequest, NextResponse } from 'next/server'
import { getMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'
import { evaluateTrade } from '@/lib/engines/tradePermission'
import { calculateEdgeScore, buildUserContext, DEFAULT_USER_CONTEXT } from '@/lib/edgeScore'
import { generateCoachMessages } from '@/lib/liveCoachEngine'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import { analyzeBehavior } from '@/lib/engines/behaviorEngine'
import type { TradeDirection, Trade } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { entryPrice, stopLoss, target, direction, symbol, userId } = body

    if (!entryPrice || !stopLoss || !target || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['CALL', 'PUT', 'LONG', 'SHORT'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    }

    if (entryPrice <= 0 || stopLoss <= 0 || target <= 0) {
      return NextResponse.json({ error: 'Prices must be positive' }, { status: 400 })
    }

    const marketData = await getMarketData(symbol || 'NIFTY')
    const { state: marketState } = evaluateMarketState(marketData)
    const evaluation = evaluateTrade(
      { entryPrice, stopLoss, target, direction: direction as TradeDirection },
      marketState,
      marketData
    )

    let userCtx = DEFAULT_USER_CONTEXT

    if (IS_DB_CONFIGURED && userId) {
      const { rows: trades } = await sql`
        SELECT * FROM trades
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `
      if (trades.length > 0) {
        const mapped: Trade[] = trades.map((t) => ({
          id: t.id, userId: t.user_id, symbol: t.symbol, direction: t.direction,
          entryPrice: t.entry_price, stopLoss: t.stop_loss, target: t.target,
          quantity: t.quantity, pnl: t.pnl, permissionStatus: t.permission_status,
          marketState: t.market_state, status: t.status, rrRatio: t.rr_ratio,
          createdAt: t.created_at, closedAt: t.closed_at,
        }))
        const behavior = analyzeBehavior(mapped)
        const today = new Date().toDateString()
        const todayTrades = mapped.filter(
          (t) => new Date(t.createdAt).toDateString() === today
        )
        userCtx = buildUserContext(
          behavior.consecutiveLosses,
          behavior.tradesToday,
          behavior.revengeRisk,
          2,
          todayTrades.map((t) => ({ permission: t.permissionStatus }))
        )
      }
    }

    const edgeScore = calculateEdgeScore(
      evaluation.permission,
      evaluation.rrRatio,
      evaluation.signals,
      userCtx
    )

    const coachMessages = generateCoachMessages(
      edgeScore,
      { permission: evaluation.permission, rrRatio: evaluation.rrRatio, signals: evaluation.signals },
      userCtx
    )

    return NextResponse.json({ ...evaluation, edgeScore, coachMessages })
  } catch {
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
