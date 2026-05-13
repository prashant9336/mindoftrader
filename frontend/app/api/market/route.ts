import { NextResponse } from 'next/server'
import { getMarketData, evaluateMarketState } from '@/lib/engines/marketBrain'
import { IS_DHAN_CONFIGURED } from '@/lib/market/dhanApi'

// Module-level cache — shared across requests within the same serverless instance
let cache: { data: object; expiresAt: number } | null = null
const TTL = IS_DHAN_CONFIGURED ? 30_000 : 5_000  // 30 s real / 5 s mock

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'NIFTY'

  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data)
  }

  try {
    const marketData = await getMarketData(symbol)
    const { state, signals } = evaluateMarketState(marketData)

    const response = {
      state,
      data:     marketData,
      signals,
      source:   IS_DHAN_CONFIGURED ? 'dhan' : 'mock',
      cachedAt: new Date().toISOString(),
    }

    cache = { data: response, expiresAt: Date.now() + TTL }
    return NextResponse.json(response, {
      headers: { 'Cache-Control': `public, max-age=${TTL / 1000}` },
    })
  } catch (err) {
    console.error('[market]', err)
    return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
  }
}
