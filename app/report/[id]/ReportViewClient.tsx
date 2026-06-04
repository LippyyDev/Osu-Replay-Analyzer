'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AnalysisResultView from '@/components/relax/AnalysisResult';
import { AnalysisResult, AnalysisWarning } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/utils/timeFormat';
import { Share2, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { OsrData } from '@/lib/context/ReplayContext';

interface SavedReport {
  id: string;
  slug: string | null;
  relax_result: AnalysisResult;
  relax_warnings: AnalysisWarning[];
  osr_data: OsrData | null;
  filename: string | null;
  player_name: string | null;
  beatmap_title: string | null;
  created_at: string;
}

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/report/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setReport(d?.report ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Read-only view — go home on reset
  const handleReset = () => { window.location.href = '/'; };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 border-[2px] border-black rounded-xl" />
          <div className="h-40 bg-gray-100 border-[3px] border-black rounded-2xl" />
          <div className="h-60 bg-gray-100 border-[3px] border-black rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-12">
          <p className="text-4xl font-black font-mono mb-4">404</p>
          <p className="text-lg font-black font-mono mb-2">REPORT NOT FOUND</p>
          <p className="text-sm font-mono text-gray-500 mb-8">
            This report may have been deleted or the link is incorrect.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-neo-yellow)] font-black font-mono text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:bg-yellow-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> GO HOME
          </Link>
        </div>
      </main>
    );
  }

  // Use slug URL if available, otherwise UUID
  const shareUrl = report.slug
    ? `${window.location.origin}/report/${report.slug}`
    : window.location.href;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Shared Report Banner */}
      <div className="mb-6 bg-[var(--color-neo-yellow)] border-[3px] border-black rounded-2xl shadow-[4px_4px_0_0_#000] px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Share2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-black font-mono">SHARED REPLAY ANALYSIS</p>
            <p className="text-xs font-mono text-black/60">
              {report.player_name && <span className="font-bold">{report.player_name}</span>}
              {report.beatmap_title && (
                <span> · {report.beatmap_title}</span>
              )}
              {!report.player_name && !report.beatmap_title && report.filename && (
                <span>{report.filename}</span>
              )}
              <span className="ml-2">· {formatDistanceToNow(report.created_at)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black font-mono bg-black text-white border-[2px] border-black rounded-xl shadow-[2px_2px_0_0_#333] hover:bg-gray-900 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            {copied ? '✓ COPIED!' : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                COPY LINK
              </>
            )}
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-xs font-black font-mono bg-white border-[2px] border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            HOME
          </Link>
        </div>
      </div>

      {/* The full analysis view (read-only) */}
      <AnalysisResultView
        result={report.relax_result}
        warnings={report.relax_warnings ?? []}
        onReset={handleReset}
        osrData={report.osr_data ?? undefined}
        isSharedView
      />

      {/* Hidden share URL for OG reference */}
      <span className="sr-only">{shareUrl}</span>
    </main>
  );
}
