import type { MarketData, Candle } from '@/types'

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

// ── Multi-TF candle fetching ──────────────────────────────────

const _candleCaches = new Map<string, { data: Candle[]; expiresAt: number }>()

async function fetchCandles(interval: string, range: string): Promise<Candle[]> {
  const key = `${interval}_${range}`
  const cached = _candleCaches.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?interval=${interval}&range=${range}&includePrePost=false`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Yahoo Finance [${interval}]: ${res.status}`)

  const json   = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error('Yahoo Finance: unexpected response shape')

  const timestamps: number[] = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0] ?? {}

  const candles: Candle[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const h = quote.high?.[i]
    const l = quote.low?.[i]
    const o = quote.open?.[i]
    const c = quote.close?.[i]
    const v = quote.volume?.[i] ?? 0
    if (h != null && l != null && o != null && c != null) {
      candles.push({ high: h, low: l, open: o, close: c, volume: v, timestamp: timestamps[i] })
    }
  }

  const ttl = interval === '5m' ? 30_000 : interval === '15m' ? 60_000 : 300_000
  _candleCaches.set(key, { data: candles, expiresAt: Date.now() + ttl })
  return candles
}

export async function fetchMultiTFCandles(): Promise<{
  candles5m: Candle[]
  candles15m: Candle[]
  candlesHTF: Candle[]
}> {
  const [candles5m, candles15m, candlesHTF] = await Promise.all([
    fetchCandles('5m', '1d'),
    fetchCandles('15m', '1d'),
    fetchCandles('60m', '1d'),
  ])
  return { candles5m, candles15m, candlesHTF }
}

// ── In-memory cache (30 s) ────────────────────────────────────
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
