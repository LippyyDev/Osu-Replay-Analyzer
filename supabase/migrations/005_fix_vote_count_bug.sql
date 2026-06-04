-- ============================================================
-- Fix posts_with_meta view: Cartesian product bug in vote + comment JOIN
-- When a post has N votes and M comments, votes were counted N*M times
-- instead of N times due to LEFT JOIN producing a cross product.
--
-- Fix: use correlated subqueries for vote and comment counts.
-- Run this in Supabase SQL Editor.
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
  -- Isolated subqueries avoid Cartesian product between votes and comments
  COALESCE((
    SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id AND v.value = 1
  ), 0)::INT AS upvotes,
  COALESCE((
    SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id AND v.value = -1
  ), 0)::INT AS downvotes,
  COALESCE((
    SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id
  ), 0)::INT AS comment_count
FROM posts p
LEFT JOIN users u ON p.user_id = u.id;
