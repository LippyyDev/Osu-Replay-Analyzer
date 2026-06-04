'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import VoteButton from '@/components/forum/VoteButton';
import CommentThread, { type CommentNode } from '@/components/forum/CommentThread';
import CommentForm from '@/components/forum/CommentForm';
import AuthModal from '@/components/forum/AuthModal';
import ReportEmbed from '@/components/forum/ReportEmbed';
import { formatDistanceToNow } from '@/lib/utils/timeFormat';
import { type PostMeta } from '@/components/forum/PostCard';
import Link from 'next/link';
import { ArrowLeft, Trash2, Tag } from 'lucide-react';
import { linkify, extractReportUrls } from '@/lib/linkify';
import ReportLinkPreview from '@/components/forum/ReportLinkPreview';

export default function ThreadPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();

  const [post, setPost]         = useState<PostMeta | null>(null);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [upvotes, setUpvotes]   = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [postRes, commentRes] = await Promise.all([
        fetch(`/api/forum/posts/${id}`),
        fetch(`/api/forum/posts/${id}/comments`),
      ]);
      if (postRes.ok) {
        const { post: p, userVote: v } = await postRes.json();
        setPost(p);
        setUpvotes(p.upvotes);
        setDownvotes(p.downvotes);
        setUserVote(v ?? null);
      }
      if (commentRes.ok) {
        const { comments: c } = await commentRes.json();
        setComments(c ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleVote = async (value: 1 | -1) => {
    if (!user) { setShowAuth(true); return; }
    const prev = userVote;
    const prevUp = upvotes, prevDown = downvotes;

    if (userVote === value) {
      setUserVote(null);
      if (value === 1) setUpvotes(u => u - 1); else setDownvotes(d => d - 1);
    } else {
      if (userVote === 1) setUpvotes(u => u - 1);
      if (userVote === -1) setDownvotes(d => d - 1);
      setUserVote(value);
      if (value === 1) setUpvotes(u => u + 1); else setDownvotes(d => d + 1);
    }

    const res = await fetch(`/api/forum/posts/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) { setUserVote(prev); setUpvotes(prevUp); setDownvotes(prevDown); }
  };

  const handleCommentAdded = (newComment: CommentNode, parentId: string | null) => {
    if (!parentId) {
      setComments(prev => [...prev, newComment]);
    } else {
      const insertIntoTree = (nodes: CommentNode[]): CommentNode[] =>
        nodes.map(n =>
          n.id === parentId
            ? { ...n, children: [...n.children, newComment] }
            : { ...n, children: insertIntoTree(n.children) }
        );
      setComments(prev => insertIntoTree(prev));
    }
  };

  const handleCommentDeleted = (commentId: string) => {
    const removeFromTree = (nodes: CommentNode[]): CommentNode[] =>
      nodes
        .filter(n => n.id !== commentId)
        .map(n => ({ ...n, children: removeFromTree(n.children) }));
    setComments(prev => removeFromTree(prev));
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/forum/posts/${id}`, { method: 'DELETE' });
    router.push('/forum');
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-60 bg-gray-100 border-[3px] border-black rounded-2xl animate-pulse mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 border-[2px] border-black rounded-xl animate-pulse" />)}
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-2xl font-black font-mono">POST NOT FOUND</p>
        <Link href="/forum" className="mt-4 inline-block text-sm font-mono underline">Back to forum</Link>
      </main>
    );
  }

  const score = upvotes - downvotes;
  const canDelete = user && (user.sub === post.user_id || user.is_admin);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2">
      {/* Back */}
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm font-mono font-bold mb-6 hover:text-[var(--color-neo-pink)] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to forum
      </Link>

      {/* Post */}
      <article className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] mb-8 overflow-hidden">
        <div className="flex">
          {/* Vote Sidebar */}
          <div className="flex flex-col items-center gap-2 px-4 py-6 bg-[var(--color-neo-bg)] border-r-[3px] border-black min-w-[68px]">
            <VoteButton direction="up" active={userVote === 1} onClick={() => handleVote(1)} disabled={!user} />
            <span className={`text-lg font-black font-mono tabular-nums ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {score}
            </span>
            <VoteButton direction="down" active={userVote === -1} onClick={() => handleVote(-1)} disabled={!user} />
          </div>

          {/* Content */}
          <div className="flex-1 p-6 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {post.report_type && (
                <span className={`text-[11px] font-black font-mono px-2 py-0.5 border-[2px] border-black rounded-md ${
                  post.report_type === 'relax' ? 'bg-[var(--color-neo-pink)] text-white' : 'bg-[var(--color-neo-blue)] text-white'
                }`}>
                  {post.report_type.toUpperCase()}
                </span>
              )}
              {post.report_data && (
                <span className="text-[11px] font-black font-mono px-2 py-0.5 border-[2px] border-black rounded-md bg-[var(--color-neo-yellow)]">
                  <Tag className="w-2.5 h-2.5 inline mr-1" />REPORT ATTACHED
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black font-mono mb-4 leading-snug">{post.title}</h1>

            {/* Author */}
            <div className="flex items-center gap-2 mb-5">
              {post.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author_avatar} alt="" className="w-8 h-8 rounded-full border-[2px] border-black object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full border-[2px] border-black bg-[var(--color-neo-green)]" />
              )}
              <div>
                <span className="text-sm font-black font-mono">{post.author_username}</span>
                <span className="text-xs font-mono text-gray-400 ml-2">{formatDistanceToNow(post.created_at)}</span>
              </div>
              {canDelete && (
                <button
                  onClick={handleDeletePost}
                  className="ml-auto flex items-center gap-1.5 text-xs font-mono font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete post
                </button>
              )}
            </div>

            {/* Body */}
            {post.body && (
              <div className="font-mono text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed text-sm">
                {linkify(post.body)}
              </div>
            )}

            {/* Report link preview cards — auto-rendered for every /report/ URL in body */}
            {post.body && extractReportUrls(post.body).map(url => (
              <ReportLinkPreview key={url} url={url} />
            ))}

            {/* Report Embed */}
            {post.report_data && post.report_type && (
              <div className="mt-4">
                <ReportEmbed
                  reportData={post.report_data}
                  reportType={post.report_type}
                />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments section */}
      <section>
        <h2 className="text-xl font-black font-mono mb-4">
          {comments.length} COMMENT{comments.length !== 1 ? 'S' : ''}
        </h2>
        <div className="mb-6">
          <CommentForm
            postId={id}
            onSubmit={(c) => handleCommentAdded(c as CommentNode, null)}
            onLoginRequest={() => setShowAuth(true)}
          />
        </div>
        {comments.length > 0 ? (
          <CommentThread
            comments={comments}
            postId={id}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
          />
        ) : (
          <div className="text-center py-12 border-[3px] border-black border-dashed rounded-xl">
            <p className="font-mono text-gray-500">No comments yet. Be the first!</p>
          </div>
        )}
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
