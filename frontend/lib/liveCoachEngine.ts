/**
 * Live Coach Engine — generates up to 3 prioritized coaching messages
 * from an edge score breakdown. Pure function, no side effects.
 */

import type { CoachMessage, EdgeBreakdown, TradePermission, TradeSignals } from '@/types'
import type { UserContext } from '@/lib/edgeScore'

export interface TradeContext {
  permission: TradePermission
  rrRatio: number
  signals: TradeSignals
}

type Priority = 1 | 2 | 3 | 4  // 4 = forced system verdict

interface ScoredMessage {
  msg: CoachMessage
  priority: Priority
}

function makeId(): string {
  return `coach_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function make(
  type: CoachMessage['type'],
  message: string,
  priority: Priority
): ScoredMessage {
  return {
    msg: { id: makeId(), type, message, timestamp: new Date().toISOString(), source: 'trade_eval' },
    priority,
  }
}

// ── System verdict (always first) ─────────────────────────────
function buildVerdict(score: EdgeBreakdown, trade: TradeContext): ScoredMessage {
  const { total, level, discipline, timing, risk, consistency } = score

  const sorted = [
    { name: 'discipline', value: discipline },
    { name: 'timing',     value: timing },
    { name: 'risk',       value: risk },
    { name: 'consistency', value: consistency },
  ].sort((a, b) => a.value - b.value)

  const w1 = sorted[0]
  const w2 = sorted[1]

  if (total >= 80) {
    return make('success', `Edge Score ${total} — ${level}. Process is sound. Execute the plan, let the market resolve.`, 4)
  }
  if (total >= 60) {
    return make('info', `Edge Score ${total} — ${level}. Acceptable process. Primary weakness: ${w1.name} (${w1.value}). Address it before the next setup.`, 4)
  }
  if (total >= 40) {
    return make('warning', `Edge Score ${total} — ${level}. Weak ${w1.name} (${w1.value}) and ${w2.name} (${w2.value}) are dragging the score. Fix the process before increasing size.`, 4)
  }
  return make('alert', `Edge Score ${total} — ${level}. Multiple violations. ${w1.name.toUpperCase()} at ${w1.value}. This pattern will erode your account. Stop and audit.`, 4)
}

// ── Discipline messages ────────────────────────────────────────
function disciplineMessages(score: EdgeBreakdown, trade: TradeContext): ScoredMessage[] {
  if (trade.permission === 'BLOCKED') {
    return [make('alert', 'Blocked trade overridden. The system said no and you proceeded. Every breach makes discipline weaker. This is the habit that ends accounts.', 3)]
  }
  if (trade.permission === 'RISKY' && score.discipline < 70) {
    return [make('warning', 'Marginal zone entry. Partial compliance is still a compromise. Ask: would you take this setup 100 times with full conviction?', 2)]
  }
  if (score.discipline >= 90) {
    return [make('success', 'Full rule compliance. Discipline held — that is the real edge, not the trade outcome.', 1)]
  }
  return []
}

// ── Timing messages ────────────────────────────────────────────
function timingMessages(score: EdgeBreakdown, trade: TradeContext): ScoredMessage[] {
  const { signals } = trade

  if (signals.lateEntry && signals.againstTrend) {
    return [make('alert', 'Late entry against the trend. Both timing errors combined. Lowest-probability setup possible. Position size should reflect that.', 3)]
  }
  if (signals.lateEntry) {
    return [make('warning', 'Late entry. Price has already extended. Wait for the next pullback — chasing is how you buy the top and sell the bottom.', 2)]
  }
  if (signals.againstTrend) {
    return [make('warning', 'Counter-trend entry. The trend is the highest-probability filter available. Fighting it has a cost that compounds.', 2)]
  }
  if (signals.trapMarket) {
    return [make('alert', 'Trap market condition. Smart money is hunting stops. Your entry is the target, not the winner.', 3)]
  }
  if (signals.goodEntry && score.timing >= 60) {
    return [make('info', 'Clean entry with trend structure confirmed. Timing validated — honor the stop and let it run.', 1)]
  }
  return []
}

// ── Risk messages ──────────────────────────────────────────────
function riskMessages(score: EdgeBreakdown, trade: TradeContext): ScoredMessage[] {
  if (!trade.signals.hasSL) {
    return [make('alert', 'No stop loss. This is not a trade — it is uncontrolled exposure. Every trade without a defined exit is capital destruction in slow motion.', 3)]
  }
  if (trade.rrRatio < 1) {
    return [make('warning', `R:R at 1:${trade.rrRatio} is sub-threshold. You are risking more than you stand to gain. The math does not work over any meaningful sample size.`, 2)]
  }
  if (trade.rrRatio >= 2) {
    return [make('success', `R:R of 1:${trade.rrRatio} is strong. Even at a 40% win rate this setup is mathematically positive. Let it play.`, 1)]
  }
  return []
}

// ── Consistency messages ───────────────────────────────────────
function consistencyMessages(score: EdgeBreakdown, ctx: UserContext): ScoredMessage[] {
  if (ctx.revengeTrade && ctx.overtrading) {
    return [make('alert', 'Revenge trading and overtrading simultaneously. You are in an emotional spiral. Close the terminal. Come back with a clear head.', 3)]
  }
  if (ctx.revengeTrade) {
    return [make('alert', 'Revenge trade detected. This is emotionally driven execution. Urgency to recover losses destroys accounts faster than any bad setup.', 3)]
  }
  if (ctx.consecutiveLosses >= 2) {
    return [make('warning', `${ctx.consecutiveLosses} consecutive losses. Audit: is this market conditions or execution error? Do not add size to a losing streak.`, 2)]
  }
  if (ctx.overtrading) {
    return [make('warning', 'High trade frequency today. More trades does not mean more profit — quality degrades with volume. Be selective.', 2)]
  }
  if (ctx.perfectDay) {
    return [make('success', 'Perfect process day — all trades rule-aligned. Consistency compounds. Protect this streak.', 1)]
  }
  return []
}

// ── Main export ────────────────────────────────────────────────
export function generateCoachMessages(
  score: EdgeBreakdown,
  trade: TradeContext,
  ctx: UserContext
): CoachMessage[] {
  const verdict = buildVerdict(score, trade)

  const candidates: ScoredMessage[] = [
    ...disciplineMessages(score, trade),
    ...timingMessages(score, trade),
    ...riskMessages(score, trade),
    ...consistencyMessages(score, ctx),
  ]

  // Highest priority first, take top 2 to fill remaining slots after verdict
  candidates.sort((a, b) => b.priority - a.priority)
  return [verdict.msg, ...candidates.slice(0, 2).map((c) => c.msg)]
}
