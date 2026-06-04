'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Search, LogIn, LogOut, User, Terminal } from 'lucide-react';
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
    <header className="sticky top-3 z-50 px-4 sm:px-6 lg:px-8 mb-10 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Floating, rounded, pop-up style container */}
        <div className="flex items-center justify-between h-16 bg-[var(--color-neo-bg)] border-[3px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] px-4 md:px-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-neo-yellow)] border-[3px] border-black rounded-xl flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm font-black text-black hidden sm:block tracking-tight font-mono">
              OSU REPLAY ANALYZER
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all duration-200 border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                !isSteal
                  ? 'bg-[var(--color-neo-pink)] text-white'
                  : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
              }`}
            >
              <span className="hidden md:inline">RELAX DETECTOR</span>
              <span className="md:hidden">RELAX</span>
            </Link>

            <Link
              href="/steal"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all duration-200 border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                isSteal
                  ? 'bg-[var(--color-neo-blue)] text-white'
                  : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
              }`}
            >
              <span className="hidden md:inline">STEAL CHECKER</span>
              <span className="md:hidden">STEAL</span>
            </Link>
          </nav>

          {/* OAuth section — only relevant on /steal */}
          <div className="flex items-center gap-2">
            {isSteal && (
              <>
                {session ? (
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                    {session.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.avatarUrl}
                        alt={session.username}
                        className="w-8 h-8 object-cover border-[2px] border-black rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[var(--color-neo-green)] flex items-center justify-center border-[2px] border-black rounded-full">
                        <User className="w-4 h-4 text-black" />
                      </div>
                    )}
                    <span className="text-sm font-bold font-mono hidden sm:block truncate max-w-[100px]">{session.username}</span>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-1.5 p-1.5 md:px-3 md:py-1.5 text-xs font-bold bg-[var(--color-neo-red)] text-white border-[2px] border-black rounded-lg hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                      title="Logout dari osu!"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">LOGOUT</span>
                    </button>
                  </div>
                ) : (
                  <a
                    href="/api/osu/oauth"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-[var(--color-neo-green)] text-black border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:bg-green-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    LOGIN OSU <span className="font-mono text-xs ml-1 opacity-80">(auto mode)</span>
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

