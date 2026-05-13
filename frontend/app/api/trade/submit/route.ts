import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase, IS_ADMIN_CONFIGURED } from '@/lib/supabaseAdmin'
import { generateMockMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'
import { evaluateTrade } from '@/lib/engines/tradePermission'
import { shouldAutoLock, getLockExpiry, analyzeBehavior } from '@/lib/engines/behaviorEngine'
import {
  calculateEdgeScore,
  buildUserContext,
  computeRollingAvg,
  DEFAULT_USER_CONTEXT,
} from '@/lib/edgeScore'
import type { TradeDirection, Trade } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, entryPrice, stopLoss, target, direction, symbol, quantity } = body

    if (!userId || !entryPrice || !stopLoss || !target || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get market state and evaluate trade
    const marketData = generateMockMarketData(symbol || 'NIFTY')
    const { state: marketState } = evaluateMarketState(marketData)
    const evaluation = evaluateTrade(
      { entryPrice, stopLoss, target, direction: direction as TradeDirection },
      marketState,
      marketData
    )

    // ── No Supabase — demo mode ─────────────────────────────────
    if (!IS_ADMIN_CONFIGURED) {
      const edgeScore = calculateEdgeScore(
        evaluation.permission,
        evaluation.rrRatio,
        evaluation.signals,
        DEFAULT_USER_CONTEXT
      )
      return NextResponse.json({ trade: { id: 'demo', status: 'open' }, evaluation, edgeScore })
    }

    // ── Check if user is locked ────────────────────────────────
    const { data: lock } = await supabase
      .from('user_locks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('unlocks_at', new Date().toISOString())
      .single()

    if (lock) {
      return NextResponse.json(
        { error: 'Trading locked', lockedUntil: lock.unlocks_at, reason: lock.reason },
        { status: 403 }
      )
    }

    // ── Fetch behavior context ─────────────────────────────────
    const { data: recentRaw } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const recentTrades: Trade[] = (recentRaw || []).map((t) => ({
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
      behavior.consecutiveLosses,
      behavior.tradesToday,
      behavior.revengeRisk,
      2,
      todayTrades.map((t) => ({ permission: t.permissionStatus }))
    )

    // ── Calculate edge score with full context ─────────────────
    const edgeScore = calculateEdgeScore(
      evaluation.permission,
      evaluation.rrRatio,
      evaluation.signals,
      userCtx
    )

    // ── Insert trade with scores ───────────────────────────────
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        user_id:            userId,
        symbol:             symbol || 'NIFTY',
        direction,
        entry_price:        entryPrice,
        stop_loss:          stopLoss,
        target,
        quantity:           quantity || 1,
        permission_status:  evaluation.permission,
        market_state:       marketState,
        block_reasons:      evaluation.reasons,
        rr_ratio:           evaluation.rrRatio,
        discipline_score:   edgeScore.discipline,
        timing_score:       edgeScore.timing,
        risk_score:         edgeScore.risk,
        consistency_score:  edgeScore.consistency,
        edge_score:         edgeScore.total,
      })
      .select()
      .single()

    if (error) throw error

    // ── Log behavior event ─────────────────────────────────────
    await supabase.from('behavior_logs').insert({
      user_id:    userId,
      event_type: evaluation.permission === 'BLOCKED' ? 'trade_blocked' : 'trade_placed',
      metadata:   { tradeId: trade.id, permission: evaluation.permission, edgeScore: edgeScore.total },
    })

    // ── Update rolling edge stats ──────────────────────────────
    await upsertEdgeStats(userId)

    // ── Auto-lock on consecutive losses ───────────────────────
    let consecutiveLosses = 0
    for (const t of recentTrades) {
      if (t.pnl !== undefined && t.pnl < 0) consecutiveLosses++
      else break
    }
    if (shouldAutoLock(consecutiveLosses)) {
      await supabase.from('user_locks').insert({
        user_id:    userId,
        reason:     `${consecutiveLosses} consecutive losses`,
        unlocks_at: getLockExpiry(),
      })
    }

    return NextResponse.json({ trade, evaluation, edgeScore })
  } catch (err) {
    console.error('[trade/submit]', err)
    return NextResponse.json({ error: 'Failed to submit trade' }, { status: 500 })
  }
}

// ── Rolling average upsert ──────────────────────────────────────
async function upsertEdgeStats(userId: string) {
  const { data: scores } = await supabase
    .from('trades')
    .select('edge_score, discipline_score, timing_score, risk_score, consistency_score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!scores || scores.length === 0) return

  const mapped = scores.map((r) => ({
    total:        r.edge_score        ?? 100,
    discipline:   r.discipline_score  ?? 100,
    timing:       r.timing_score      ?? 100,
    risk:         r.risk_score        ?? 100,
    consistency:  r.consistency_score ?? 100,
  }))

  const avg = computeRollingAvg(mapped)
  if (!avg) return

  await supabase.from('user_edge_stats').upsert({
    user_id:         userId,
    avg_edge_score:  avg.avgEdgeScore,
    discipline_avg:  avg.disciplineAvg,
    timing_avg:      avg.timingAvg,
    risk_avg:        avg.riskAvg,
    consistency_avg: avg.consistencyAvg,
    trade_count:     avg.tradeCount,
    updated_at:      new Date().toISOString(),
  })
}
