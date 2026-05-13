import type { MarketData, MarketState, MarketStateResult } from '@/types'
import { fetchLiveMarketData } from '@/lib/market/marketData'

// Unified entry point — live data from Yahoo Finance, mock as fallback
export async function getMarketData(symbol = 'NIFTY'): Promise<{ data: MarketData; source: string }> {
  try {
    const data = await fetchLiveMarketData(symbol)
    return { data, source: 'live' }
  } catch {
    return { data: generateMockMarketData(symbol), source: 'mock' }
  }
}

// Mock price generator (fallback)
let mockPrice = 23400.0
let mockOi = 1_250_000
let mockPrevAtr = 85.5

export function generateMockMarketData(symbol = 'NIFTY'): MarketData {
  // Simulate realistic price movement
  const noise = (Math.random() - 0.5) * 40
  mockPrice = Math.max(22000, Math.min(25000, mockPrice + noise))

  const high = mockPrice + Math.random() * 60
  const low = mockPrice - Math.random() * 60
  const atr = high - low + Math.random() * 30
  const prevAtr = mockPrevAtr
  mockPrevAtr = atr * 0.8 + prevAtr * 0.2 // smoothed

  // VWAP drifts slowly relative to price
  const vwap = mockPrice + (Math.random() - 0.5) * 120

  // OI fluctuates
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

export function evaluateMarketState(data: MarketData): MarketStateResult {
  const { price, vwap, atr, prevAtr, oi, prevOi } = data
  const signals: string[] = []

  // Core conditions
  const priceAboveVwap = price > vwap
  const atrExpanding = atr > prevAtr * 1.1
  const atrContracting = atr < prevAtr * 0.9
  const priceNearVwap = Math.abs(price - vwap) / vwap < 0.005
  const priceSpike = atr > prevAtr * 1.5
  const oiDropping = oi < prevOi * 0.97

  // TRAP: price spike without OI support (fake move)
  if (priceSpike && oiDropping) {
    signals.push('ATR spike detected without OI support')
    signals.push('Possible trap or stop hunt')
    return { state: 'TRAP', data, signals }
  }

  // TRENDING: price above/below VWAP with expanding ATR
  if ((priceAboveVwap || !priceAboveVwap) && atrExpanding && !priceNearVwap) {
    signals.push(priceAboveVwap ? 'Price above VWAP — bullish bias' : 'Price below VWAP — bearish bias')
    signals.push('ATR expanding — momentum present')
    return { state: 'TRENDING', data, signals }
  }

  // SIDEWAYS: price near VWAP with contracting/low ATR
  if (priceNearVwap || atrContracting) {
    signals.push('Price consolidating near VWAP')
    signals.push('ATR contracting — no directional momentum')
    return { state: 'SIDEWAYS', data, signals }
  }

  // Default to SIDEWAYS
  signals.push('Mixed signals — treat as sideways')
  return { state: 'SIDEWAYS', data, signals }
}
