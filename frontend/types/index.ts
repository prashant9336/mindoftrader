// Core domain types for MindOfTrader

// ── Candles / FVG ────────────────────────────────────────────

export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface FVGZone {
  top: number
  bot: number
  dir: 1 | -1  // +1 = bull FVG, -1 = bear FVG
}

export type FVGTrendState = 'strong_bull' | 'strong_bear' | 'weak_bull' | 'weak_bear' | 'neutral'

export interface FVGSignal {
  direction: 'LONG' | 'SHORT'
  entry: number
  stopLoss: number
  target: number
  rrRatio: number
  fvgTop: number
  fvgBot: number
  optionTarget: number  // risk × delta — approx CE/PE premium pts
}

export interface FVGContext {
  trendState: FVGTrendState
  inSession: boolean
  vwap5m: number
  vwap15m: number
  vwapHTF: number
  above5mVwap: boolean
  above15mVwap: boolean
  aboveHTFVwap: boolean
  fvgZoneCount: number
  signal: FVGSignal | null
}

export type MarketState    = 'TRENDING' | 'SIDEWAYS' | 'TRAP'
export type TradePermission = 'ALLOWED' | 'RISKY' | 'BLOCKED'
export type TradeDirection  = 'CALL' | 'PUT' | 'LONG' | 'SHORT'
export type TradeStatus     = 'open' | 'closed' | 'cancelled'
export type EdgeLevel       = 'BEGINNER' | 'DEVELOPING' | 'SKILLED' | 'ELITE'

// ── Market ────────────────────────────────────────────────────

export interface MarketData {
  price: number
  vwap: number
  atr: number
  prevAtr: number
  oi: number
  prevOi: number
  change: number
  changePercent: number
  high: number
  low: number
  symbol: string
  timestamp: string
}

export interface MarketStateResult {
  state: MarketState
  data: MarketData
  signals: string[]
  fvg?: FVGContext | null
}

// ── Trade evaluation ─────────────────────────────────────────

export interface TradeInput {
  entryPrice: number
  stopLoss: number
  target: number
  direction: TradeDirection
  symbol?: string
}

/** Signals extracted by the trade permission engine — used by edge score calculator */
export interface TradeSignals {
  lateEntry: boolean
  againstTrend: boolean
  sidewaysMarket: boolean
  trapMarket: boolean
  goodEntry: boolean
  hasSL: boolean
  movedSL: boolean          // post-trade only; false at evaluation time
  fvgAligned?: boolean      // undefined = no FVG active; true = aligned; false = against structure
}

export interface TradeEvaluation {
  permission: TradePermission
  rrRatio: number
  reasons: string[]
  marketState: MarketState
  marketData: MarketData
  riskAmount: number
  rewardAmount: number
  signals: TradeSignals
  /** Populated by the evaluate API — not present in pure engine output */
  edgeScore?: EdgeBreakdown
  /** Populated by the evaluate API — coaching messages generated from edge score */
  coachMessages?: CoachMessage[]
}

// ── Edge Score ────────────────────────────────────────────────

export interface EdgeBreakdown {
  discipline: number
  timing: number
  risk: number
  consistency: number
  total: number
  level: EdgeLevel
  penalties: string[]
}

export interface UserEdgeStats {
  userId: string
  avgEdgeScore: number
  disciplineAvg: number
  timingAvg: number
  riskAvg: number
  consistencyAvg: number
  tradeCount: number
  updatedAt: string
}

// ── Trade record ─────────────────────────────────────────────

export interface Trade {
  id: string
  userId: string
  symbol: string
  direction: TradeDirection
  entryPrice: number
  exitPrice?: number
  stopLoss: number
  target: number
  quantity: number
  pnl?: number
  permissionStatus: TradePermission
  marketState: MarketState
  status: TradeStatus
  blockReasons?: string[]
  mistakes?: string[]
  improvementTips?: string[]
  rrRatio: number
  // Edge score columns (added by migration 001)
  disciplineScore?: number
  timingScore?: number
  riskScore?: number
  consistencyScore?: number
  edgeScore?: number
  createdAt: string
  closedAt?: string
}

// ── Behavior ──────────────────────────────────────────────────

export interface BehaviorStatus {
  tradesToday: number
  consecutiveLosses: number
  isLocked: boolean
  lockReason?: string
  lockedUntil?: string
  lastTradeAt?: string
  revengeRisk: boolean
  warningMessages: string[]
}

// ── Coach ────────────────────────────────────────────────────

export interface CoachMessage {
  id: string
  type: 'info' | 'warning' | 'alert' | 'success'
  message: string
  timestamp: string
  source?: 'market' | 'trade_eval' | 'behavior'
}

// ── Post-trade ───────────────────────────────────────────────

export interface PostTradeAnalysis {
  tradeId: string
  wasAligned: boolean
  wasLateEntry: boolean
  wasSlLogical: boolean
  mistakes: string[]
  improvementTips: string[]
  score: number
}

// ── WebSocket ────────────────────────────────────────────────

export interface WebSocketMessage {
  type: 'market_update' | 'coach_message' | 'behavior_alert' | 'lock_update' | 'ping'
  payload: unknown
}

// ── User ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  name: string
  tradingMode: 'paper' | 'live'
  createdAt: string
}

export interface DashboardStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnl: number
  avgPnl: number
  winRate: number
  tradesToday: number
}
