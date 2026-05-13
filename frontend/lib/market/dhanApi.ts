import type { MarketData } from '@/types'

const BASE         = 'https://api.dhan.co/v2'
const SECURITY_ID  = '13'       // NIFTY 50 index
const SEGMENT      = 'IDX_I'    // Index segment

export const IS_DHAN_CONFIGURED =
  !!process.env.DHAN_ACCESS_TOKEN && !!process.env.DHAN_CLIENT_ID

function authHeaders() {
  return {
    'access-token': process.env.DHAN_ACCESS_TOKEN || '',
    'client-id':    process.env.DHAN_CLIENT_ID    || '',
    'Content-Type': 'application/json',
  }
}

// ── Internal fetchers ──────────────────────────────────────────

async function fetchQuote() {
  const res = await fetch(`${BASE}/marketfeed/quote`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ [SEGMENT]: [SECURITY_ID] }),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`Dhan quote ${res.status}`)
  const json = await res.json()
  const q = json.data?.[SEGMENT]?.[SECURITY_ID]
  if (!q) throw new Error('Dhan quote: unexpected response shape')
  return q
}

async function fetchCandles(fromDate: string, toDate: string) {
  const res = await fetch(`${BASE}/charts/intraday`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({
      securityId:      SECURITY_ID,
      exchangeSegment: SEGMENT,
      instrument:      'INDEX',
      interval:        '5',
      fromDate,
      toDate,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Dhan candles ${res.status}`)
  return res.json()
}

// ── Helpers ────────────────────────────────────────────────────

function todayIST(): string {
  // IST = UTC+5:30; get today's date in IST
  const now    = new Date()
  const offset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + offset).toISOString().split('T')[0]
}

function yesterdayIST(): string {
  const now    = new Date()
  const offset = 5.5 * 60 * 60 * 1000
  const ist    = new Date(now.getTime() + offset - 86_400_000)
  return ist.toISOString().split('T')[0]
}

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

// ── In-memory cache (30 s) ─────────────────────────────────────

let _cache: { data: MarketData; expiresAt: number } | null = null

// ── Main export ────────────────────────────────────────────────

export async function fetchMarketData(symbol = 'NIFTY'): Promise<MarketData> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.data

  const [quote, candles] = await Promise.all([
    fetchQuote(),
    fetchCandles(todayIST(), todayIST()).catch(() =>
      // Fallback to yesterday if no intraday data yet (pre-market / holiday)
      fetchCandles(yesterdayIST(), yesterdayIST())
    ),
  ])

  const highs:   number[] = candles.high   ?? []
  const lows:    number[] = candles.low    ?? []
  const closes:  number[] = candles.close  ?? []
  const volumes: number[] = candles.volume ?? []

  const [atr, prevAtr] = highs.length >= 2
    ? calcATR(highs, lows, closes)
    : [parseFloat((quote.high - quote.low).toFixed(2)), 50]

  const vwap = highs.length > 0
    ? calcVWAP(highs, lows, closes, volumes)
    : parseFloat(quote.average_price?.toFixed(2) ?? quote.last_price.toFixed(2))

  // Volume momentum as OI proxy for TRAP detection:
  // oi = last candle volume, prevOi = session average volume
  // A price spike (ATR expansion) + volume dropping below average = potential trap
  const avgVol  = volumes.length ? volumes.reduce((s, v) => s + v, 0) / volumes.length : 1
  const lastVol = volumes[volumes.length - 1] ?? avgVol

  const data: MarketData = {
    price:         parseFloat(quote.last_price.toFixed(2)),
    vwap,
    atr,
    prevAtr,
    oi:            Math.round(lastVol),
    prevOi:        Math.round(avgVol),
    change:        parseFloat(quote.change.toFixed(2)),
    changePercent: parseFloat(quote.change_percentage.toFixed(3)),
    high:          parseFloat(quote.high.toFixed(2)),
    low:           parseFloat(quote.low.toFixed(2)),
    symbol,
    timestamp:     new Date().toISOString(),
  }

  _cache = { data, expiresAt: Date.now() + 30_000 }
  return data
}
