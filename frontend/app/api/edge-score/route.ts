import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import { calculateEdgeScore, DEFAULT_USER_CONTEXT, computeRollingAvg } from '@/lib/edgeScore'
import { getLevel } from '@/lib/edgeScoreHelpers'
import type { UserEdgeStats, EdgeBreakdown, TradeSignals } from '@/types'

const NEUTRAL_SIGNALS: TradeSignals = {
  lateEntry: false, againstTrend: false, sidewaysMarket: false,
  trapMarket: false, goodEntry: true, hasSL: true, movedSL: false,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  if (!IS_DB_CONFIGURED) {
    const defaultScore = calculateEdgeScore('ALLOWED', 1.5, NEUTRAL_SIGNALS, DEFAULT_USER_CONTEXT)
    return NextResponse.json({ stats: null, latestScore: defaultScore, history: [] })
  }

  const { rows: statsRows } = await sql`
    SELECT * FROM user_edge_stats WHERE user_id = ${userId} LIMIT 1
  `
  const statsRow = statsRows[0] ?? null

  const stats: UserEdgeStats | null = statsRow
    ? {
        userId:         statsRow.user_id,
        avgEdgeScore:   statsRow.avg_edge_score,
        disciplineAvg:  statsRow.discipline_avg,
        timingAvg:      statsRow.timing_avg,
        riskAvg:        statsRow.risk_avg,
        consistencyAvg: statsRow.consistency_avg,
        tradeCount:     statsRow.trade_count,
        updatedAt:      statsRow.updated_at,
      }
    : null

  const { rows: trades } = await sql`
    SELECT id, edge_score, discipline_score, timing_score, risk_score, consistency_score,
           created_at, permission_status, market_state
    FROM trades
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 10
  `

  const history = trades.map((t) => ({
    id:          t.id,
    edgeScore:   t.edge_score        ?? 100,
    discipline:  t.discipline_score  ?? 100,
    timing:      t.timing_score      ?? 100,
    risk:        t.risk_score        ?? 100,
    consistency: t.consistency_score ?? 100,
    permission:  t.permission_status,
    marketState: t.market_state,
    createdAt:   t.created_at,
  }))

  let latestScore: EdgeBreakdown | null = null
  if (history.length > 0) {
    const t = history[0]
    latestScore = {
      discipline:  t.discipline,
      timing:      t.timing,
      risk:        t.risk,
      consistency: t.consistency,
      total:       t.edgeScore,
      level:       getLevel(t.edgeScore),
      penalties:   [],
    }
  }

  let resolvedStats = stats
  if (!resolvedStats && history.length > 0) {
    const avg = computeRollingAvg(
      history.map((h) => ({
        total: h.edgeScore, discipline: h.discipline,
        timing: h.timing, risk: h.risk, consistency: h.consistency,
      }))
    )
    if (avg) {
      resolvedStats = {
        userId,
        avgEdgeScore:   avg.avgEdgeScore,
        disciplineAvg:  avg.disciplineAvg,
        timingAvg:      avg.timingAvg,
        riskAvg:        avg.riskAvg,
        consistencyAvg: avg.consistencyAvg,
        tradeCount:     avg.tradeCount,
        updatedAt:      new Date().toISOString(),
      }
    }
  }

  return NextResponse.json({ stats: resolvedStats, latestScore, history })
}
