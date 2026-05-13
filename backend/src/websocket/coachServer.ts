import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import {
  generateMockMarketData,
  evaluateMarketState,
  type MarketData,
} from '../engines/marketBrain'
import {
  generateMarketCoachMessage,
  generateBehavioralMessage,
} from '../engines/behaviorEngine'

interface Client {
  ws: WebSocket
  userId?: string
  lastSeen: number
}

export function setupCoachServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/' })
  const clients = new Map<WebSocket, Client>()

  let latestMarketData: MarketData = generateMockMarketData()

  // ── Broadcast market updates every 5 seconds ──────────────
  setInterval(() => {
    latestMarketData = generateMockMarketData()
    const { state, signals } = evaluateMarketState(latestMarketData)

    const marketUpdate = {
      type: 'market_update',
      payload: {
        marketData: latestMarketData,
        marketState: state,
        signals,
      },
    }

    broadcast(clients, marketUpdate)
  }, 5000)

  // ── Send coach message every 20 seconds ───────────────────
  setInterval(() => {
    const { state } = evaluateMarketState(latestMarketData)
    const msg = generateMarketCoachMessage(state)

    broadcast(clients, {
      type: 'coach_message',
      payload: msg,
    })
  }, 20000)

  // ── Send behavioral tips every 60 seconds ─────────────────
  setInterval(() => {
    const msg = generateBehavioralMessage()
    broadcast(clients, {
      type: 'coach_message',
      payload: msg,
    })
  }, 60000)

  // ── Connection handler ────────────────────────────────────
  wss.on('connection', (ws) => {
    clients.set(ws, { ws, lastSeen: Date.now() })

    // Send current market state immediately on connect
    const { state, signals } = evaluateMarketState(latestMarketData)
    ws.send(
      JSON.stringify({
        type: 'market_update',
        payload: {
          marketData: latestMarketData,
          marketState: state,
          signals,
        },
      })
    )

    // Welcome message
    ws.send(
      JSON.stringify({
        type: 'coach_message',
        payload: {
          id: 'welcome',
          type: 'info',
          message: 'Live coach connected. I will monitor the market and your behavior in real-time.',
          timestamp: new Date().toISOString(),
        },
      })
    )

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        const client = clients.get(ws)
        if (client) client.lastSeen = Date.now()

        // Handle client-sent events
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'ping', payload: { ts: Date.now() } }))
        }

        if (msg.type === 'behavior_alert' && msg.payload?.consecutiveLosses >= 2) {
          ws.send(
            JSON.stringify({
              type: 'lock_update',
              payload: {
                isLocked: true,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                reason: `${msg.payload.consecutiveLosses} consecutive losses`,
              },
            })
          )
        }
      } catch {
        // ignore invalid messages
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
    })
  })

  // ── Prune dead clients every 60s ──────────────────────────
  setInterval(() => {
    const staleTime = Date.now() - 90000
    for (const [ws, client] of clients) {
      if (client.lastSeen < staleTime) {
        ws.terminate()
        clients.delete(ws)
      }
    }
  }, 60000)

  console.log('[WS] Coach server initialized')
  return wss
}

function broadcast(clients: Map<WebSocket, Client>, msg: object) {
  const payload = JSON.stringify(msg)
  for (const { ws } of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }
}
