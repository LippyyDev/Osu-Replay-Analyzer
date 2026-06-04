-- ============================================================
-- Forum Schema — Osu Replay Analyzer
-- Run this in Supabase SQL editor
-- ============================================================

-- Users table (unified, supports osu! and/or Google)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osu_id          TEXT UNIQUE,
  osu_username    TEXT,
  osu_avatar_url  TEXT,
  google_uid      TEXT UNIQUE,
  google_email    TEXT,
  google_display_name TEXT,
  google_photo_url TEXT,
  username        TEXT NOT NULL,  -- primary display name
  avatar_url      TEXT,           -- primary avatar
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  report_data JSONB,               -- snapshot of analysis result
  report_type TEXT CHECK (report_type IN ('relax', 'steal')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table (supports nested via parent_id)
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table (upvote +1, downvote -1, one per user per post)
CREATE TABLE IF NOT EXISTS votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_id    ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id    ON votes(user_id);

-- ============================================================
-- View: posts enriched with counts and author info
-- ============================================================
CREATE OR REPLACE VIEW posts_with_meta AS
SELECT
  p.id,
  p.user_id,
  p.title,
  p.body,
  p.report_data,
  p.report_type,
  p.created_at,
  p.updated_at,
  u.username        AS author_username,
  u.avatar_url      AS author_avatar,
  u.osu_username    AS author_osu_username,
  u.is_admin        AS author_is_admin,
  COALESCE(SUM(CASE WHEN v.value = 1  THEN 1 ELSE 0 END), 0)::INT AS upvotes,
  COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::INT AS downvotes,
  COUNT(DISTINCT c.id)::INT AS comment_count
FROM posts p
LEFT JOIN users   u ON p.user_id = u.id
LEFT JOIN votes   v ON p.id = v.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, u.username, u.avatar_url, u.osu_username, u.is_admin;

-- ============================================================
-- Row Level Security — disabled (all auth via custom JWT)
-- ============================================================
ALTER TABLE users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts    DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes    DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
