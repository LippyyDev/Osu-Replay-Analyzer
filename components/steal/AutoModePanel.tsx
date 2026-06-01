'use client';

import { BeatmapInfo, LeaderboardScore, SimilarityResult } from '@/lib/types';
import { Loader2, Zap, Users, CheckCircle2, XCircle, AlertTriangle, SkipForward } from 'lucide-react';

interface AutoModePanelProps {
  beatmapInfo: BeatmapInfo | null;
  isLoggedIn: boolean;
  isScanning: boolean;
  progress: { current: number; total: number; currentUsername?: string };
  results: SimilarityResult[];
  errors: string[];
  onStart: () => void;
  onCancel: () => void;
}

const VERDICT_DOT: Record<string, string> = {
  'SANGAT MIRIP':   'bg-red-500',
  'MUNGKIN DICURI': 'bg-orange-500',
  'MIRIP':          'bg-yellow-500',
  'BERBEDA':        'bg-green-500',
};

export default function AutoModePanel({
  beatmapInfo,
  isLoggedIn,
  isScanning,
  progress,
  results,
  errors,
  onStart,
  onCancel,
}: AutoModePanelProps) {
  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const highMatches = results.filter(
    (r) => r.verdict === 'SANGAT MIRIP' || r.verdict === 'MUNGKIN DICURI'
  ).length;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Auto Mode — Leaderboard Scan</p>
            <p className="text-xs text-white/30">
              Bandingkan dengan top 100 replay di beatmap ini
            </p>
          </div>
        </div>

        {results.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-white/60">{results.length} / {progress.total} scanned</span>
          </div>
        )}
      </div>

      {/* Beatmap info */}
      {beatmapInfo && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-xs font-semibold text-white/70 truncate">
            {beatmapInfo.artist} — {beatmapInfo.title}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            [{beatmapInfo.version}] · {beatmapInfo.starRating.toFixed(2)}★ · OD{beatmapInfo.od}
          </p>
        </div>
      )}

      {/* Not logged in */}
      {!isLoggedIn && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Login diperlukan</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Mode Auto memerlukan login OAuth osu! untuk download replay dari leaderboard.
              Klik tombol &quot;Login osu!&quot; di navbar.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isScanning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              {progress.currentUsername
                ? `Menganalisis: ${progress.currentUsername}`
                : 'Mengambil daftar score...'}
            </div>
            <span className="text-white/40 font-mono">{pct}%</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-white/25 text-right">
            {progress.current} / {progress.total} replay
          </p>
        </div>
      )}

      {/* Live results list */}
      {results.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${VERDICT_DOT[r.verdict]}`} />
              <span className="text-xs text-white/70 flex-1 truncate">{r.comparedLabel}</span>
              <span className="text-xs font-mono font-semibold text-white/50 shrink-0">
                {r.overallSimilarity}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400 font-semibold">{errors.length} replay gagal didownload</span>
          </div>
          {errors.slice(0, 3).map((e, i) => (
            <p key={i} className="text-[10px] text-white/30 pl-5">{e}</p>
          ))}
          {errors.length > 3 && (
            <p className="text-[10px] text-white/20 pl-5">...dan {errors.length - 3} lainnya</p>
          )}
        </div>
      )}

      {/* High match summary */}
      {results.length > 0 && !isScanning && highMatches > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/5 border border-red-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-white/70">
            <span className="text-red-400 font-bold">{highMatches} match mencurigakan</span> ditemukan dari {results.length} replay yang dianalisis.
          </p>
        </div>
      )}

      {results.length > 0 && !isScanning && highMatches === 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-green-500/5 border border-green-500/20 p-3">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs text-white/70">
            Tidak ada kesamaan mencurigakan dari <span className="text-green-400 font-bold">{results.length} replay</span> yang dianalisis.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isScanning ? (
          <button
            onClick={onStart}
            disabled={!isLoggedIn || !beatmapInfo}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 hover:border-violet-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" />
            {results.length > 0 ? 'Scan Ulang' : 'Mulai Auto Scan'}
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Hentikan Scan
          </button>
        )}
      </div>
    </div>
  );
}
