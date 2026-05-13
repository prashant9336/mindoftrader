-- Seed file for development/testing
-- Run AFTER schema.sql

-- Insert demo user (matches DEMO_USER_ID in .env)
INSERT INTO users (id, email, name, trading_mode)
VALUES (
  'demo-user-123',
  'demo@mindoftrader.com',
  'Demo Trader',
  'paper'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample trades for testing the journal
INSERT INTO trades (user_id, symbol, direction, entry_price, exit_price, stop_loss, target, quantity, pnl, permission_status, market_state, status, rr_ratio, mistakes, improvement_tips)
VALUES
  ('demo-user-123', 'NIFTY', 'LONG', 19850.00, 19920.00, 19800.00, 19950.00, 1, 70.00, 'ALLOWED', 'TRENDING', 'closed', 2.0, '{}', '{"Good trade — review what made this work"}'),
  ('demo-user-123', 'NIFTY', 'SHORT', 19780.00, 19740.00, 19830.00, 19680.00, 1, 40.00, 'ALLOWED', 'TRENDING', 'closed', 2.0, '{}', '{"Good outcome — review what made this trade work and repeat it"}'),
  ('demo-user-123', 'NIFTY', 'LONG', 19900.00, 19870.00, 19850.00, 19960.00, 1, -30.00, 'RISKY', 'SIDEWAYS', 'closed', 2.0, '{"Market is sideways — lower probability directional setup"}', '{"Sideways markets are difficult — focus on range extremes only"}'),
  ('demo-user-123', 'NIFTY', 'LONG', 19820.00, NULL, 19780.00, 19900.00, 1, NULL, 'ALLOWED', 'TRENDING', 'open', 2.0, '{}', '{}');

-- Insert sample behavior logs
INSERT INTO behavior_logs (user_id, event_type, metadata)
VALUES
  ('demo-user-123', 'trade_placed', '{"tradeId": "sample-1", "permission": "ALLOWED"}'),
  ('demo-user-123', 'trade_placed', '{"tradeId": "sample-2", "permission": "ALLOWED"}'),
  ('demo-user-123', 'trade_placed', '{"tradeId": "sample-3", "permission": "RISKY"}');

-- Insert sample market state log
INSERT INTO market_state_logs (symbol, state, price, vwap, atr, oi)
VALUES
  ('NIFTY', 'TRENDING', 19847.50, 19720.30, 87.50, 1250000),
  ('NIFTY', 'SIDEWAYS', 19810.25, 19805.10, 42.30, 1248000),
  ('NIFTY', 'TRAP', 19950.00, 19800.00, 145.00, 1210000);
