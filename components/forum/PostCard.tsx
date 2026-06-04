'use client';

import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/utils/timeFormat';
import VoteButton from './VoteButton';
import { MessageSquare, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useState } from 'react';

export interface PostMeta {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  report_type: 'relax' | 'steal' | null;
  report_data: Record<string, unknown> | null;
  created_at: string;
  author_username: string;
  author_avatar: string | null;
  author_osu_username: string | null;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  userVote?: number | null;
}

interface PostCardProps {
  post: PostMeta;
  userVote?: number | null;
  onDelete?: (id: string) => void;
}

const REPORT_BADGE: Record<string, { label: string; color: string }> = {
  relax: { label: 'RELAX', color: 'bg-[var(--color-neo-pink)] text-white' },
  steal: { label: 'STEAL', color: 'bg-[var(--color-neo-blue)] text-white' },
};

export default function PostCard({ post, userVote = null, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const [currentVote, setCurrentVote] = useState<number | null>(userVote ?? null);
  const [upvotes, setUpvotes]     = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [deleting, setDeleting]   = useState(false);

  const score = upvotes - downvotes;
  const canDelete = user && (user.sub === post.user_id || user.is_admin);
  const badge = post.report_type ? REPORT_BADGE[post.report_type] : null;

  const handleVote = async (value: 1 | -1) => {
    if (!user) return;
    const prev = currentVote;
    const prevUp = upvotes;
    const prevDown = downvotes;

    // Optimistic update
    if (currentVote === value) {
      setCurrentVote(null);
      if (value === 1) setUpvotes(u => u - 1);
      else setDownvotes(d => d - 1);
    } else {
      if (currentVote === 1) setUpvotes(u => u - 1);
      if (currentVote === -1) setDownvotes(d => d - 1);
      setCurrentVote(value);
      if (value === 1) setUpvotes(u => u + 1);
      else setDownvotes(d => d + 1);
    }

    try {
      const res = await fetch(`/api/forum/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setCurrentVote(prev);
      setUpvotes(prevUp);
      setDownvotes(prevDown);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    setDeleting(true);
    await fetch(`/api/forum/posts/${post.id}`, { method: 'DELETE' });
    onDelete?.(post.id);
  };

  return (
    <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all duration-200 overflow-hidden group">
      <div className="flex">
        {/* Vote Column */}
        <div className="flex flex-col items-center gap-1 px-3 py-4 bg-[var(--color-neo-bg)] border-r-[3px] border-black min-w-[56px]">
          <VoteButton
            direction="up"
            active={currentVote === 1}
            onClick={() => handleVote(1)}
            disabled={!user}
          />
          <span className={`text-sm font-black font-mono tabular-nums ${
            score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {score}
          </span>
          <VoteButton
            direction="down"
            active={currentVote === -1}
            onClick={() => handleVote(-1)}
            disabled={!user}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {badge && (
              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border-[2px] border-black ${badge.color}`}>
                {badge.label}
              </span>
            )}
            {post.report_data && (
              <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md border-[2px] border-black bg-[var(--color-neo-yellow)]">
                <Tag className="w-2.5 h-2.5 inline mr-1" />REPORT ATTACHED
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/forum/${post.id}`}>
            <h2 className="text-base font-black font-mono leading-snug group-hover:text-[var(--color-neo-pink)] transition-colors line-clamp-2 mb-2">
              {post.title}
            </h2>
          </Link>

          {/* Body preview */}
          {post.body && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3 font-mono">{post.body}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 text-xs font-mono text-gray-500 flex-wrap">
            {/* Avatar */}
            <div className="flex items-center gap-1.5">
              {post.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author_avatar} alt="" className="w-5 h-5 rounded-full border-[2px] border-black object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full border-[2px] border-black bg-[var(--color-neo-green)]" />
              )}
              <span className="font-bold text-black">{post.author_username}</span>
            </div>
            <span>·</span>
            <span>{formatDistanceToNow(post.created_at)}</span>
            <Link
              href={`/forum/${post.id}`}
              className="flex items-center gap-1 hover:text-[var(--color-neo-blue)] transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              {post.comment_count} comments
            </Link>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 ml-auto transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
