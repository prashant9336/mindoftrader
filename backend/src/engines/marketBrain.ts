export type MarketState = 'TRENDING' | 'SIDEWAYS' | 'TRAP'

export interface MarketData {
  price: number
  vwap: number
  atr: number
  prevAtr: number
  oi: number
  prevOi: number
  change: number
  changePercent: number
  high: number
  low: number
  symbol: string
  timestamp: string
}

// Persistent mock state for realistic simulation
let mockPrice = 19847.5
let mockOi = 1_250_000
let mockPrevAtr = 85.5

export function generateMockMarketData(symbol = 'NIFTY'): MarketData {
  const noise = (Math.random() - 0.5) * 40
  mockPrice = Math.max(18000, Math.min(21000, mockPrice + noise))

  const high = mockPrice + Math.random() * 60
  const low = mockPrice - Math.random() * 60
  const atr = high - low + Math.random() * 30
  const prevAtr = mockPrevAtr
  mockPrevAtr = atr * 0.8 + prevAtr * 0.2

  const vwap = mockPrice + (Math.random() - 0.5) * 120
  const oiChange = (Math.random() - 0.5) * 50000
  const prevOi = mockOi
  mockOi = Math.max(800_000, mockOi + oiChange)

  const open = mockPrice - noise
  const change = mockPrice - open
  const changePercent = (change / open) * 100

  return {
    price: parseFloat(mockPrice.toFixed(2)),
    vwap: parseFloat(vwap.toFixed(2)),
    atr: parseFloat(atr.toFixed(2)),
    prevAtr: parseFloat(prevAtr.toFixed(2)),
    oi: Math.round(mockOi),
    prevOi: Math.round(prevOi),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high: parseFloat(high.toFixed(2)),
    low: parseFloat(low.toFixed(2)),
    symbol,
    timestamp: new Date().toISOString(),
  }
}

export function evaluateMarketState(data: MarketData): { state: MarketState; signals: string[] } {
  const { price, vwap, atr, prevAtr, oi, prevOi } = data
  const signals: string[] = []

  const atrExpanding = atr > prevAtr * 1.1
  const atrContracting = atr < prevAtr * 0.9
  const priceAboveVwap = price > vwap
  const priceNearVwap = Math.abs(price - vwap) / vwap < 0.005
  const priceSpike = atr > prevAtr * 1.5
  const oiDropping = oi < prevOi * 0.97

  if (priceSpike && oiDropping) {
    signals.push('ATR spike without OI support — possible trap')
    return { state: 'TRAP', signals }
  }

  if ((priceAboveVwap || !priceAboveVwap) && atrExpanding && !priceNearVwap) {
    signals.push(priceAboveVwap ? 'Bullish trend — price above VWAP' : 'Bearish trend — price below VWAP')
    signals.push('ATR expanding — directional momentum')
    return { state: 'TRENDING', signals }
  }

  signals.push('Price near VWAP — no clear direction')
  if (atrContracting) signals.push('ATR contracting — low volatility')
  return { state: 'SIDEWAYS', signals }
}
