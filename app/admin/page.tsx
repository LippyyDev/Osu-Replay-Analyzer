'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from '@/lib/utils/timeFormat';
import PostCard, { type PostMeta } from '@/components/forum/PostCard';
import { Users, FileText, MessageSquare, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'posts' | 'users';

interface AdminUser {
  id: string;
  username: string;
  avatar_url: string | null;
  osu_username: string | null;
  google_email: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('posts');

  // Posts
  const [posts, setPosts]           = useState<PostMeta[]>([]);
  const [postPage, setPostPage]     = useState(1);
  const [postsFetching, setPostsFetching] = useState(false);

  // Users
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [usersFetching, setUsersFetching] = useState(false);
  const [usersPage, setUsersPage]   = useState(1);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace('/forum');
    }
  }, [user, loading, router]);

  // Fetch posts
  useEffect(() => {
    if (!user?.is_admin) return;
    setPostsFetching(true);
    fetch(`/api/forum/posts?sort=new&page=${postPage}&limit=20`)
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []))
      .finally(() => setPostsFetching(false));
  }, [postPage, user]);

  // Fetch users
  useEffect(() => {
    if (!user?.is_admin || tab !== 'users') return;
    setUsersFetching(true);
    fetch(`/api/admin/users?page=${usersPage}`)
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setUsersFetching(false));
  }, [usersPage, user, tab]);

  const handleDeletePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  const handleToggleAdmin = async (userId: string, currentVal: boolean) => {
    const updated = !currentVal;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_admin: updated }),
    });
    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, is_admin: updated } : u)
    );
  };

  if (loading || !user?.is_admin) {
    return <div className="max-w-5xl mx-auto p-8 font-mono text-center animate-pulse">Loading...</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 pt-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--color-neo-red)] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0_0_#000]">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black font-mono">ADMIN DASHBOARD</h1>
          <p className="text-xs font-mono text-gray-500">Logged in as {user.username}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-[3px] border-black pb-3">
        <button
          onClick={() => setTab('posts')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl transition-all
            ${tab === 'posts' ? 'bg-black text-white' : 'bg-white hover:bg-[var(--color-neo-yellow)]'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          ALL POSTS
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl transition-all
            ${tab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-[var(--color-neo-yellow)]'}`}
        >
          <Users className="w-3.5 h-3.5" />
          USERS
        </button>
      </div>

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div>
          {postsFetching ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 border-[3px] border-black rounded-2xl animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 border-[3px] border-dashed border-black rounded-2xl">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-mono font-bold text-gray-500">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPostPage(p => Math.max(1, p - 1))}
              disabled={postPage === 1 || postsFetching}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl bg-white hover:bg-[var(--color-neo-yellow)] disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> PREV
            </button>
            <span className="text-sm font-mono font-bold">Page {postPage}</span>
            <button
              onClick={() => setPostPage(p => p + 1)}
              disabled={posts.length < 20 || postsFetching}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl bg-white hover:bg-[var(--color-neo-yellow)] disabled:opacity-40 transition-all"
            >
              NEXT <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          {usersFetching ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 border-[2px] border-black rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0_0_#000] overflow-hidden">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b-[3px] border-black bg-[var(--color-neo-bg)]">
                    <th className="text-left px-4 py-3 font-black text-xs">USER</th>
                    <th className="text-left px-4 py-3 font-black text-xs hidden md:table-cell">ACCOUNTS</th>
                    <th className="text-left px-4 py-3 font-black text-xs hidden sm:table-cell">JOINED</th>
                    <th className="text-center px-4 py-3 font-black text-xs">ADMIN</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={`border-b-[2px] border-black/20 hover:bg-[var(--color-neo-bg)] transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full border-[2px] border-black object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-[2px] border-black bg-[var(--color-neo-green)]" />
                          )}
                          <span className="font-bold truncate max-w-[120px]">{u.username}</span>
                          {u.is_admin && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-[var(--color-neo-red)] text-white rounded border border-red-800">ADMIN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {u.osu_username && <span>🎵 {u.osu_username}</span>}
                          {u.google_email && <span>📧 {u.google_email}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                        {formatDistanceToNow(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.id !== user.sub ? (
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                            className={`px-3 py-1 text-[10px] font-black font-mono border-[2px] border-black rounded-lg transition-all
                              ${u.is_admin
                                ? 'bg-[var(--color-neo-red)] text-white hover:brightness-110'
                                : 'bg-white hover:bg-[var(--color-neo-yellow)]'
                              }`}
                          >
                            {u.is_admin ? 'REVOKE' : 'GRANT'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">YOU</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 font-mono text-gray-400">No users found</div>
              )}
            </div>
          )}

          {/* User Pagination */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setUsersPage(p => Math.max(1, p - 1))}
              disabled={usersPage === 1}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl bg-white hover:bg-[var(--color-neo-yellow)] disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> PREV
            </button>
            <span className="text-sm font-mono font-bold">Page {usersPage}</span>
            <button
              onClick={() => setUsersPage(p => p + 1)}
              disabled={users.length < 50}
              className="flex items-center gap-1 px-4 py-2 text-xs font-black font-mono border-[3px] border-black rounded-xl bg-white hover:bg-[var(--color-neo-yellow)] disabled:opacity-40 transition-all"
            >
              NEXT <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
