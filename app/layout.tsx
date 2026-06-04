import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { ReplayProvider } from '@/lib/context/ReplayContext';
import { AuthProvider } from '@/lib/context/AuthContext';

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'osu! Replay Analyzer — Relax Hack & Replay Stealing',
  description:
    'Detect Relax hack and replay stealing in osu! standard. Analyze holdtime, hit error, aim similarity, and other metrics from .osr files or CSV exports.',
  keywords: ['osu', 'cheat detector', 'relax hack', 'replay analyzer', 'replay stealing', 'osu replay'],
  openGraph: {
    title: 'osu! Replay Analyzer',
    description: 'Analyze osu! replays to detect Relax hack and Replay Stealing.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={workSans.variable} suppressHydrationWarning>
      <body
        className="antialiased bg-[#f4f4f0] text-[#1e1e1e] font-sans selection:bg-[#ff69b4] selection:text-white"
        suppressHydrationWarning
      >
        <AuthProvider>
          <ReplayProvider>
            <Navbar />
            {children}
            <footer className="border-t-[3px] border-black mt-20 py-8 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center font-mono text-sm font-bold">
                <p>osu! Replay Analyzer — Supports .osr and .csv files</p>
                <p className="mt-2 bg-[var(--color-neo-yellow)] inline-block px-2 py-1 brutal-border shadow-[2px_2px_0_0_#000]">
                  For educational purposes only. Results are heuristic.
                </p>
              </div>
            </footer>
          </ReplayProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
