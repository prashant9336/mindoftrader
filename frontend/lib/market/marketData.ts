import type { MarketData } from '@/types'

const SYMBOL = '%5ENSEI'  // ^NSEI = NIFTY 50

function calcATR(
  highs: number[], lows: number[], closes: number[], period = 14
): [number, number] {
  if (highs.length < 2) {
    const range = (highs[0] ?? 0) - (lows[0] ?? 0)
    return [range || 50, 50]
  }
  const trs = highs.map((h, i) => {
    if (i === 0) return h - lows[i]
    const pc = closes[i - 1]
    return Math.max(h - lows[i], Math.abs(h - pc), Math.abs(lows[i] - pc))
  })
  const recent = trs.slice(-period)
  const prev   = trs.slice(-(period * 2), -period)
  const atr    = recent.reduce((s, v) => s + v, 0) / recent.length
  const pAtr   = prev.length > 0
    ? prev.reduce((s, v) => s + v, 0) / prev.length
    : atr
  return [parseFloat(atr.toFixed(2)), parseFloat(pAtr.toFixed(2))]
}

function calcVWAP(
  highs: number[], lows: number[], closes: number[], volumes: number[]
): number {
  const totalVol = volumes.reduce((s, v) => s + v, 0)
  if (!totalVol) return closes[closes.length - 1] ?? 0
  const tpv = highs.map((h, i) => ((h + lows[i] + closes[i]) / 3) * volumes[i])
  return parseFloat((tpv.reduce((s, v) => s + v, 0) / totalVol).toFixed(2))
}

// In-memory cache (30 s)
let _cache: { data: MarketData; expiresAt: number } | null = null

export async function fetchLiveMarketData(symbol = 'NIFTY'): Promise<MarketData> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.data

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?interval=5m&range=1d&includePrePost=false`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`)

  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error('Yahoo Finance: unexpected response shape')

  const meta    = result.meta
  const quote   = result.indicators?.quote?.[0] ?? {}

  const rawHighs:   number[] = (quote.high   ?? []).filter(Boolean)
  const rawLows:    number[] = (quote.low    ?? []).filter(Boolean)
  const rawCloses:  number[] = (quote.close  ?? []).filter(Boolean)
  const rawVolumes: number[] = (quote.volume ?? []).map((v: number | null) => v ?? 0)

  const price = parseFloat((meta.regularMarketPrice as number).toFixed(2))
  const prevClose = meta.chartPreviousClose as number

  const [atr, prevAtr] = rawHighs.length >= 2
    ? calcATR(rawHighs, rawLows, rawCloses)
    : [parseFloat(((meta.regularMarketDayHigh - meta.regularMarketDayLow) || 100).toFixed(2)), 100]

  const vwap = rawHighs.length > 0
    ? calcVWAP(rawHighs, rawLows, rawCloses, rawVolumes)
    : price

  const avgVol  = rawVolumes.length ? rawVolumes.reduce((s: number, v: number) => s + v, 0) / rawVolumes.length : 1
  const lastVol = rawVolumes[rawVolumes.length - 1] ?? avgVol

  const change        = parseFloat((price - prevClose).toFixed(2))
  const changePercent = parseFloat(((change / prevClose) * 100).toFixed(3))

  const data: MarketData = {
    price,
    vwap,
    atr,
    prevAtr,
    oi:            Math.round(lastVol),
    prevOi:        Math.round(avgVol),
    change,
    changePercent,
    high:          parseFloat((meta.regularMarketDayHigh as number).toFixed(2)),
    low:           parseFloat((meta.regularMarketDayLow  as number).toFixed(2)),
    symbol,
    timestamp:     new Date().toISOString(),
  }

  _cache = { data, expiresAt: Date.now() + 30_000 }
  return data
}
