'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { loginWithGoogle, loginWithOsu } = useAuth();
  const [loading, setLoading] = useState<'google' | 'osu' | null>(null);

  const handleGoogle = async () => {
    setLoading('google');
    try {
      await loginWithGoogle();
      onClose();
    } finally {
      setLoading(null);
    }
  };

  const handleOsu = () => {
    setLoading('osu');
    loginWithOsu();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[var(--color-neo-bg)] border-[3px] border-black rounded-2xl shadow-[8px_8px_0_0_#000] p-8 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center font-black text-lg border-[2px] border-black rounded-lg hover:bg-[var(--color-neo-red)] hover:text-white transition-colors"
        >
          ×
        </button>

        <h2 className="text-2xl font-black font-mono mb-2">JOIN THE FORUM</h2>
        <p className="text-sm font-mono text-gray-600 mb-8">
          Sign in to post, comment & vote
        </p>

        <div className="flex flex-col gap-4">
          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={loading !== null}
            className="flex items-center gap-3 px-5 py-3 bg-white border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] font-bold font-mono text-sm
                       hover:bg-[var(--color-neo-yellow)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[2px] bg-black" />
            <span className="font-mono text-xs font-bold">OR</span>
            <div className="flex-1 h-[2px] bg-black" />
          </div>

          {/* osu! Button */}
          <button
            onClick={handleOsu}
            disabled={loading !== null}
            className="flex items-center gap-3 px-5 py-3 bg-[var(--color-neo-pink)] border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] font-bold font-mono text-sm text-white
                       hover:brightness-110 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            <span className="text-xl leading-none font-black">●</span>
            {loading === 'osu' ? 'Redirecting...' : 'Continue with osu!'}
          </button>
        </div>

        <p className="mt-6 text-xs font-mono text-gray-500 text-center">
          You can link both accounts later in your profile
        </p>
      </div>
    </div>
  );
}
