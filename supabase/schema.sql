-- FarFlappy Database Schema
-- Paste this entire file in Supabase SQL Editor

-- =====================
-- PLAYERS TABLE
-- =====================
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid BIGINT UNIQUE, -- Farcaster ID (null for agents)
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  player_type TEXT NOT NULL DEFAULT 'human' CHECK (player_type IN ('human', 'agent')),
  total_score BIGINT DEFAULT 0,
  games_played INT DEFAULT 0,
  active_days INT DEFAULT 0,
  last_active_date DATE,
  streak_days INT DEFAULT 0,
  items JSONB DEFAULT '{"shield": 0, "flash": 0, "slow": 0, "double": 0, "magnet": 0, "extralife": 0}'::jsonb,
  flappy_points BIGINT DEFAULT 0, -- for airdrop conversion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- GAME SESSIONS TABLE
-- =====================
CREATE TABLE game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  pipes_passed INT DEFAULT 0,
  coins_collected INT DEFAULT 0,
  items_used JSONB DEFAULT '[]'::jsonb,
  duration_seconds INT DEFAULT 0,
  session_type TEXT DEFAULT 'casual' CHECK (session_type IN ('casual', 'tournament')),
  tournament_id UUID, -- FK added later
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- LEADERBOARD (daily snapshot)
-- =====================
CREATE TABLE leaderboard_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_type TEXT NOT NULL CHECK (player_type IN ('human', 'agent')),
  score INT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(player_id, date)
);

-- =====================
-- TOURNAMENTS TABLE
-- =====================
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('human', 'agent', 'both')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  entry_fee_usdc DECIMAL(10,6) DEFAULT 0.5,
  prize_pool_usdc DECIMAL(10,6) DEFAULT 0,
  participant_count INT DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  contract_address TEXT, -- deployed vault address
  winners JSONB DEFAULT '[]'::jsonb, -- [{wallet, rank, prize}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TOURNAMENT ENTRIES
-- =====================
CREATE TABLE tournament_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('free', 'paid')),
  tx_hash TEXT, -- onchain tx for paid entry
  best_score INT DEFAULT 0,
  attempt_count INT DEFAULT 0,
  qualified_free BOOLEAN DEFAULT FALSE, -- met free entry criteria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- Add FK for game_sessions tournament
ALTER TABLE game_sessions ADD CONSTRAINT fk_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;

-- =====================
-- SHOP / ITEMS
-- =====================
CREATE TABLE shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL, -- 'flash', 'slow', 'double', 'magnet', 'extralife'
  name TEXT NOT NULL,
  description TEXT,
  price_usd DECIMAL(10,2) NOT NULL,
  discounted_price_usd DECIMAL(10,2),
  discount_until TIMESTAMPTZ,
  spawn_rate DECIMAL(5,4) DEFAULT 0, -- 0 = not spawnable, buy only
  duration_seconds INT,
  score_multiplier DECIMAL(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed shop items
INSERT INTO shop_items (item_key, name, description, price_usd, discounted_price_usd, discount_until, spawn_rate, duration_seconds, score_multiplier) VALUES
('flash', 'Flash Mode', 'Ultra speed + invincible for 15s. Score multiplied!', 5.00, 2.00, NOW() + INTERVAL '7 days', 0.001, 15, 2.0),
('slow', 'Slow Motion', 'Pipes slow down for 10s', 3.00, NULL, NULL, 0.01, 10, 1.0),
('double', 'Double Score', '2x points for 20s', 3.00, NULL, NULL, 0.005, 20, 2.0),
('magnet', 'Coin Magnet', 'Auto-collect coins for 15s', 2.00, NULL, NULL, 0.01, 15, 1.0),
('extralife', 'Extra Life', 'Survive one collision', 4.00, NULL, NULL, 0.0005, NULL, 1.0);

-- Shield is free spawn only (2% rate), not for sale
-- =====================
-- PURCHASES TABLE
-- =====================
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  item_key TEXT REFERENCES shop_items(item_key),
  quantity INT DEFAULT 1,
  price_paid_usd DECIMAL(10,2),
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AGENT API KEYS
-- =====================
CREATE TABLE agent_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_players_fid ON players(fid);
CREATE INDEX idx_players_wallet ON players(wallet_address);
CREATE INDEX idx_players_type ON players(player_type);
CREATE INDEX idx_game_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_tournament ON game_sessions(tournament_id);
CREATE INDEX idx_leaderboard_daily_date ON leaderboard_daily(date);
CREATE INDEX idx_leaderboard_daily_type ON leaderboard_daily(player_type);
CREATE INDEX idx_tournament_entries_tournament ON tournament_entries(tournament_id);

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Public read for leaderboard
CREATE POLICY "Public leaderboard read" ON leaderboard_daily FOR SELECT USING (true);
CREATE POLICY "Public tournament read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public player read" ON players FOR SELECT USING (true);
CREATE POLICY "Public shop read" ON shop_items FOR SELECT USING (true);

-- Players manage own data
CREATE POLICY "Players insert own" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players update own" ON players FOR UPDATE USING (true);

-- Game sessions
CREATE POLICY "Sessions insert" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions read own" ON game_sessions FOR SELECT USING (true);

-- Tournament entries
CREATE POLICY "Entries insert" ON tournament_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Entries read" ON tournament_entries FOR SELECT USING (true);
CREATE POLICY "Entries update" ON tournament_entries FOR UPDATE USING (true);

-- Purchases
CREATE POLICY "Purchases insert" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Purchases read own" ON purchases FOR SELECT USING (true);

-- =====================
-- FUNCTIONS
-- =====================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update daily leaderboard upsert
CREATE OR REPLACE FUNCTION upsert_daily_score(
  p_player_id UUID,
  p_player_type TEXT,
  p_score INT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO leaderboard_daily (player_id, player_type, score, date)
  VALUES (p_player_id, p_player_type, p_score, CURRENT_DATE)
  ON CONFLICT (player_id, date)
  DO UPDATE SET score = GREATEST(leaderboard_daily.score, EXCLUDED.score);
END;
$$ LANGUAGE plpgsql;

-- Check free tournament eligibility
CREATE OR REPLACE FUNCTION check_free_tournament_eligibility(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_active_days INT;
  v_avg_score NUMERIC;
BEGIN
  SELECT active_days INTO v_active_days FROM players WHERE id = p_player_id;
  
  SELECT AVG(score) INTO v_avg_score
  FROM leaderboard_daily
  WHERE player_id = p_player_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';
  
  RETURN v_active_days >= 5 AND COALESCE(v_avg_score, 0) >= 5000;
END;
$$ LANGUAGE plpgsql;
