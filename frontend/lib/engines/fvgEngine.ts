/**
 * ICT Fair Value Gap (FVG) Engine
 * Ports the Pine Script indicator logic to server-side TypeScript.
 * Pure functions — no side effects, no imports from Next.js.
 *
 * Key parameters match the Pine Script defaults:
 *   rr           = 1.0   (Risk:Reward)
 *   minBodyFrac  = 0.30  (min body/range for candle quality)
 *   optDelta     = 0.50  (approx option delta for CE/PE target)
 */

import type { Candle, FVGZone, FVGSignal, FVGContext, FVGTrendState } from '@/types'

// ── Session helpers ────────────────────────────────────────────

function isInISTSession(): boolean {
  const now = new Date()
  // IST = UTC + 5h30m = 330 min offset
  const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330
  const dayMinutes = istMinutes % (24 * 60)
  const openMin  = 9  * 60 + 20  // 09:20 IST
  const closeMin = 14 * 60 + 45  // 14:45 IST
  return dayMinutes >= openMin && dayMinutes <= closeMin
}

// ── VWAP calculation (session-anchored) ───────────────────────

function calcVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0
  let totalVol = 0
  let tpv = 0
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3
    tpv += tp * c.volume
    totalVol += c.volume
  }
  if (!totalVol) return candles[candles.length - 1].close
  return parseFloat((tpv / totalVol).toFixed(2))
}

// ── FVG detection (ICT 3-bar pattern) ─────────────────────────
// Pine: bullFVG = low[1] > high[2]  → gap up between bar[2] and bar[1]
//       bearFVG = high[1] < low[2]  → gap down between bar[2] and bar[1]

function detectFVGs(candles: Candle[]): FVGZone[] {
  const zones: FVGZone[] = []
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2]  // 2 bars ago (Pine: [2])
    const c1 = candles[i - 1]  // 1 bar ago  (Pine: [1])

    // Bull FVG: gap up → zone is [c0.high, c1.low]
    if (c1.low > c0.high) {
      zones.push({ top: c1.low, bot: c0.high, dir: 1 })
    }
    // Bear FVG: gap down → zone is [c1.high, c0.low]
    if (c1.high < c0.low) {
      zones.push({ top: c0.low, bot: c1.high, dir: -1 })
    }
  }
  return zones
}

// ── Main export ────────────────────────────────────────────────

export interface FVGEngineOptions {
  rr?:          number  // risk:reward multiplier (default 1.0)
  minBodyFrac?: number  // candle quality filter (default 0.30)
  optDelta?:    number  // approx option delta (default 0.50)
}

export function analyzeFVG(
  candles5m:  Candle[],
  candles15m: Candle[],
  candlesHTF: Candle[],
  opts: FVGEngineOptions = {}
): FVGContext {
  const rr         = opts.rr          ?? 1.0
  const minBodyFrac = opts.minBodyFrac ?? 0.30
  const optDelta   = opts.optDelta    ?? 0.50

  const inSession = isInISTSession()

  // ── VWAPs ────────────────────────────────────────────────────
  const vwap5m  = candles5m.length  > 0 ? calcVWAP(candles5m)  : 0
  const vwap15m = candles15m.length > 0 ? calcVWAP(candles15m) : vwap5m
  const vwapHTF = candlesHTF.length > 0 ? calcVWAP(candlesHTF) : vwap5m

  if (candles5m.length < 3) {
    return {
      trendState: 'neutral', inSession, vwap5m, vwap15m, vwapHTF,
      above5mVwap: false, above15mVwap: false, aboveHTFVwap: false,
      fvgZoneCount: 0, signal: null,
    }
  }

  // ── Trend analysis ───────────────────────────────────────────
  const current    = candles5m[candles5m.length - 1]
  const close5m    = current.close
  const close15m   = candles15m.length > 0 ? candles15m[candles15m.length - 1].close : close5m

  const above5mVwap  = close5m  > vwap5m
  const above15mVwap = close15m > vwap15m
  const aboveHTFVwap = close5m  > vwapHTF

  const trendBull = above5mVwap && aboveHTFVwap
  const trendBear = !above5mVwap && !aboveHTFVwap

  const trendState: FVGTrendState =
    above15mVwap && trendBull  ? 'strong_bull' :
    !above15mVwap && trendBear ? 'strong_bear' :
    trendBull || above15mVwap  ? 'weak_bull'   :
    trendBear || !above15mVwap ? 'weak_bear'   : 'neutral'

  // ── FVG detection ─────────────────────────────────────────────
  const zones       = detectFVGs(candles5m)
  const fvgZoneCount = zones.length

  // ── Retest + candle quality check on current bar ──────────────
  const { high, low, open, close } = current
  const rng    = high - low
  const body   = Math.abs(close - open)
  const bodyOk = rng > 0 && body / rng >= minBodyFrac

  let activeZone: FVGZone | null = null
  let direction: 'LONG' | 'SHORT' | null = null

  // Scan all detected FVGs for a valid retest — last match wins (like Pine)
  for (const zone of zones) {
    const inZone = high >= zone.bot && low <= zone.top
    if (!inZone || !bodyOk) continue
    const mid = (zone.top + zone.bot) / 2

    if (zone.dir === 1 && close > open && close > mid) {
      activeZone = zone
      direction  = 'LONG'
    }
    if (zone.dir === -1 && close < open && close < mid) {
      activeZone = zone
      direction  = 'SHORT'
    }
  }

  // ── Apply trend + session filters ─────────────────────────────
  const longValid  = direction === 'LONG'  && trendBull  && above15mVwap && inSession
  const shortValid = direction === 'SHORT' && trendBear  && !above15mVwap && inSession

  if ((!longValid && !shortValid) || !activeZone || !direction) {
    return {
      trendState, inSession, vwap5m, vwap15m, vwapHTF,
      above5mVwap, above15mVwap, aboveHTFVwap,
      fvgZoneCount, signal: null,
    }
  }

  // ── Entry / SL / TP calculation ───────────────────────────────
  const entry = close
  let stopLoss: number
  let target: number

  if (direction === 'LONG') {
    stopLoss = activeZone.bot
    const risk = Math.max(entry - stopLoss, symInfo.mintick)
    target = entry + risk * rr
  } else {
    stopLoss = activeZone.top
    const risk = Math.max(stopLoss - entry, symInfo.mintick)
    target = entry - risk * rr
  }

  const riskAmt    = Math.abs(entry - stopLoss)
  const rewardAmt  = Math.abs(target - entry)
  const rrRatio    = riskAmt > 0 ? parseFloat((rewardAmt / riskAmt).toFixed(2)) : rr
  const optionTarget = parseFloat((riskAmt * optDelta).toFixed(2))

  const signal: FVGSignal = {
    direction,
    entry:        parseFloat(entry.toFixed(2)),
    stopLoss:     parseFloat(stopLoss.toFixed(2)),
    target:       parseFloat(target.toFixed(2)),
    rrRatio,
    fvgTop:       parseFloat(activeZone.top.toFixed(2)),
    fvgBot:       parseFloat(activeZone.bot.toFixed(2)),
    optionTarget,
  }

  return {
    trendState, inSession, vwap5m, vwap15m, vwapHTF,
    above5mVwap, above15mVwap, aboveHTFVwap,
    fvgZoneCount, signal,
  }
}

// Minimum tick size for NIFTY options
const symInfo = { mintick: 0.05 }
