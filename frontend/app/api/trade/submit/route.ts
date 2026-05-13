import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED, toTextArray } from '@/lib/db'
import { generateMockMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'
import { evaluateTrade } from '@/lib/engines/tradePermission'
import { shouldAutoLock, getLockExpiry, analyzeBehavior } from '@/lib/engines/behaviorEngine'
import {
  calculateEdgeScore, buildUserContext, computeRollingAvg, DEFAULT_USER_CONTEXT,
} from '@/lib/edgeScore'
import type { TradeDirection, Trade } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, entryPrice, stopLoss, target, direction, symbol, quantity } = body

    if (!userId || !entryPrice || !stopLoss || !target || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const marketData = generateMockMarketData(symbol || 'NIFTY')
    const { state: marketState } = evaluateMarketState(marketData)
    const evaluation = evaluateTrade(
      { entryPrice, stopLoss, target, direction: direction as TradeDirection },
      marketState, marketData
    )

    if (!IS_DB_CONFIGURED) {
      const edgeScore = calculateEdgeScore(
        evaluation.permission, evaluation.rrRatio, evaluation.signals, DEFAULT_USER_CONTEXT
      )
      return NextResponse.json({ trade: { id: 'demo', status: 'open' }, evaluation, edgeScore })
    }

    // Check for active trading lock
    const { rows: locks } = await sql`
      SELECT * FROM user_locks
      WHERE user_id = ${userId} AND is_active = true AND unlocks_at > NOW()
      LIMIT 1
    `
    if (locks[0]) {
      return NextResponse.json(
        { error: 'Trading locked', lockedUntil: locks[0].unlocks_at, reason: locks[0].reason },
        { status: 403 }
      )
    }

    // Fetch recent trades for behavior context
    const { rows: recentRaw } = await sql`
      SELECT * FROM trades WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT 20
    `
    const recentTrades: Trade[] = recentRaw.map((t) => ({
      id: t.id, userId: t.user_id, symbol: t.symbol, direction: t.direction,
      entryPrice: t.entry_price, stopLoss: t.stop_loss, target: t.target,
      quantity: t.quantity, pnl: t.pnl, permissionStatus: t.permission_status,
      marketState: t.market_state, status: t.status, rrRatio: t.rr_ratio,
      createdAt: t.created_at, closedAt: t.closed_at,
    }))

    const behavior = analyzeBehavior(recentTrades)
    const today = new Date().toDateString()
    const todayTrades = recentTrades.filter(
      (t) => new Date(t.createdAt).toDateString() === today
    )
    const userCtx = buildUserContext(
      behavior.consecutiveLosses, behavior.tradesToday, behavior.revengeRisk, 2,
      todayTrades.map((t) => ({ permission: t.permissionStatus }))
    )

    const edgeScore = calculateEdgeScore(
      evaluation.permission, evaluation.rrRatio, evaluation.signals, userCtx
    )

    // Insert trade
    const { rows: [trade] } = await sql`
      INSERT INTO trades (
        user_id, symbol, direction, entry_price, stop_loss, target, quantity,
        permission_status, market_state, block_reasons, rr_ratio,
        discipline_score, timing_score, risk_score, consistency_score, edge_score
      ) VALUES (
        ${userId}, ${symbol || 'NIFTY'}, ${direction},
        ${entryPrice}, ${stopLoss}, ${target}, ${quantity || 1},
        ${evaluation.permission}, ${marketState}, ${toTextArray(evaluation.reasons)},
        ${evaluation.rrRatio},
        ${edgeScore.discipline}, ${edgeScore.timing}, ${edgeScore.risk},
        ${edgeScore.consistency}, ${edgeScore.total}
      )
      RETURNING *
    `

    // Log behavior event
    await sql`
      INSERT INTO behavior_logs (user_id, event_type, metadata)
      VALUES (
        ${userId},
        ${evaluation.permission === 'BLOCKED' ? 'trade_blocked' : 'trade_placed'},
        ${JSON.stringify({ tradeId: trade.id, permission: evaluation.permission, edgeScore: edgeScore.total })}
      )
    `

    // Update rolling edge stats
    await upsertEdgeStats(userId)

    // Auto-lock on consecutive losses
    let consecutiveLosses = 0
    for (const t of recentTrades) {
      if (t.pnl !== undefined && t.pnl < 0) consecutiveLosses++
      else break
    }
    if (shouldAutoLock(consecutiveLosses)) {
      await sql`
        INSERT INTO user_locks (user_id, reason, unlocks_at)
        VALUES (${userId}, ${`${consecutiveLosses} consecutive losses`}, ${getLockExpiry()})
      `
    }

    return NextResponse.json({ trade, evaluation, edgeScore })
  } catch (err) {
    console.error('[trade/submit]', err)
    return NextResponse.json({ error: 'Failed to submit trade' }, { status: 500 })
  }
}

async function upsertEdgeStats(userId: string) {
  const { rows: scores } = await sql`
    SELECT edge_score, discipline_score, timing_score, risk_score, consistency_score
    FROM trades WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 10
  `
  if (!scores.length) return

  const mapped = scores.map((r) => ({
    total:       r.edge_score        ?? 100,
    discipline:  r.discipline_score  ?? 100,
    timing:      r.timing_score      ?? 100,
    risk:        r.risk_score        ?? 100,
    consistency: r.consistency_score ?? 100,
  }))

  const avg = computeRollingAvg(mapped)
  if (!avg) return

  await sql`
    INSERT INTO user_edge_stats
      (user_id, avg_edge_score, discipline_avg, timing_avg, risk_avg, consistency_avg, trade_count, updated_at)
    VALUES
      (${userId}, ${avg.avgEdgeScore}, ${avg.disciplineAvg}, ${avg.timingAvg},
       ${avg.riskAvg}, ${avg.consistencyAvg}, ${avg.tradeCount}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      avg_edge_score  = EXCLUDED.avg_edge_score,
      discipline_avg  = EXCLUDED.discipline_avg,
      timing_avg      = EXCLUDED.timing_avg,
      risk_avg        = EXCLUDED.risk_avg,
      consistency_avg = EXCLUDED.consistency_avg,
      trade_count     = EXCLUDED.trade_count,
      updated_at      = NOW()
  `
}
