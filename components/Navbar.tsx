'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Search, LogIn, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OsuSession {
  userId: number;
  username: string;
  avatarUrl: string | null;
}

function readSessionCookie(): OsuSession | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/osu_user_session=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<OsuSession | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setSession(readSessionCookie());
  }, [pathname]); // refresh on navigation

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/osu/logout', { method: 'POST' });
    setSession(null);
    setLoggingOut(false);
  };

  const isSteal = pathname === '/steal' || pathname?.startsWith('/steal');

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-md shadow-pink-500/30 shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white hidden sm:block">osu! Cheat Detector</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                !isSteal
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/25'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Relax Detector
            </Link>

            <Link
              href="/steal"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                isSteal
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Steal Checker
            </Link>
          </nav>

          {/* OAuth section — only relevant on /steal */}
          <div className="flex items-center gap-2">
            {isSteal && (
              <>
                {session ? (
                  <div className="flex items-center gap-2">
                    {session.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.avatarUrl}
                        alt={session.username}
                        className="w-6 h-6 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-violet-400" />
                      </div>
                    )}
                    <span className="text-xs text-white/60 hidden sm:block">{session.username}</span>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] text-white/30 border border-white/5 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
                      title="Logout dari osu!"
                    >
                      <LogOut className="w-3 h-3" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  <a
                    href="/api/osu/oauth"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login osu! <span className="text-violet-400/50">(Auto Mode)</span>
                  </a>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
