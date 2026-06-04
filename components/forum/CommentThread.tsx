'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { formatDistanceToNow } from '@/lib/utils/timeFormat';
import { Trash2, Reply } from 'lucide-react';
import { linkify } from '@/lib/linkify';

interface CommentUser {
  username: string;
  avatar_url: string | null;
  osu_username: string | null;
}

export interface CommentNode {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  users: CommentUser | null;
  children: CommentNode[];
}

interface CommentThreadProps {
  comments: CommentNode[];
  postId: string;
  depth?: number;
  onCommentAdded: (comment: CommentNode, parentId: string | null) => void;
  onCommentDeleted: (id: string) => void;
}

function CommentItem({
  comment,
  postId,
  depth,
  onCommentAdded,
  onCommentDeleted,
}: {
  comment: CommentNode;
  postId: string;
  depth: number;
  onCommentAdded: (comment: CommentNode, parentId: string | null) => void;
  onCommentDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canDelete = user && (user.sub === comment.user_id || user.is_admin);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText, parent_id: comment.id }),
      });
      if (res.ok) {
        const { comment: newComment } = await res.json();
        onCommentAdded(newComment, comment.id);
        setReplyText('');
        setReplying(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    await fetch(`/api/forum/comments/${comment.id}`, { method: 'DELETE' });
    onCommentDeleted(comment.id);
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-[3px] border-black pl-4' : ''}`}>
      <div className="bg-white border-[2px] border-black rounded-xl p-3 mb-2 hover:shadow-[2px_2px_0_0_#000] transition-shadow">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          {comment.users?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.users.avatar_url}
              alt=""
              className="w-6 h-6 rounded-full border-[2px] border-black object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full border-[2px] border-black bg-[var(--color-neo-green)]" />
          )}
          <span className="text-sm font-black font-mono">{comment.users?.username ?? 'User'}</span>
          <span className="text-xs font-mono text-gray-400 ml-auto">
            {formatDistanceToNow(comment.created_at)}
          </span>
        </div>

        {/* Body */}
        <p className="text-sm font-mono text-gray-700 whitespace-pre-wrap">{linkify(comment.body)}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          {user && depth < 4 && (
            <button
              onClick={() => setReplying(r => !r)}
              className="flex items-center gap-1 text-xs font-mono font-bold text-gray-500 hover:text-[var(--color-neo-blue)] transition-colors"
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs font-mono font-bold text-red-400 hover:text-red-600 ml-auto transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Reply form */}
      {replying && (
        <div className="mb-3 ml-2">
          <textarea
            className="w-full border-[2px] border-black rounded-lg p-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-black"
            rows={2}
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleReply}
              disabled={submitting || !replyText.trim()}
              className="px-3 py-1 text-xs font-black font-mono bg-black text-white rounded-lg border-[2px] border-black hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
            <button
              onClick={() => { setReplying(false); setReplyText(''); }}
              className="px-3 py-1 text-xs font-bold font-mono bg-white rounded-lg border-[2px] border-black hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nested children */}
      {comment.children.length > 0 && (
        <div className="mt-1">
          {comment.children.map(child => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              depth={depth + 1}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({
  comments,
  postId,
  depth = 0,
  onCommentAdded,
  onCommentDeleted,
}: CommentThreadProps) {
  return (
    <div className="flex flex-col gap-2">
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          depth={depth}
          onCommentAdded={onCommentAdded}
          onCommentDeleted={onCommentDeleted}
        />
      ))}
    </div>
  );
}
