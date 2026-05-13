'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { BehaviorStatus } from '@/types'
import { DEMO_USER_ID } from '@/lib/supabase'

export function useBehavior(refreshInterval = 30000) {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? DEMO_USER_ID
  const [behavior, setBehavior] = useState<BehaviorStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/behavior?userId=${userId}`)
      const data = await res.json()
      if (res.ok) setBehavior(data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, refreshInterval)
    return () => clearInterval(id)
  }, [fetch_, refreshInterval])

  return { behavior, loading, refetch: fetch_ }
}
