'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import AuthModal from '@/components/forum/AuthModal';
import { Send, Tag, X } from 'lucide-react';

type ReportType = 'relax' | 'steal' | null;

export default function CreatePostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle]             = useState('');
  const [body, setBody]               = useState('');
  const [reportType, setReportType]   = useState<ReportType>(null);
  const [reportData, setReportData]   = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [showAuth, setShowAuth]       = useState(false);

  // Try loading pending report from sessionStorage (set by analysis pages)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('forum_pending_report');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed.report_type) setReportType(parsed.report_type);
        if (parsed.report_data) setReportData(parsed.report_data);
        if (parsed.title)       setTitle(parsed.title);
        sessionStorage.removeItem('forum_pending_report');
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!title.trim()) { setError('Title is required'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       title.trim(),
          body:        body.trim() || null,
          report_type: reportType,
          report_data: reportData,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to post');
        return;
      }
      const { post } = await res.json();
      router.push(`/forum/${post.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center font-mono animate-pulse">Loading...</div>;
  }

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xl font-black font-mono mb-6">You need to be logged in to post</p>
        <button
          onClick={() => setShowAuth(true)}
          className="px-6 py-3 bg-[var(--color-neo-pink)] text-white font-black font-mono border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:brightness-110 transition-all"
        >
          LOGIN TO POST
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2">
      <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black font-mono mb-6">CREATE A POST</h1>

      <div className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-6 space-y-5">

        {/* Report Type Tag */}
        <div>
          <label className="block text-xs font-black font-mono mb-2">ATTACH REPORT (OPTIONAL)</label>
          <div className="flex gap-2 flex-wrap">
            {(['relax', 'steal'] as ReportType[]).map(type => (
              <button
                key={type!}
                onClick={() => setReportType(prev => prev === type ? null : type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black font-mono border-[2px] border-black rounded-lg transition-all
                  ${reportType === type
                    ? type === 'relax' ? 'bg-[var(--color-neo-pink)] text-white' : 'bg-[var(--color-neo-blue)] text-white'
                    : 'bg-white hover:bg-[var(--color-neo-yellow)]'
                  }`}
              >
                <Tag className="w-3 h-3" />
                {type!.toUpperCase()}
              </button>
            ))}
            {reportData && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black font-mono border-[2px] border-black rounded-lg bg-[var(--color-neo-yellow)]">
                DATA ATTACHED
                <button onClick={() => setReportData(null)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {reportData && (
            <p className="text-xs font-mono text-gray-500 mt-1">
              Analysis data from your session will be embedded in this post.
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-black font-mono mb-2">TITLE *</label>
          <input
            type="text"
            maxLength={200}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Describe your post..."
            className="w-full border-[3px] border-black rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <div className="text-right text-xs font-mono text-gray-400 mt-1">{title.length}/200</div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-black font-mono mb-2">BODY (OPTIONAL)</label>
          <textarea
            rows={8}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your findings, context, or discussion..."
            className="w-full border-[3px] border-black rounded-xl px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {error && (
          <p className="text-sm font-mono text-red-600 bg-red-50 border-[2px] border-red-400 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-black font-mono text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-gray-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'POST'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white font-black font-mono text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-gray-100 transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    </main>
  );
}
