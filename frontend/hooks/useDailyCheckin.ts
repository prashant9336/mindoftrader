'use client'

import { useState, useEffect } from 'react'

const KEY = 'mot_checkin_date'

export function useDailyCheckin() {
  const [shown, setShown] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const today = new Date().toDateString()
    const last = localStorage.getItem(KEY)
    if (last !== today) setShown(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(KEY, new Date().toDateString())
    setDismissed(true)
  }

  return { showCheckin: shown && !dismissed, dismiss }
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
