'use client'

import type { WebSocketMessage } from '@/types'

type MessageHandler = (msg: WebSocketMessage) => void

class CoachWebSocket {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)
          this.handlers.forEach((h) => h(msg))
        } catch {
          // ignore malformed messages
        }
      }

      this.ws.onclose = () => {
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  send(msg: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton
let instance: CoachWebSocket | null = null

export function getCoachWS(): CoachWebSocket {
  if (!instance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
    instance = new CoachWebSocket(wsUrl)
  }
  return instance
}
