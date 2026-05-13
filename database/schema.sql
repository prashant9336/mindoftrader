-- MINDOFTRADER Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRADES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL DEFAULT 'NIFTY',
  direction TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT', 'LONG', 'SHORT')),
  entry_price DECIMAL(12, 2) NOT NULL,
  exit_price DECIMAL(12, 2),
  stop_loss DECIMAL(12, 2) NOT NULL,
  target DECIMAL(12, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  pnl DECIMAL(12, 2),
  permission_status TEXT NOT NULL CHECK (permission_status IN ('ALLOWED', 'RISKY', 'BLOCKED')),
  market_state TEXT NOT NULL CHECK (market_state IN ('TRENDING', 'SIDEWAYS', 'TRAP')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  block_reasons TEXT[],
  mistakes TEXT[],
  improvement_tips TEXT[],
  rr_ratio DECIMAL(6, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- =============================================
-- BEHAVIOR LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS behavior_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trade_placed', 'trade_blocked', 'consecutive_losses',
    'rapid_trading', 'revenge_pattern', 'lock_applied', 'lock_removed'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MARKET STATE LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS market_state_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL DEFAULT 'NIFTY',
  state TEXT NOT NULL CHECK (state IN ('TRENDING', 'SIDEWAYS', 'TRAP')),
  price DECIMAL(12, 2) NOT NULL,
  vwap DECIMAL(12, 2) NOT NULL,
  atr DECIMAL(12, 2) NOT NULL,
  oi BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER LOCKS TABLE (trading locks)
-- =============================================
CREATE TABLE IF NOT EXISTS user_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocks_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_user_id ON behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_created_at ON behavior_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_state_logs_created_at ON market_state_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locks_user_id ON user_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locks_active ON user_locks(is_active);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locks ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "trades_own_data" ON trades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "behavior_logs_own_data" ON behavior_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "market_state_logs_read_all" ON market_state_logs
  FOR SELECT USING (true);

CREATE POLICY "user_locks_own_data" ON user_locks
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- HELPER VIEW: User trading summary
-- =============================================
CREATE OR REPLACE VIEW user_trading_summary AS
SELECT
  u.id AS user_id,
  u.name,
  COUNT(t.id) AS total_trades,
  COUNT(t.id) FILTER (WHERE t.pnl > 0) AS winning_trades,
  COUNT(t.id) FILTER (WHERE t.pnl <= 0) AS losing_trades,
  COALESCE(SUM(t.pnl), 0) AS total_pnl,
  COALESCE(AVG(t.pnl) FILTER (WHERE t.status = 'closed'), 0) AS avg_pnl,
  COUNT(t.id) FILTER (WHERE t.permission_status = 'BLOCKED' AND t.status != 'cancelled') AS blocked_trades_taken,
  COUNT(t.id) FILTER (WHERE DATE(t.created_at) = CURRENT_DATE) AS trades_today
FROM users u
LEFT JOIN trades t ON t.user_id = u.id AND t.status = 'closed'
GROUP BY u.id, u.name;

-- =============================================
-- DEMO USER (MVP — matches NEXT_PUBLIC_DEMO_USER_ID)
-- =============================================
INSERT INTO users (id, email, name, trading_mode)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@mindoftrader.com',
  'Demo Trader',
  'paper'
) ON CONFLICT (id) DO NOTHING;
