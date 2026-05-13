'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { DEMO_USER_ID } from '@/lib/supabase'
import type { EdgeBreakdown, UserEdgeStats } from '@/types'

interface EdgeStatsResult {
  stats: UserEdgeStats | null
  latestScore: EdgeBreakdown | null
  history: {
    id: string
    edgeScore: number
    discipline: number
    timing: number
    risk: number
    consistency: number
    permission: string
    marketState: string
    createdAt: string
  }[]
  loading: boolean
  refresh: () => void
}

export function useEdgeStats(): EdgeStatsResult {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? DEMO_USER_ID

  const [data, setData] = useState<Omit<EdgeStatsResult, 'loading' | 'refresh'>>({
    stats: null,
    latestScore: null,
    history: [],
  })
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/edge-score?userId=${userId}`)
      if (res.ok) {
        const json = await res.json()
        setData({
          stats:       json.stats       ?? null,
          latestScore: json.latestScore ?? null,
          history:     json.history     ?? [],
        })
      }
    } catch {
      // silently fail — caller falls back to useEdgeScore
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetch_() }, [fetch_])

  return { ...data, loading, refresh: fetch_ }
}
