'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { MarketStateResult } from '@/types'

function fvgHash(result: MarketStateResult | null): string {
  const sig = result?.fvg?.signal
  if (!sig) return 'none'
  return `${sig.direction}_${Math.round(sig.entry)}_${Math.round(sig.fvgBot)}_${Math.round(sig.fvgTop)}`
}

export function useMarketState(symbol = 'NIFTY', refreshInterval = 5000) {
  const [result, setResult] = useState<MarketStateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastHashRef = useRef<string>('')

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/market?symbol=${symbol}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const next: MarketStateResult = {
        state:   data.state,
        data:    data.data,
        signals: data.signals,
        fvg:     data.fvg ?? null,
      }
      setResult(next)
      setError(null)

      // Detect new FVG signal → trigger server-side push to all subscribers
      const hash = fvgHash(next)
      if (hash !== 'none' && hash !== lastHashRef.current) {
        lastHashRef.current = hash
        fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fvg: next.fvg }),
        }).catch(() => {})
      } else if (hash === 'none') {
        lastHashRef.current = ''
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchMarket()
    const id = setInterval(fetchMarket, refreshInterval)
    return () => clearInterval(id)
  }, [fetchMarket, refreshInterval])

  return { result, loading, error, refetch: fetchMarket }
}
