import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { setupCoachServer } from './websocket/coachServer'

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'] }))
app.use(express.json())

// Rate limiting for REST routes
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' },
  })
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = http.createServer(app)
setupCoachServer(server)

server.listen(PORT, () => {
  console.log(`[Server] MindOfTrader backend running on port ${PORT}`)
  console.log(`[Server] WebSocket coach at ws://localhost:${PORT}`)
})
