'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CoachMessage, MarketStateResult, WebSocketMessage } from '@/types'
import { getCoachWS } from '@/lib/websocket'
import { getLatestMessages, subscribe as busSubscribe } from '@/lib/coachMessageBus'

const MAX_MESSAGES = 50

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [marketFromWS, setMarketFromWS] = useState<MarketStateResult | null>(null)
  const initialized = useRef(false)

  const addMessage = useCallback((msg: CoachMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  const injectMessages = useCallback((msgs: CoachMessage[]) => {
    setMessages((prev) => {
      const next = [...prev, ...msgs]
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Hydrate from bus (trade-eval messages persisted across page navigations)
    const stored = getLatestMessages()
    if (stored.length > 0) {
      injectMessages(stored.slice(-10))
    }

    const ws = getCoachWS()
    ws.connect()

    const connCheck = setInterval(() => {
      setIsConnected(ws.isConnected)
    }, 1000)

    const unsub = ws.subscribe((msg: WebSocketMessage) => {
      setIsConnected(true)

      if (msg.type === 'market_update') {
        const p = msg.payload as { marketData: MarketStateResult['data']; marketState: MarketStateResult['state']; signals: string[] }
        setMarketFromWS({ state: p.marketState, data: p.marketData, signals: p.signals })
      }

      if (msg.type === 'coach_message') {
        addMessage(msg.payload as CoachMessage)
      }

      if (msg.type === 'behavior_alert' || msg.type === 'lock_update') {
        addMessage(msg.payload as CoachMessage)
      }
    })

    // Subscribe to bus storage events (trade-eval messages published from trade page)
    const unsubBus = busSubscribe((newMessages) => {
      const tradeEvalMsgs = newMessages.filter((m) => m.source === 'trade_eval')
      if (tradeEvalMsgs.length > 0) {
        injectMessages(tradeEvalMsgs.slice(-3))
      }
    })

    const pingId = setInterval(() => {
      ws.send({ type: 'ping', payload: { ts: Date.now() } })
    }, 30000)

    return () => {
      unsub()
      unsubBus()
      clearInterval(connCheck)
      clearInterval(pingId)
    }
  }, [addMessage, injectMessages])

  return { isConnected, messages, marketFromWS, injectMessages }
}
