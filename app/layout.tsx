import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'osu! Cheat Detector — Relax Hack & Replay Stealing',
  description:
    'Deteksi penggunaan Relax hack dan replay stealing pada osu!standard. Analisis holdtime, hit error, aim similarity, dan metrik lainnya dari file .osr atau CSV.',
  keywords: ['osu', 'cheat detector', 'relax hack', 'replay analyzer', 'replay stealing', 'osu replay'],
  openGraph: {
    title: 'osu! Cheat Detector',
    description: 'Analisis replay untuk deteksi Relax hack dan Replay Stealing',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#0a0a0f] text-white font-sans" suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}

