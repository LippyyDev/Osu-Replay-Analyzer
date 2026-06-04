'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Zap, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import StealDropzone, { StealFile } from '@/components/steal/StealDropzone';
import SimilarityCard from '@/components/steal/SimilarityCard';
import AutoModePanel from '@/components/steal/AutoModePanel';
import { parseOsrBuffer, parseOsuFile, framesToNotes } from '@/lib/osrParser';
import { parseCSV } from '@/lib/analyzer';
import { fetchBeatmapByMd5, downloadBeatmapOsu } from '@/lib/osuApi';
import { compareSingleReplay, compareReplayBatch, ReplayCompareInput } from '@/lib/stealDetector';
import { BeatmapInfo, LeaderboardScore, ReplayNote, SimilarityResult } from '@/lib/types';
import { useReplay } from '@/lib/context/ReplayContext';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function parseStealFile(file: StealFile): Promise<ReplayCompareInput | null> {
  try {
    if (file.type === 'osr' && file.buffer) {
      const { info, frames } = await parseOsrBuffer(file.buffer);
      return { label: file.name, notes: [], frames };
    } else if (file.type === 'csv' && file.content) {
      const { notes } = parseCSV(file.content);
      return { label: file.name, notes, frames: null };
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'manual' | 'auto';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'loading'; step: string }
  | { phase: 'done'; results: SimilarityResult[] }
  | { phase: 'error'; message: string };

export default function StealPage() {
  const { sharedFile } = useReplay();

  // Mode toggle
  const [mode, setMode] = useState<Mode>('manual');

  // File inputs
  const [targetFile, setTargetFile]       = useState<StealFile | null>(null);
  const [compFiles, setCompFiles]         = useState<StealFile[]>([]);

  // Parsed target info (populated after parsing .osr)
  const [beatmapInfo, setBeatmapInfo]     = useState<BeatmapInfo | null>(null);
  const [targetInput, setTargetInput]     = useState<ReplayCompareInput | null>(null);

  // Manual scan state
  const [scanState, setScanState]         = useState<ScanState>({ phase: 'idle' });

  // Auto mode state
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [autoScanning, setAutoScanning]   = useState(false);
  const [autoProgress, setAutoProgress]   = useState({ current: 0, total: 0, currentUsername: '' });
  const [autoResults, setAutoResults]     = useState<SimilarityResult[]>([]);
  const [autoErrors, setAutoErrors]       = useState<string[]>([]);
  const cancelRef = useRef(false);

  // ── Pre-populate targetFile from shared context ──────────────────────────
  useEffect(() => {
    if (!sharedFile || targetFile) return; // don't overwrite if already set
    if (sharedFile.type === 'osr' && sharedFile.buffer) {
      setTargetFile({ name: sharedFile.name, type: 'osr', buffer: sharedFile.buffer });
    } else if (sharedFile.type === 'csv' && sharedFile.content) {
      setTargetFile({ name: sharedFile.name, type: 'csv', content: sharedFile.content });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFile]);

  // ── Check login status on mount ─────────────────────────────────────────
  useEffect(() => {
    const match = document.cookie.match(/osu_user_session=([^;]+)/);
    setIsLoggedIn(!!match);
  }, []);


  // ── Parse target file when it changes ───────────────────────────────────
  useEffect(() => {
    if (!targetFile) {
      setBeatmapInfo(null);
      setTargetInput(null);
      return;
    }

    let cancelled = false;

    async function parseTarget() {
      if (!targetFile) return;

      if (targetFile.type === 'osr' && targetFile.buffer) {
        try {
          const { info, frames } = await parseOsrBuffer(targetFile.buffer);

          // Fetch beatmap info for display + hit detection
          const bm = await fetchBeatmapByMd5(info.beatmapMd5).catch(() => null);
          if (cancelled) return;
          if (bm) {
            setBeatmapInfo(bm);
            // Download .osu and run hit detection to get notes
            const osuContent = await downloadBeatmapOsu(bm.beatmapId).catch(() => null);
            if (cancelled) return;
            if (osuContent) {
              const beatmap = parseOsuFile(osuContent);
              const notes   = framesToNotes(frames, beatmap, info.mods);
              setTargetInput({ label: info.playerName || targetFile.name, notes, frames });
            } else {
              // No beatmap — frame-only comparison
              setTargetInput({ label: targetFile.name, notes: [], frames });
            }
          } else {
            setTargetInput({ label: targetFile.name, notes: [], frames });
          }
        } catch {
          setTargetInput({ label: targetFile.name, notes: [], frames: null });
        }
      } else if (targetFile.type === 'csv' && targetFile.content) {
        const { notes } = parseCSV(targetFile.content);
        if (!cancelled) setTargetInput({ label: targetFile.name, notes, frames: null });
      }
    }

    parseTarget();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFile]);

  // ── MANUAL SCAN ─────────────────────────────────────────────────────────
  const handleManualScan = useCallback(async () => {
    if (!targetInput || compFiles.length === 0) return;
    setScanState({ phase: 'loading', step: 'Parsing comparison replays...' });

    try {
      const compInputs: ReplayCompareInput[] = [];

      for (const cf of compFiles) {
        setScanState({ phase: 'loading', step: `Parsing ${cf.name}...` });

        if (cf.type === 'osr' && cf.buffer) {
          const { info, frames } = await parseOsrBuffer(cf.buffer);
          // Try to get notes if we have a beatmap
          let notes: ReplayNote[] = [];
          if (beatmapInfo) {
            try {
              const osuContent = await downloadBeatmapOsu(beatmapInfo.beatmapId);
              const beatmap    = parseOsuFile(osuContent);
              notes = framesToNotes(frames, beatmap, info.mods);
            } catch { /* frame-only */ }
          }
          compInputs.push({ label: info.playerName || cf.name, notes, frames });
        } else if (cf.type === 'csv' && cf.content) {
          const { notes } = parseCSV(cf.content);
          compInputs.push({ label: cf.name, notes, frames: null });
        }
      }

      setScanState({ phase: 'loading', step: 'Menghitung similarity...' });
      const results = compareReplayBatch(targetInput, compInputs);
      setScanState({ phase: 'done', results });
    } catch (err) {
      setScanState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [targetInput, compFiles, beatmapInfo]);

  // ── AUTO SCAN ───────────────────────────────────────────────────────────
  const handleAutoScan = useCallback(async () => {
    if (!targetInput || !beatmapInfo) return;
    cancelRef.current = false;
    setAutoScanning(true);
    setAutoResults([]);
    setAutoErrors([]);
    setAutoProgress({ current: 0, total: 0, currentUsername: '' });

    /**
     * Download a single replay with retry + exponential backoff on 429.
     * osu! replay endpoint is rate-limited (~10/min). We use:
     *   - 1.5s minimum gap between requests (sequential, not parallel)
     *   - Retry-After header respected if present
     *   - Up to 3 retries with exponential backoff (2s, 4s, 8s)
     */
    // Return type distinguishes success, rate-limited, and unavailable
    type DownloadResult =
      | { ok: true; buffer: ArrayBuffer }
      | { ok: false; reason: 'unavailable' | 'rate_limited' | 'error' };

    async function downloadReplayWithRetry(scoreId: number): Promise<DownloadResult> {
      const MAX_RETRIES = 3;
      let delay = 2000;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelRef.current) return { ok: false, reason: 'error' };

        const res = await fetch(`/api/osu/replay?scoreId=${scoreId}`);

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          return { ok: true, buffer };
        }

        if (res.status === 429) {
          if (attempt === MAX_RETRIES) {
            return { ok: false, reason: 'rate_limited' };
          }
          // Respect Retry-After header if provided
          const retryAfter = res.headers.get('Retry-After');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : delay;
          await new Promise((r) => setTimeout(r, waitMs));
          delay = Math.min(delay * 2, 16000); // cap at 16s
          continue;
        }

        if (res.status === 404) return { ok: false, reason: 'unavailable' };
        return { ok: false, reason: 'error' };
      }

      return { ok: false, reason: 'rate_limited' };
    }

    try {
      // Step 1: Fetch leaderboard
      setAutoProgress({ current: 0, total: 0, currentUsername: 'Mengambil leaderboard...' });
      const lbRes = await fetch(`/api/osu/leaderboard?beatmapId=${beatmapInfo.beatmapId}&limit=100`);
      if (!lbRes.ok) throw new Error(`Leaderboard fetch failed: ${lbRes.status}`);
      const scores: LeaderboardScore[] = await lbRes.json();

      setAutoProgress({ current: 0, total: scores.length, currentUsername: '' });

      // Cache the .osu beatmap file so we only download it ONCE for all replays
      let cachedOsuContent: string | null = null;
      let cachedBeatmap: ReturnType<typeof parseOsuFile> | null = null;
      try {
        cachedOsuContent = await downloadBeatmapOsu(beatmapInfo.beatmapId);
        cachedBeatmap = parseOsuFile(cachedOsuContent);
      } catch { /* proceed without beatmap — frame-only mode */ }

      // Step 2: SEQUENTIAL download — one replay at a time to respect rate limits
      // Minimum gap: 1500ms between each request (~40 replay/min, well under limit)
      const MIN_DELAY_MS = 1500;

      for (let i = 0; i < scores.length; i++) {
        if (cancelRef.current) break;

        const score = scores[i];

        setAutoProgress({
          current: i,
          total: scores.length,
          currentUsername: score.username,
        });

        const startMs = Date.now();

        try {
          const dl = await downloadReplayWithRetry(score.scoreId);

          if (!dl.ok) {
            const label = dl.reason === 'rate_limited'
              ? `${score.username}: Rate limited (dilewati)`
              : `${score.username}: Replay tidak tersimpan di server`;
            setAutoErrors((prev) => [...prev, label]);
          } else {
            const { info: repInfo, frames } = await parseOsrBuffer(dl.buffer);

            // Use cached beatmap if available
            let notes: ReplayNote[] = [];
            if (cachedBeatmap) {
              try {
                notes = framesToNotes(frames, cachedBeatmap, repInfo.mods);
              } catch { /* frame-only */ }
            }

            if (!cancelRef.current) {
              const compInput: ReplayCompareInput = {
                label: score.username,
                notes,
                frames,
              };

              const result = compareSingleReplay(targetInput, compInput, score);
              setAutoResults((prev) => {
                // Deduplicate by scoreId — prevents double-add from React batching
                if (prev.some((r) => r.scoreId === score.scoreId)) return prev;
                return [...prev, result].sort((a, b) => b.overallSimilarity - a.overallSimilarity);
              });
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Parse error';
          setAutoErrors((prev) => [...prev, `${score.username}: ${msg}`]);
        }

        setAutoProgress((prev) => ({ ...prev, current: i + 1 }));

        // Enforce minimum delay between downloads (rate limit protection)
        if (i < scores.length - 1 && !cancelRef.current) {
          const elapsed = Date.now() - startMs;
          const remaining = MIN_DELAY_MS - elapsed;
          if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        }
      }
    } catch (err) {
      setAutoErrors((prev) => [...prev, err instanceof Error ? err.message : 'Auto scan failed']);
    } finally {
      setAutoScanning(false);
      setAutoProgress((prev) => ({ ...prev, currentUsername: '' }));
    }
  }, [targetInput, beatmapInfo]);

  const handleCancelAuto = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const handleReset = useCallback(() => {
    setTargetFile(null);
    setCompFiles([]);
    setBeatmapInfo(null);
    setTargetInput(null);
    setScanState({ phase: 'idle' });
    setAutoResults([]);
    setAutoErrors([]);
    setAutoProgress({ current: 0, total: 0, currentUsername: '' });
  }, []);

  // ── Results to display ───────────────────────────────────────────────────
  const manualResults = scanState.phase === 'done' ? scanState.results : [];
  const displayResults = mode === 'manual' ? manualResults : autoResults;

  const isLoading = scanState.phase === 'loading';
  const canManualScan = !isLoading && !!targetInput && compFiles.length > 0;
  const canAutoScan   = !autoScanning && !!targetInput && !!beatmapInfo && isLoggedIn;

  return (
    <div className="min-h-screen text-[var(--color-neo-text)]">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Page hero */}
        <div className="text-center max-w-2xl mx-auto mb-10 font-mono">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white brutal-border shadow-[4px_4px_0_0_#000] mb-6">
            <Search className="w-4 h-4 text-[var(--color-neo-blue)]" />
            <span className="text-xs font-black uppercase tracking-widest">Steal Checker</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase mb-4">
            Detect{' '}
            <span className="bg-[var(--color-neo-blue)] text-white px-2 brutal-border shadow-[4px_4px_0_0_#000] inline-block">
              Replay Stealing
            </span>
          </h1>
          <p className="text-sm font-bold bg-white p-4 brutal-border shadow-[4px_4px_0_0_#000] leading-relaxed">
            Compare a target replay against others. Detect aim trajectory similarity,
            timing patterns, holdtime distribution, and miss correlation.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] transition-all ${
              mode === 'manual'
                ? 'bg-[var(--color-neo-blue)] text-white'
                : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Manual Upload
          </button>
          <button
            onClick={() => setMode('auto')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-[3px] border-black rounded-xl shadow-[2px_2px_0_0_#000] transition-all ${
              mode === 'auto'
                ? 'bg-[var(--color-neo-blue)] text-white'
                : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Auto Leaderboard Scan
          </button>
        </div>

        {/* Main content */}
        <div className="space-y-6">

          {/* Target file drop (always visible) */}
          <div className="brutal-card bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black font-mono uppercase tracking-wide">
                {mode === 'manual' ? 'Upload Replay' : 'Upload Target Replay'}
              </h2>
              {(targetFile || compFiles.length > 0 || scanState.phase !== 'idle') && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs font-bold brutal-btn px-3 py-1.5 bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-yellow)] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            {mode === 'manual' ? (
              <StealDropzone
                targetFile={targetFile}
                comparisonFiles={compFiles}
                onTargetChange={setTargetFile}
                onComparisonChange={setCompFiles}
                disabled={isLoading}
              />
            ) : (
              /* Auto mode — only target needed */
              <StealDropzone
                targetFile={targetFile}
                comparisonFiles={[]} // auto mode doesn't use manual comparisons
                onTargetChange={setTargetFile}
                onComparisonChange={() => {}}
                disabled={autoScanning}
              />
            )}

            {/* Beatmap info badge */}
            {beatmapInfo && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Info className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-xs text-white/50 truncate">
                  {beatmapInfo.artist} — {beatmapInfo.title} [{beatmapInfo.version}]
                </span>
                <span className="text-[10px] text-violet-400/60 ml-auto shrink-0">
                  {beatmapInfo.starRating.toFixed(2)}★
                </span>
              </div>
            )}
          </div>

          {/* Manual mode: scan button */}
          {mode === 'manual' && (
            <>
              {isLoading && (
                <div className="flex items-center justify-center gap-3 py-6 rounded-2xl border border-violet-500/15 bg-violet-500/5">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-white/60">
                    {scanState.phase === 'loading' ? scanState.step : 'Analyzing...'}
                  </span>
                </div>
              )}

              {!isLoading && (
                <button
                  onClick={handleManualScan}
                  disabled={!canManualScan}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Search className="w-4 h-4" />
                  Analisis Kemiripan
                </button>
              )}

              {scanState.phase === 'error' && (
                <div className="flex items-start gap-3 rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{scanState.message}</p>
                </div>
              )}
            </>
          )}

          {/* Auto mode panel */}
          {mode === 'auto' && (
            <AutoModePanel
              beatmapInfo={beatmapInfo}
              isLoggedIn={isLoggedIn}
              isScanning={autoScanning}
              progress={autoProgress}
              results={autoResults}
              errors={autoErrors}
              onStart={handleAutoScan}
              onCancel={handleCancelAuto}
            />
          )}

          {/* Results grid */}
          {displayResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                  Hasil Analisis
                  <span className="ml-2 text-white/30 font-normal">({displayResults.length})</span>
                </h2>
                {mode === 'auto' && autoScanning && (
                  <span className="text-xs text-violet-400 animate-pulse">Live updating...</span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayResults.map((result, i) => (
                  // Use scoreId (stable unique ID) as key — NOT index, which shifts on sort
                  <SimilarityCard
                    key={result.scoreId ?? `${result.comparedLabel}-${i}`}
                    result={result}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!targetFile && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {[
                'Upload .osr atau CSV',
                'Aim Trajectory Analysis',
                'Hit Error Correlation',
                'HoldTime Pattern Match',
                'Miss Jaccard Similarity',
                'Auto Leaderboard Scan',
                'Top 100 Comparison',
              ].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs text-white/30 border border-white/[0.06] bg-white/[0.02]"
                >
                  {f}
                </span>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
