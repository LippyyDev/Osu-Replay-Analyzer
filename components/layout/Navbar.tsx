'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, LogIn, LogOut, User, Shield, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import AuthModal from '@/components/forum/AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  const isHome   = pathname === '/';
  const isRelax  = pathname === '/relax' || pathname?.startsWith('/relax/');
  const isSteal  = pathname === '/steal' || pathname?.startsWith('/steal/');
  const isForum  = pathname === '/forum' || pathname?.startsWith('/forum/');
  const isAdmin  = pathname?.startsWith('/admin');

  const navLink = (href: string, label: string, active: boolean, activeColor: string) => (
    <Link
      href={href}
      className={`px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-black font-mono transition-all duration-200
                  border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] whitespace-nowrap
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
        active
          ? `${activeColor} text-white`
          : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-3 z-50 px-3 sm:px-6 lg:px-8 mb-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16 bg-[var(--color-neo-bg)]
                          border-[3px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] px-3 sm:px-6 gap-2">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-neo-yellow)] border-[3px] border-black rounded-xl
                              flex items-center justify-center shrink-0
                              group-hover:bg-[var(--color-neo-pink)] transition-colors">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-black group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-black text-black tracking-tight font-mono hidden sm:block">
                OSU REPLAY ANALYZER
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {navLink('/', 'HOME', isHome, 'bg-black')}
              {navLink('/relax', 'RELAX', isRelax, 'bg-[var(--color-neo-pink)]')}
              {navLink('/steal', 'STEAL', isSteal, 'bg-[var(--color-neo-blue)]')}
              <Link
                href="/forum"
                className={`flex items-center gap-1 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-black font-mono transition-all duration-200
                            border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] whitespace-nowrap
                            active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  isForum
                    ? 'bg-[var(--color-neo-green)] text-black'
                    : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="hidden sm:inline">FORUM</span>
              </Link>
            </nav>

            {/* Auth area */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {loading ? (
                <div className="w-8 h-8 border-[2px] border-black rounded-full bg-gray-100 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  {user.is_admin && (
                    <Link
                      href="/admin"
                      title="Admin Dashboard"
                      className={`flex items-center justify-center w-8 h-8 border-[2px] border-black rounded-lg transition-all ${
                        isAdmin ? 'bg-[var(--color-neo-red)] text-white' : 'bg-white hover:bg-[var(--color-neo-red)] hover:text-white'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </Link>
                  )}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-7 h-7 object-cover border-[2px] border-black rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-[var(--color-neo-green)] flex items-center justify-center border-[2px] border-black rounded-full">
                        <User className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                    <span className="text-xs font-bold font-mono hidden sm:block truncate max-w-[80px]">
                      {user.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      title="Logout"
                      className="flex items-center gap-1 p-1 md:px-2 md:py-1 text-xs font-bold bg-[var(--color-neo-red)] text-white border-[2px] border-black rounded-lg hover:brightness-110 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden md:inline text-[10px]">OUT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold font-mono bg-[var(--color-neo-green)] text-black border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:bg-green-400 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">LOGIN</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
