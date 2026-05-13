'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MarketStateResult } from '@/types'

export function useMarketState(symbol = 'NIFTY', refreshInterval = 5000) {
  const [result, setResult] = useState<MarketStateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/market?symbol=${symbol}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({
        state:   data.state,
        data:    data.data,
        signals: data.signals,
        fvg:     data.fvg ?? null,
      })
      setError(null)
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
