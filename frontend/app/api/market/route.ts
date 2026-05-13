import { NextResponse } from 'next/server'
import { generateMockMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'

// Simple in-memory cache — replace with Redis in Phase 3
let cache: { data: object; expiresAt: number } | null = null
const CACHE_TTL_MS = 5000 // 5 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'NIFTY'

  // Serve from cache if fresh
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data)
  }

  const marketData = generateMockMarketData(symbol)
  const { state, signals } = evaluateMarketState(marketData)

  const response = {
    marketData,
    marketState: state,
    signals,
    cachedAt: new Date().toISOString(),
  }

  cache = { data: response, expiresAt: Date.now() + CACHE_TTL_MS }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, max-age=5' },
  })
}
