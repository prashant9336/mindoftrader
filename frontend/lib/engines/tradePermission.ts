import type { TradeInput, TradeEvaluation, TradeSignals, MarketData, MarketState, FVGContext } from '@/types'

export function evaluateTrade(
  input: TradeInput,
  marketState: MarketState,
  marketData: MarketData,
  fvgContext?: FVGContext | null
): TradeEvaluation {
  const reasons: string[] = []
  let blocked = false
  let risky = false

  const { entryPrice, stopLoss, target, direction } = input
  const { price: currentPrice, vwap, atr } = marketData

  // ── R:R Calculation ──────────────────────────────────────────
  const riskAmount   = Math.abs(entryPrice - stopLoss)
  const rewardAmount = Math.abs(target - entryPrice)
  const rrRatio      = riskAmount > 0 ? parseFloat((rewardAmount / riskAmount).toFixed(2)) : 0

  if (rrRatio < 1) {
    blocked = true
    reasons.push(`R:R ratio is ${rrRatio}:1 — minimum required is 1:1`)
  } else if (rrRatio < 1.5) {
    risky = true
    reasons.push(`R:R ratio is ${rrRatio}:1 — below ideal 1.5:1`)
  }

  // ── Direction vs Trend ────────────────────────────────────────
  const isLong         = direction === 'CALL' || direction === 'LONG'
  const isBullishMarket = currentPrice > vwap
  const againstTrend   = marketState === 'TRENDING' && isLong !== isBullishMarket

  if (againstTrend) {
    blocked = true
    reasons.push(
      `Trading ${isLong ? 'LONG' : 'SHORT'} against the ${isBullishMarket ? 'bullish' : 'bearish'} trend`
    )
  }

  // ── Market State Checks ───────────────────────────────────────
  const trapMarket    = marketState === 'TRAP'
  const sidewaysMarket = marketState === 'SIDEWAYS'

  if (trapMarket) {
    blocked = true
    reasons.push('Market in TRAP state — possible fake breakout or stop hunt')
  }

  if (sidewaysMarket) {
    risky = true
    reasons.push('Market is sideways — lower probability directional setup')
  }

  // ── Late Entry Check ──────────────────────────────────────────
  const entryDeviation = Math.abs(entryPrice - currentPrice)
  const lateEntry      = atr > 0 && entryDeviation > atr * 0.8

  if (lateEntry) {
    risky = true
    reasons.push(
      `Entry is ${(entryDeviation / atr).toFixed(1)}x ATR from current price — potential late entry`
    )
  }

  // ── Stop Loss Sanity ──────────────────────────────────────────
  const slTooTight = riskAmount < atr * 0.2
  const slTooWide  = riskAmount > atr * 2

  if (slTooTight) {
    risky = true
    reasons.push('Stop loss is too tight relative to ATR — likely to be stopped out by noise')
  }

  if (slTooWide) {
    risky = true
    reasons.push('Stop loss is very wide — reduces position sizing efficiency')
  }

  // ── ICT FVG Alignment ─────────────────────────────────────────
  let fvgAligned: boolean | undefined = undefined

  if (fvgContext?.signal) {
    const fvgIsLong = fvgContext.signal.direction === 'LONG'
    fvgAligned = isLong === fvgIsLong
    if (fvgAligned) {
      reasons.push(
        `ICT FVG retest confirmed at ${fvgContext.signal.fvgBot}–${fvgContext.signal.fvgTop} — structure supports this direction`
      )
    } else {
      risky = true
      reasons.push(
        `Active ICT FVG signal is ${fvgContext.signal.direction} — your trade is against the structure`
      )
    }
  } else if (fvgContext && !fvgContext.signal) {
    reasons.push('No active FVG retest — trade lacks ICT structure confirmation')
  }

  // ── Good entry heuristic ──────────────────────────────────────
  const goodEntry = !lateEntry && rrRatio >= 1.5 && !blocked && !sidewaysMarket && !trapMarket

  // ── Final Verdict ─────────────────────────────────────────────
  const permission = blocked ? 'BLOCKED' : risky ? 'RISKY' : 'ALLOWED'

  if (permission === 'ALLOWED') {
    reasons.push(`Clean R:R of ${rrRatio}:1`)
    reasons.push(`Direction aligned with ${marketState.toLowerCase()} market`)
    reasons.push('Entry near current price — not a late entry')
  }

  const signals: TradeSignals = {
    lateEntry,
    againstTrend,
    sidewaysMarket,
    trapMarket,
    goodEntry,
    hasSL: true,
    movedSL: false,
    fvgAligned,
  }

  return {
    permission,
    rrRatio,
    reasons,
    marketState,
    marketData,
    riskAmount: parseFloat(riskAmount.toFixed(2)),
    rewardAmount: parseFloat(rewardAmount.toFixed(2)),
    signals,
  }
}
