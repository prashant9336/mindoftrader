-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  endpoint    TEXT        UNIQUE NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks the last signal that was pushed so we don't spam
CREATE TABLE IF NOT EXISTS push_signal_state (
  id           TEXT PRIMARY KEY DEFAULT 'nifty',
  signal_hash  TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the state row so updates can use ON CONFLICT
INSERT INTO push_signal_state (id, signal_hash)
VALUES ('nifty', NULL)
ON CONFLICT (id) DO NOTHING;
