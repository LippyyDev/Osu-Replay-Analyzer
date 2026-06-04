'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import PostCard, { type PostMeta } from '@/components/forum/PostCard';
import AuthModal from '@/components/forum/AuthModal';
import Link from 'next/link';
import { Flame, Clock, TrendingUp, PenSquare, Users } from 'lucide-react';

type SortMode = 'new' | 'hot' | 'top';

const SORT_OPTIONS: { value: SortMode; label: string; icon: React.ElementType }[] = [
  { value: 'hot', label: 'HOT',  icon: Flame },
  { value: 'new', label: 'NEW',  icon: Clock },
  { value: 'top', label: 'TOP',  icon: TrendingUp },
];

export default function ForumPage() {
  const { user, loading } = useAuth();
  const [posts, setPosts]         = useState<PostMeta[]>([]);
  const [sort, setSort]           = useState<SortMode>('hot');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [fetching, setFetching]   = useState(false);
  const [showAuth, setShowAuth]   = useState(false);

  const fetchPosts = useCallback(async (s: SortMode, p: number, reset = false) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/forum/posts?sort=${s}&page=${p}&limit=20`);
      const data = await res.json();
      const newPosts: PostMeta[] = data.posts ?? [];
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 20);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setPosts([]);
    fetchPosts(sort, 1, true);
  }, [sort, fetchPosts]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(sort, next);
  };

  const handleDeletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black font-mono tracking-tight">
            osu! REPLAY FORUM
          </h1>
          <p className="text-sm font-mono text-gray-500 mt-1">
            Share your analysis, discuss replays, call out cheaters
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.is_admin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black font-mono bg-[var(--color-neo-red)] text-white border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:brightness-110 transition-all"
            >
              <Users className="w-4 h-4" />
              ADMIN
            </Link>
          )}
          {user ? (
            <Link
              href="/forum/create"
              className="flex items-center gap-2 px-4 py-2 text-sm font-black font-mono bg-[var(--color-neo-yellow)] border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-yellow-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <PenSquare className="w-4 h-4" />
              NEW POST
            </Link>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-black font-mono bg-[var(--color-neo-yellow)] border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-yellow-300 transition-all"
            >
              <PenSquare className="w-4 h-4" />
              NEW POST
            </button>
          )}
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b-[3px] border-black pb-3">
        {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSort(value)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl transition-all
              ${sort === value
                ? 'bg-black text-white shadow-[2px_2px_0_0_#666]'
                : 'bg-white hover:bg-[var(--color-neo-yellow)]'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-100 border-[3px] border-black rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 && !fetching ? (
        <div className="text-center py-20 border-[3px] border-black border-dashed rounded-2xl">
          <p className="text-2xl font-black font-mono mb-2">NO POSTS YET</p>
          <p className="text-sm font-mono text-gray-500">Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleDeletePost}
            />
          ))}
          {fetching && (
            <div className="h-20 bg-gray-100 border-[3px] border-black rounded-2xl animate-pulse" />
          )}
          {hasMore && !fetching && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 font-black font-mono text-sm border-[3px] border-black rounded-xl bg-white hover:bg-[var(--color-neo-yellow)] shadow-[3px_3px_0_0_#000] transition-all"
            >
              LOAD MORE
            </button>
          )}
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
