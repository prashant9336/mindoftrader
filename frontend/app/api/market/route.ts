import { NextResponse } from 'next/server'
import { generateMockMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'
import { fetchMarketData, IS_DHAN_CONFIGURED } from '@/lib/market/dhanApi'

// Module-level cache — shared across requests within the same serverless instance
let cache: { data: object; expiresAt: number } | null = null

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'NIFTY'

  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data)
  }

  try {
    let source = 'mock'
    let marketData

    if (IS_DHAN_CONFIGURED) {
      try {
        marketData = await fetchMarketData(symbol)
        source = 'dhan'
      } catch {
        marketData = generateMockMarketData(symbol)
      }
    } else {
      marketData = generateMockMarketData(symbol)
    }

    const { state, signals } = evaluateMarketState(marketData)
    const ttl = source === 'dhan' ? 30_000 : 5_000

    const response = {
      state,
      data:     marketData,
      signals,
      source,
      cachedAt: new Date().toISOString(),
    }

    cache = { data: response, expiresAt: Date.now() + ttl }
    return NextResponse.json(response, {
      headers: { 'Cache-Control': `public, max-age=${ttl / 1000}` },
    })
  } catch (err) {
    console.error('[market]', err)
    return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
  }
}
