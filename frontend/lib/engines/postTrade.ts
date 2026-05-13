import type { Trade, PostTradeAnalysis, MarketState } from '@/types'

interface PostTradeInput {
  trade: Trade
  marketStateAtEntry: MarketState
  atrAtEntry: number
  vwapAtEntry: number
  currentPrice?: number
}

export function analyzePostTrade(input: PostTradeInput): PostTradeAnalysis {
  const { trade, marketStateAtEntry, atrAtEntry, vwapAtEntry } = input
  const mistakes: string[] = []
  const improvementTips: string[] = []
  let score = 100

  // ── Was trade aligned with rules? ─────────────────────────
  const wasAligned = trade.permissionStatus !== 'BLOCKED'
  if (!wasAligned) {
    mistakes.push('Took a BLOCKED trade — violated system rules')
    improvementTips.push('Trust the system: if the engine blocks a trade, do not override it')
    score -= 40
  } else if (trade.permissionStatus === 'RISKY') {
    score -= 10
    improvementTips.push('RISKY trades should have extra confirmation before entry')
  }

  // ── Was entry late? ────────────────────────────────────────
  const entryDeviation = Math.abs(trade.entryPrice - vwapAtEntry)
  const wasLateEntry = atrAtEntry > 0 && entryDeviation > atrAtEntry
  if (wasLateEntry) {
    mistakes.push('Entry was late — price had already moved > 1 ATR')
    improvementTips.push('Wait for pullbacks to VWAP or key levels instead of chasing')
    score -= 20
  }

  // ── Was stop loss logical? ────────────────────────────────
  const slDistance = Math.abs(trade.entryPrice - trade.stopLoss)
  const wasSlLogical = slDistance >= atrAtEntry * 0.2 && slDistance <= atrAtEntry * 2.5
  if (!wasSlLogical) {
    if (slDistance < atrAtEntry * 0.2) {
      mistakes.push('Stop loss was too tight — placed inside normal market noise')
      improvementTips.push('Set stop loss at minimum 0.25x ATR from entry to avoid premature stops')
    } else {
      mistakes.push('Stop loss was too wide — reduced capital efficiency')
      improvementTips.push('Keep stop loss within 2x ATR for optimal position sizing')
    }
    score -= 15
  }

  // ── Market state alignment ────────────────────────────────
  if (marketStateAtEntry === 'TRAP') {
    mistakes.push('Traded during a TRAP market condition')
    improvementTips.push('Avoid trading during TRAP conditions — wait for market to clarify')
    score -= 25
  }

  if (marketStateAtEntry === 'SIDEWAYS' && trade.pnl !== undefined && trade.pnl < 0) {
    improvementTips.push('Sideways markets are difficult — focus on range extremes only')
  }

  // ── P&L outcome tips ──────────────────────────────────────
  if (trade.pnl !== undefined) {
    if (trade.pnl > 0) {
      improvementTips.push('Good outcome — review what made this trade work and repeat it')
    } else {
      improvementTips.push('Review whether you had valid reasons to enter at the time')
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  return {
    tradeId: trade.id,
    wasAligned,
    wasLateEntry,
    wasSlLogical,
    mistakes,
    improvementTips,
    score,
  }
}
