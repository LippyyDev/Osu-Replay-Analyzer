-- ============================================================
-- Add slug column to reports table for human-readable share URLs
-- Example: /report/itzkaguya-ohara-yuiko-yume-no-tochuu-de
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_reports_slug ON reports(slug);
CREATE INDEX IF NOT EXISTS idx_reports_online_score_id ON reports(online_score_id);
