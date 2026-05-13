// Behavior coaching message generator for WebSocket server

export type CoachTone = 'info' | 'warning' | 'alert' | 'success'

export interface CoachMessage {
  id: string
  type: CoachTone
  message: string
  timestamp: string
}

import type { MarketState } from './marketBrain'

const COACH_MESSAGES: Record<MarketState, { type: CoachTone; message: string }[]> = {
  TRENDING: [
    { type: 'success', message: 'Market is trending — high probability zone. Trade in the direction of the trend only.' },
    { type: 'info', message: 'Trending conditions favor momentum entries. Wait for pullbacks to VWAP.' },
    { type: 'success', message: 'ATR expanding — good time for breakout setups aligned with the trend.' },
  ],
  SIDEWAYS: [
    { type: 'warning', message: 'Market is sideways. Avoid directional trades — wait for a breakout.' },
    { type: 'warning', message: 'Low ATR detected. Position sizes should be reduced in choppy conditions.' },
    { type: 'info', message: 'Sideways market: best plays are range extremes or waiting for a trend to form.' },
  ],
  TRAP: [
    { type: 'alert', message: 'TRAP detected — possible fake breakout. Do NOT trade this move.' },
    { type: 'alert', message: 'OI not supporting price spike. Smart money may be trapping retail traders.' },
    { type: 'warning', message: 'Price spike without volume/OI confirmation. Stay flat until clarity returns.' },
  ],
}

const BEHAVIORAL_MESSAGES: { type: CoachTone; message: string }[] = [
  { type: 'info', message: 'Remember: one good trade is better than ten average ones.' },
  { type: 'info', message: 'Let the setup come to you. Patience is a trading edge.' },
  { type: 'warning', message: "If you're not sure, you're not ready. Wait for clarity." },
  { type: 'info', message: 'Your job is not to trade — it is to make good decisions.' },
  { type: 'success', message: 'Good discipline compounds over time. Each blocked impulse is profit protected.' },
]

let messageCounter = 0

export function generateMarketCoachMessage(state: MarketState): CoachMessage {
  const pool = COACH_MESSAGES[state]
  const msg = pool[Math.floor(Math.random() * pool.length)]
  return {
    id: `msg-${++messageCounter}`,
    type: msg.type,
    message: msg.message,
    timestamp: new Date().toISOString(),
  }
}

export function generateBehavioralMessage(): CoachMessage {
  const msg = BEHAVIORAL_MESSAGES[Math.floor(Math.random() * BEHAVIORAL_MESSAGES.length)]
  return {
    id: `msg-${++messageCounter}`,
    type: msg.type,
    message: msg.message,
    timestamp: new Date().toISOString(),
  }
}

export function generateLockMessage(consecutiveLosses: number): CoachMessage {
  return {
    id: `msg-${++messageCounter}`,
    type: 'alert',
    message: `Trading locked for 30 minutes after ${consecutiveLosses} consecutive losses. Use this time to review your trades, not revenge trade.`,
    timestamp: new Date().toISOString(),
  }
}
