'use client';

/**
 * components/forum/ReportLinkPreview.tsx
 *
 * Auto-fetches a /report/ URL and renders a rich preview card.
 * Shown below forum post/comment body when a report link is detected.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

interface ReportMeta {
  id: string;
  slug: string | null;
  player_name: string | null;
  beatmap_title: string | null;
  osr_data: {
    beatmapInfo?: { beatmapSetId?: number; starRating?: number; version?: string };
    replayInfo?: { mods?: number };
  } | null;
  relax_result: {
    verdict?: string;
    verdictColor?: string;
    scores?: { finalScore?: number };
  } | null;
}

interface Props {
  /** Full URL, e.g. http://localhost:3000/report/itzkaguya-padoru */
  url: string;
}

// Extract the report id/slug from a /report/<id> URL
function extractReportId(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/report\/([^/]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function VerdictBadge({ verdict, color }: { verdict: string; color?: string }) {
  const isCheat   = color === 'red'    || verdict.includes('CHEAT');
  const isSuspect = color === 'yellow' || verdict.includes('ABU');
  const isClean   = !isCheat && !isSuspect;

  const cls = isCheat
    ? 'bg-red-500 text-white'
    : isSuspect
    ? 'bg-yellow-400 text-black'
    : 'bg-green-500 text-white';

  const Icon = isCheat ? ShieldAlert : isSuspect ? ShieldQuestion : ShieldCheck;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black font-mono border-[2px] border-black rounded-md ${cls}`}>
      <Icon className="w-3 h-3" />
      {verdict}
    </span>
  );
}

export default function ReportLinkPreview({ url }: Props) {
  const [report, setReport] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const reportId = extractReportId(url);

  useEffect(() => {
    if (!reportId) { setLoading(false); setError(true); return; }
    fetch(`/api/report/${reportId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.report) setReport(d.report);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (!reportId || error) return null;

  const beatmapSetId = report?.osr_data?.beatmapInfo?.beatmapSetId;
  const coverUrl     = beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/cover@2x.jpg`
    : null;

  const reportPath = report?.slug
    ? `/report/${report.slug}`
    : `/report/${report?.id ?? reportId}`;

  const verdict      = report?.relax_result?.verdict;
  const verdictColor = report?.relax_result?.verdictColor;
  const score        = report?.relax_result?.scores?.finalScore;
  const stars        = report?.osr_data?.beatmapInfo?.starRating;
  const diff         = report?.osr_data?.beatmapInfo?.version;

  if (loading) {
    return (
      <div className="mt-3 border-[2px] border-black rounded-xl overflow-hidden animate-pulse bg-gray-100 h-20" />
    );
  }

  if (!report) return null;

  return (
    <Link
      href={reportPath}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-3 flex overflow-hidden border-[2px] border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-[5px_5px_0_0_#000] transition-all bg-white"
      onClick={e => e.stopPropagation()}
    >
      {/* Cover image */}
      {coverUrl && (
        <div className="relative shrink-0 w-28 sm:w-36 overflow-hidden border-r-[2px] border-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt="beatmap cover"
            className="w-full h-full object-cover object-center grayscale-[20%] contrast-110 brightness-90 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black font-mono text-black/40 uppercase tracking-widest mb-0.5">
              osu! Replay Analysis
            </p>
            <p className="text-sm font-black font-mono text-black truncate leading-snug">
              {report.player_name ?? 'Unknown Player'}
            </p>
            <p className="text-xs font-mono text-gray-500 truncate">
              {report.beatmap_title ?? 'Unknown Beatmap'}
              {diff && <span className="text-gray-400"> [{diff}]</span>}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5 group-hover:text-black transition-colors" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {verdict && (
            <VerdictBadge verdict={verdict} color={verdictColor} />
          )}
          {score != null && (
            <span className="text-[10px] font-mono font-bold text-gray-500 border-[2px] border-black/20 rounded px-1.5 py-0.5">
              Score: {score.toFixed(1)}/100
            </span>
          )}
          {stars != null && (
            <span className="text-[10px] font-mono font-bold text-gray-500 border-[2px] border-black/20 rounded px-1.5 py-0.5">
              {stars.toFixed(2)}★
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
