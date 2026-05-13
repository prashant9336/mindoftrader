'use client'

import type { CoachMessage } from '@/types'

const MESSAGES_KEY = 'mot_coach_messages'
const VERDICT_KEY  = 'mot_coach_verdict'
const MAX_STORED   = 20

export function publishMessages(messages: CoachMessage[]): void {
  if (typeof window === 'undefined') return
  const existing = getLatestMessages()
  const combined = [...existing, ...messages].slice(-MAX_STORED)
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(combined))
  window.dispatchEvent(new StorageEvent('storage', { key: MESSAGES_KEY, newValue: JSON.stringify(combined) }))

  // Store the system verdict (first trade_eval message) separately for dashboard display
  const verdict = messages.find((m) => m.source === 'trade_eval')
  if (verdict) {
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict))
    window.dispatchEvent(new StorageEvent('storage', { key: VERDICT_KEY, newValue: JSON.stringify(verdict) }))
  }
}

export function getLatestMessages(): CoachMessage[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]')
  } catch {
    return []
  }
}

export function getLatestVerdict(): CoachMessage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(VERDICT_KEY)
    return raw ? (JSON.parse(raw) as CoachMessage) : null
  } catch {
    return null
  }
}

export function subscribe(fn: (messages: CoachMessage[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key === MESSAGES_KEY) fn(getLatestMessages())
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
