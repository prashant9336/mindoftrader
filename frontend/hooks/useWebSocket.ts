'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CoachMessage } from '@/types'
import { getLatestMessages, subscribe as busSubscribe } from '@/lib/coachMessageBus'

const MAX_MESSAGES = 50

export function useWebSocket() {
  const [messages, setMessages] = useState<CoachMessage[]>([])

  const injectMessages = useCallback((msgs: CoachMessage[]) => {
    setMessages((prev) => {
      const next = [...prev, ...msgs]
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  useEffect(() => {
    // Hydrate from bus on mount
    const stored = getLatestMessages()
    if (stored.length > 0) injectMessages(stored.slice(-10))

    // Subscribe to new messages from trade evaluation
    const unsubBus = busSubscribe((newMessages) => {
      const tradeEvalMsgs = newMessages.filter((m) => m.source === 'trade_eval')
      if (tradeEvalMsgs.length > 0) injectMessages(tradeEvalMsgs.slice(-3))
    })

    return () => { unsubBus() }
  }, [injectMessages])

  return { messages, injectMessages }
}
