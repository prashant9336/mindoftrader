'use client'

import { useState, useCallback } from 'react'
import type { TradeEvaluation } from '@/types'
import { DEMO_USER_ID } from '@/lib/supabase'

export function useTradeEvaluator(userId = DEMO_USER_ID) {
  const [evaluation, setEvaluation] = useState<TradeEvaluation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setEvaluation(null)
    setSubmitted(false)
    setError(null)
  }, [])

  const submitTrade = useCallback(
    async (tradeInput: {
      entryPrice: number
      stopLoss: number
      target: number
      direction: string
      symbol?: string
    }) => {
      if (!evaluation) return
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/trade/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...tradeInput, userId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSubmitted(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to submit')
      } finally {
        setSubmitting(false)
      }
    },
    [evaluation, userId]
  )

  return { evaluation, setEvaluation, submitting, submitted, error, reset, submitTrade }
}
