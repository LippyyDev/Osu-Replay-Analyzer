-- ============================================================
-- Add online_score_id deduplication to reports table
-- Run in Supabase SQL Editor AFTER 002_reports_table.sql
-- ============================================================

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS online_score_id TEXT;

-- Unique index: one report per osu! score ID (NULL values are excluded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_online_score_id
  ON reports(online_score_id)
  WHERE online_score_id IS NOT NULL AND online_score_id <> '0';
