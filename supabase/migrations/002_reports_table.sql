-- ============================================================
-- Add reports table for shareable replay analysis links
-- Run this in Supabase SQL Editor AFTER 001_forum_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Relax analysis snapshot
  relax_result  JSONB,
  relax_warnings JSONB,
  -- osr metadata (beatmap info, player profile, computed stats)
  osr_data      JSONB,
  -- Filename (display only)
  filename      TEXT,
  -- Player name from replay
  player_name   TEXT,
  -- Beatmap title
  beatmap_title TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id    ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
