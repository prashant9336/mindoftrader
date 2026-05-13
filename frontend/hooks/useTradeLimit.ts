'use client'

import { useState, useEffect, useCallback } from 'react'

const DAILY_LIMIT = 2
const KEY = 'mot_trade_limit'

interface TradeLimitState {
  count: number
  date: string
  limit: number
}

export function useTradeLimit() {
  const [state, setState] = useState<TradeLimitState>({ count: 0, date: '', limit: DAILY_LIMIT })

  const load = useCallback(() => {
    const today = new Date().toDateString()
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: TradeLimitState = JSON.parse(raw)
      if (parsed.date === today) {
        setState({ ...parsed, limit: DAILY_LIMIT })
        return
      }
    }
    // New day — reset
    const fresh = { count: 0, date: today, limit: DAILY_LIMIT }
    localStorage.setItem(KEY, JSON.stringify(fresh))
    setState(fresh)
  }, [])

  useEffect(() => { load() }, [load])

  const incrementTrade = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, count: prev.count + 1 }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isAtLimit     = state.count >= state.limit
  const remaining     = Math.max(0, state.limit - state.count)
  const percentUsed   = Math.min(100, (state.count / state.limit) * 100)

  return { count: state.count, limit: state.limit, isAtLimit, remaining, percentUsed, incrementTrade }
}
