import type { BehaviorStatus, Trade } from '@/types'

const LOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const RAPID_TRADE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RAPID_TRADE_LIMIT = 3
const REVENGE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes after a loss

export function analyzeBehavior(
  recentTrades: Trade[],
  activeLockUntil?: string
): BehaviorStatus {
  const now = Date.now()
  const warnings: string[] = []

  // ── Lock Status ───────────────────────────────────────────
  const isLocked = activeLockUntil ? new Date(activeLockUntil).getTime() > now : false

  // ── Trades Today ──────────────────────────────────────────
  const today = new Date().toDateString()
  const tradesToday = recentTrades.filter(
    (t) => new Date(t.createdAt).toDateString() === today
  ).length

  // ── Consecutive Losses ────────────────────────────────────
  let consecutiveLosses = 0
  for (const trade of [...recentTrades].reverse()) {
    if (trade.pnl !== undefined && trade.pnl < 0) {
      consecutiveLosses++
    } else {
      break
    }
  }

  // ── Rapid Trading Check ───────────────────────────────────
  const oneHourAgo = now - RAPID_TRADE_WINDOW_MS
  const tradesInLastHour = recentTrades.filter(
    (t) => new Date(t.createdAt).getTime() > oneHourAgo
  ).length

  if (tradesInLastHour >= RAPID_TRADE_LIMIT) {
    warnings.push(`${tradesInLastHour} trades in the last hour — slow down`)
  }

  // ── Revenge Pattern Detection ─────────────────────────────
  let revengeRisk = false
  const lastTrade = recentTrades[recentTrades.length - 1]
  if (lastTrade?.pnl !== undefined && lastTrade.pnl < 0) {
    const timeSinceLoss = now - new Date(lastTrade.closedAt || lastTrade.createdAt).getTime()
    if (timeSinceLoss < REVENGE_WINDOW_MS) {
      revengeRisk = true
      warnings.push('Loss detected recently — high risk of revenge trading')
    }
  }

  // ── Consecutive Loss Warning ──────────────────────────────
  if (consecutiveLosses >= 2) {
    warnings.push(`${consecutiveLosses} consecutive losses — trading lock applied for 30 minutes`)
  } else if (consecutiveLosses === 1) {
    warnings.push('1 loss — take a breath before next trade')
  }

  return {
    tradesToday,
    consecutiveLosses,
    isLocked,
    lockReason: isLocked ? 'Consecutive losses triggered automatic lock' : undefined,
    lockedUntil: activeLockUntil,
    lastTradeAt: lastTrade?.createdAt,
    revengeRisk,
    warningMessages: warnings,
  }
}

export function shouldAutoLock(consecutiveLosses: number): boolean {
  return consecutiveLosses >= 2
}

export function getLockExpiry(): string {
  return new Date(Date.now() + LOCK_DURATION_MS).toISOString()
}
