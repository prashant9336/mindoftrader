'use client'

import { useState, useEffect } from 'react'

const KEY = 'mot_streak'

interface StreakState {
  count: number
  lastDate: string
  broken: boolean
}

export function useDisciplineStreak() {
  const [streak, setStreak] = useState<StreakState>({ count: 0, lastDate: '', broken: false })

  useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: StreakState = JSON.parse(raw)
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()

      // Continue streak if last active day was yesterday or today
      if (parsed.lastDate === today || parsed.lastDate === yesterday) {
        setStreak(parsed)
      } else if (parsed.lastDate && parsed.lastDate !== today) {
        // Missed a day — reset
        const reset: StreakState = { count: 0, lastDate: today, broken: true }
        localStorage.setItem(KEY, JSON.stringify(reset))
        setStreak(reset)
      } else {
        setStreak(parsed)
      }
    }
  }, [])

  const advanceStreak = () => {
    const today = new Date().toDateString()
    setStreak((prev) => {
      const next: StreakState = {
        count: prev.lastDate === today ? prev.count : prev.count + 1,
        lastDate: today,
        broken: false,
      }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  const breakStreak = (reason?: string) => {
    console.log('[Streak] Broken:', reason)
    const next: StreakState = { count: 0, lastDate: new Date().toDateString(), broken: true }
    localStorage.setItem(KEY, JSON.stringify(next))
    setStreak(next)
  }

  return { streak: streak.count, broken: streak.broken, advanceStreak, breakStreak }
}
