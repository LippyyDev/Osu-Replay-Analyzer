'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Send } from 'lucide-react';

interface CommentFormProps {
  postId: string;
  onSubmit: (comment: unknown) => void;
  onLoginRequest: () => void;
}

export default function CommentForm({ postId, onSubmit, onLoginRequest }: CommentFormProps) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="bg-[var(--color-neo-bg)] border-[3px] border-black rounded-xl p-4 text-center">
        <p className="text-sm font-mono font-bold mb-3">Join the discussion</p>
        <button
          onClick={onLoginRequest}
          className="px-6 py-2 bg-[var(--color-neo-pink)] text-white font-black font-mono text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Login to Comment
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        onSubmit(comment);
        setBody('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-[3px] border-black rounded-xl p-4 shadow-[3px_3px_0_0_#000]">
      <div className="flex items-center gap-2 mb-3">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border-[2px] border-black object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full border-[2px] border-black bg-[var(--color-neo-green)]" />
        )}
        <span className="text-sm font-black font-mono">{user.username}</span>
      </div>
      <textarea
        className="w-full border-[2px] border-black rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-black"
        rows={3}
        placeholder="Add a comment..."
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
        }}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-black text-white font-black font-mono text-sm border-[2px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-gray-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </div>
  );
}
