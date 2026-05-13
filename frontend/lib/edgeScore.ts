/**
 * Edge Score Engine — pure, side-effect-free.
 * Evaluates trader decision quality per trade.
 * Score is NOT based on profit; it reflects process quality.
 */

import type { TradeSignals, EdgeBreakdown, TradePermission } from '@/types'
import { getLevel } from '@/lib/edgeScoreHelpers'

export { getLevel }

// ── User context ───────────────────────────────────────────────
export interface UserContext {
  consecutiveLosses: number
  overtrading: boolean   // > 3 trades today
  revengeTrade: boolean
  exceededLimit: boolean // daily trade limit hit
  perfectDay: boolean    // no violations + all trades ALLOWED
}

export const DEFAULT_USER_CONTEXT: UserContext = {
  consecutiveLosses: 0,
  overtrading: false,
  revengeTrade: false,
  exceededLimit: false,
  perfectDay: false,
}

// ── Helpers ────────────────────────────────────────────────────
function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ── Core function ──────────────────────────────────────────────

export function calculateEdgeScore(
  permission: TradePermission,
  rr: number,
  signals: TradeSignals,
  ctx: UserContext = DEFAULT_USER_CONTEXT
): EdgeBreakdown {
  const penalties: string[] = []

  // ── DISCIPLINE (base: 100) ────────────────────────────────
  let discipline = 100

  if (permission === 'BLOCKED') {
    discipline -= 30
    penalties.push('Blocked trade taken: −30 discipline')
  } else if (permission === 'RISKY') {
    discipline -= 15
    penalties.push('Risky trade: −15 discipline')
  }
  if (ctx.exceededLimit) {
    discipline -= 20
    penalties.push('Daily trade limit exceeded: −20 discipline')
  }
  if (ctx.revengeTrade) {
    discipline -= 25
    penalties.push('Revenge trade pattern: −25 discipline')
  }
  discipline = clamp(discipline)

  // ── TIMING (base: 50 — must earn good score) ──────────────
  let timing = 50

  if (signals.lateEntry) {
    timing -= 20
    penalties.push('Late entry: −20 timing')
  }
  if (signals.againstTrend) {
    timing -= 25
    penalties.push('Against trend: −25 timing')
  }
  if (signals.sidewaysMarket) {
    timing -= 15
    penalties.push('Sideways market: −15 timing')
  }
  if (signals.goodEntry) {
    timing += 10
  }
  if (signals.fvgAligned === true) {
    timing += 15
  }
  if (signals.fvgAligned === false) {
    timing -= 15
    penalties.push('Against ICT FVG structure: −15 timing')
  }
  timing = clamp(timing)

  // ── RISK CONTROL (base: 100) ──────────────────────────────
  let risk = 100

  if (rr < 1) {
    risk -= 30
    penalties.push('R:R below 1:1: −30 risk control')
  } else if (rr >= 1.5) {
    risk = clamp(risk + 10) // bonus — strong R:R
  }
  if (!signals.hasSL) {
    risk -= 40
    penalties.push('No stop loss: −40 risk control')
  }
  if (signals.movedSL) {
    risk -= 25
    penalties.push('Stop loss moved during trade: −25 risk control')
  }
  risk = clamp(risk)

  // ── CONSISTENCY (base: 100) ───────────────────────────────
  let consistency = 100

  if (ctx.consecutiveLosses >= 2) {
    consistency -= 20
    penalties.push(`${ctx.consecutiveLosses} consecutive losses: −20 consistency`)
  }
  if (ctx.overtrading) {
    consistency -= 15
    penalties.push('Overtrading today: −15 consistency')
  }
  if (ctx.revengeTrade && ctx.overtrading) {
    consistency -= 10
    penalties.push('Irregular pattern (revenge + overtrading): −10 consistency')
  }
  if (ctx.perfectDay) {
    consistency = clamp(consistency + 10)
  }
  consistency = clamp(consistency)

  // ── WEIGHTED TOTAL ────────────────────────────────────────
  const total = clamp(
    discipline   * 0.35 +
    timing       * 0.25 +
    risk         * 0.25 +
    consistency  * 0.15
  )

  return {
    discipline,
    timing,
    risk,
    consistency,
    total,
    level: getLevel(total),
    penalties,
  }
}

// ── Derive user context from behavior data ─────────────────────
export function buildUserContext(
  consecutiveLosses: number,
  tradesToday: number,
  revengeRisk: boolean,
  tradeLimit = 2,
  allTradesToday: { permission: string }[] = []
): UserContext {
  const exceededLimit = tradesToday > tradeLimit
  const overtrading   = tradesToday > 3
  const perfectDay    =
    tradesToday > 0 &&
    !revengeRisk &&
    consecutiveLosses === 0 &&
    allTradesToday.every((t) => t.permission === 'ALLOWED')

  return {
    consecutiveLosses,
    overtrading,
    revengeTrade: revengeRisk,
    exceededLimit,
    perfectDay,
  }
}

// ── Rolling average helper ────────────────────────────────────
export function computeRollingAvg(
  scores: { discipline: number; timing: number; risk: number; consistency: number; total: number }[],
  window = 10
) {
  const recent = scores.slice(-window)
  if (recent.length === 0) return null

  const avg = (key: keyof typeof recent[0]) =>
    Math.round(recent.reduce((s, t) => s + t[key], 0) / recent.length)

  return {
    avgEdgeScore:   avg('total'),
    disciplineAvg:  avg('discipline'),
    timingAvg:      avg('timing'),
    riskAvg:        avg('risk'),
    consistencyAvg: avg('consistency'),
    tradeCount:     recent.length,
  }
}
