-- MindOfTrader — PostgreSQL Schema
-- Run in: Vercel Postgres → Query Editor (or psql)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT        UNIQUE NOT NULL,
  name         TEXT        NOT NULL,
  avatar_url   TEXT,
  trading_mode TEXT        DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Trades ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol             TEXT         NOT NULL DEFAULT 'NIFTY',
  direction          TEXT         NOT NULL CHECK (direction IN ('CALL','PUT','LONG','SHORT')),
  entry_price        DECIMAL(12,2) NOT NULL,
  exit_price         DECIMAL(12,2),
  stop_loss          DECIMAL(12,2) NOT NULL,
  target             DECIMAL(12,2) NOT NULL,
  quantity           INTEGER       DEFAULT 1,
  pnl                DECIMAL(12,2),
  permission_status  TEXT          NOT NULL CHECK (permission_status IN ('ALLOWED','RISKY','BLOCKED')),
  market_state       TEXT          NOT NULL CHECK (market_state IN ('TRENDING','SIDEWAYS','TRAP')),
  status             TEXT          DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  block_reasons      TEXT[],
  mistakes           TEXT[],
  improvement_tips   TEXT[],
  rr_ratio           DECIMAL(6,2),
  -- Edge score columns
  discipline_score   INTEGER       NOT NULL DEFAULT 100,
  timing_score       INTEGER       NOT NULL DEFAULT 100,
  risk_score         INTEGER       NOT NULL DEFAULT 100,
  consistency_score  INTEGER       NOT NULL DEFAULT 100,
  edge_score         INTEGER       NOT NULL DEFAULT 100,
  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  closed_at          TIMESTAMPTZ
);

-- ── User Edge Stats ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_edge_stats (
  user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avg_edge_score  INTEGER     NOT NULL DEFAULT 0,
  discipline_avg  INTEGER     NOT NULL DEFAULT 0,
  timing_avg      INTEGER     NOT NULL DEFAULT 0,
  risk_avg        INTEGER     NOT NULL DEFAULT 0,
  consistency_avg INTEGER     NOT NULL DEFAULT 0,
  trade_count     INTEGER     NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Behavior Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS behavior_logs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT        NOT NULL CHECK (event_type IN (
    'trade_placed','trade_blocked','consecutive_losses',
    'rapid_trading','revenge_pattern','lock_applied','lock_removed'
  )),
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Market State Logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_state_logs (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol     TEXT         NOT NULL DEFAULT 'NIFTY',
  state      TEXT         NOT NULL CHECK (state IN ('TRENDING','SIDEWAYS','TRAP')),
  price      DECIMAL(12,2) NOT NULL,
  vwap       DECIMAL(12,2) NOT NULL,
  atr        DECIMAL(12,2) NOT NULL,
  oi         BIGINT,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── User Locks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_locks (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason     TEXT        NOT NULL,
  locked_at  TIMESTAMPTZ DEFAULT NOW(),
  unlocks_at TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN     DEFAULT TRUE
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trades_user_id       ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at    ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status        ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_edge_score    ON trades(user_id, edge_score, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_user_id     ON behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_created_at  ON behavior_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_created_at    ON market_state_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locks_user_id        ON user_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_locks_active         ON user_locks(is_active);

-- ── updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Demo user (matches NEXT_PUBLIC_DEMO_USER_ID) ───────────────
INSERT INTO users (id, email, name, trading_mode)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@mindoftrader.com', 'Demo Trader', 'paper')
ON CONFLICT (id) DO NOTHING;
