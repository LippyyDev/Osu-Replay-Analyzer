-- ============================================================
-- Add csv_content column to store raw CSV for shared reports
-- Allows Full Note Log and RAW CSV download on shared /report/[id] pages
-- Run in Supabase SQL Editor AFTER 003_reports_dedup.sql
-- ============================================================

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS csv_content TEXT;
