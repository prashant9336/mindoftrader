-- ═══════════════════════════════════════════════════════════════
-- Migration 001 — Edge Score System
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add edge score columns to the trades table ─────────────
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS discipline_score  INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS timing_score      INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS risk_score        INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS consistency_score INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS edge_score        INTEGER NOT NULL DEFAULT 100;

-- Index for fast score queries
CREATE INDEX IF NOT EXISTS idx_trades_edge_score ON trades (user_id, edge_score, created_at DESC);

-- ── 2. Create user_edge_stats table ───────────────────────────
CREATE TABLE IF NOT EXISTS user_edge_stats (
  user_id          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avg_edge_score   INTEGER     NOT NULL DEFAULT 0,
  discipline_avg   INTEGER     NOT NULL DEFAULT 0,
  timing_avg       INTEGER     NOT NULL DEFAULT 0,
  risk_avg         INTEGER     NOT NULL DEFAULT 0,
  consistency_avg  INTEGER     NOT NULL DEFAULT 0,
  trade_count      INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Helper: recalculate rolling average for a user ─────────
-- Called via: SELECT recalculate_edge_stats('user-uuid');
CREATE OR REPLACE FUNCTION recalculate_edge_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count       INTEGER;
  v_edge_avg    INTEGER;
  v_disc_avg    INTEGER;
  v_timing_avg  INTEGER;
  v_risk_avg    INTEGER;
  v_cons_avg    INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(ROUND(AVG(edge_score)),       0),
    COALESCE(ROUND(AVG(discipline_score)), 0),
    COALESCE(ROUND(AVG(timing_score)),     0),
    COALESCE(ROUND(AVG(risk_score)),       0),
    COALESCE(ROUND(AVG(consistency_score)),0)
  INTO v_count, v_edge_avg, v_disc_avg, v_timing_avg, v_risk_avg, v_cons_avg
  FROM (
    SELECT edge_score, discipline_score, timing_score, risk_score, consistency_score
    FROM trades
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) recent;

  INSERT INTO user_edge_stats
    (user_id, avg_edge_score, discipline_avg, timing_avg, risk_avg, consistency_avg, trade_count, updated_at)
  VALUES
    (p_user_id, v_edge_avg, v_disc_avg, v_timing_avg, v_risk_avg, v_cons_avg, v_count, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    avg_edge_score  = EXCLUDED.avg_edge_score,
    discipline_avg  = EXCLUDED.discipline_avg,
    timing_avg      = EXCLUDED.timing_avg,
    risk_avg        = EXCLUDED.risk_avg,
    consistency_avg = EXCLUDED.consistency_avg,
    trade_count     = EXCLUDED.trade_count,
    updated_at      = NOW();
END;
$$;
