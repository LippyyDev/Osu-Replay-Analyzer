'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnalysisResultView from '@/components/relax/AnalysisResult';
import CompareView from '@/components/relax/CompareView';
import { analyzeReplay, calculateScores, generateVerdict } from '@/lib/analyzer';
import { parseOsrBuffer, parseOsuFile, framesToNotes, notesToCSV, computeOsrStats } from '@/lib/osrParser';
import { fetchBeatmapByMd5, downloadBeatmapOsu, fetchUserProfile } from '@/lib/osuApi';
import { AnalysisResult, AnalysisWarning } from '@/lib/types';
import { useReplay, OsrData, AnalysisState } from '@/lib/context/ReplayContext';
import { Terminal, ArrowLeftRight, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';

export default function RelaxPage() {
  const router = useRouter();
  const { sharedFile, analysisState, setAnalysisState, setLoadingStep, reset } = useReplay();

  // ── Process file from context on mount / when sharedFile changes ──────────
  useEffect(() => {
    // If already analyzed, don't re-run
    if (analysisState.mode === 'single' || analysisState.mode === 'dual' || analysisState.mode === 'loading') return;
    // If no file shared, do nothing — user should go back to Home
    if (!sharedFile) return;

    if (sharedFile.type === 'osr' && sharedFile.buffer) {
      handleOSR(sharedFile.buffer, sharedFile.name);
    } else if (sharedFile.type === 'csv' && sharedFile.content) {
      handleCSV(sharedFile.content, sharedFile.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFile]);

  // ── CSV handler ───────────────────────────────────────────────────────────
  const handleCSV = useCallback((content: string, fileName: string) => {
    setLoadingStep('Parsing CSV data, extracting coordinates...');
    try {
      const { result, warnings } = analyzeReplay(content, fileName);
      setAnalysisState({ mode: 'single', result, warnings });
    } catch {
      setAnalysisState({ mode: 'idle' });
    }
  }, [setAnalysisState, setLoadingStep]);

  // ── .osr handler ──────────────────────────────────────────────────────────
  const handleOSR = useCallback(async (buffer: ArrayBuffer, fileName: string) => {
    try {
      setLoadingStep('Reading replay file, decoding frames...');
      const { info, frames } = await parseOsrBuffer(buffer);

      // ── Early deduplication: check if this score ID already has a complete report ──
      // Uses a 1.5s timeout so a slow/cold Supabase never blocks the full analysis.
      const rawScoreId = info.onlineScoreId;
      const scoreIdStr = rawScoreId != null ? rawScoreId.toString() : '0';
      const hasRealScoreId = scoreIdStr && scoreIdStr !== '0';

      if (hasRealScoreId) {
        try {
          const controller = new AbortController();
          const timeoutId  = setTimeout(() => controller.abort(), 1500); // 1.5s max

          const lookupRes = await fetch(
            `/api/report/lookup?score_id=${scoreIdStr}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (lookupRes.ok) {
            const { found, id, has_csv } = await lookupRes.json();
            // Only skip full analysis if the stored report already has csvContent
            if (found && id && has_csv) {
              console.log('[RelaxPage] Complete existing report found:', scoreIdStr, '→', id);
              router.push(`/report/${id}`);
              return;
            }
          }
        } catch {
          // Lookup timed out or failed — proceed with full analysis normally
        }
      }

      setLoadingStep(`Fetching beatmap data (${info.beatmapMd5.slice(0, 8)}...)`);
      const beatmapInfo = await fetchBeatmapByMd5(info.beatmapMd5);

      setLoadingStep(`Downloading beatmap: ${beatmapInfo.title}`);
      const osuContent = await downloadBeatmapOsu(beatmapInfo.beatmapId);

      setLoadingStep('Running hit detection, syncing frames to notes...');
      const beatmap = parseOsuFile(osuContent);
      const notes = framesToNotes(frames, beatmap, info.mods);
      const csvContent = notesToCSV(notes);

      const beatmapCircles  = beatmap.hitObjects.filter((o) => o.isCircle).length;
      const beatmapSliders  = beatmap.hitObjects.filter((o) => o.isSlider).length;
      const beatmapSpinners = beatmap.hitObjects.filter((o) => o.isSpinner).length;
      const computed = computeOsrStats(notes, frames, info.mods, beatmapCircles, beatmapSliders, beatmapSpinners);

      setLoadingStep(`Querying player profile: ${info.playerName}`);
      const userProfile = await fetchUserProfile(info.playerName);

      setLoadingStep('Running AI heuristic analysis, calculating probabilities...');
      const { result, warnings } = analyzeReplay(csvContent, fileName);

      const osrMissCount = info.countMiss;
      if (osrMissCount !== result.metrics.circleMissCount) {
        result.metrics.circleMissCount = osrMissCount;
        result.metrics.missCount = Math.max(result.metrics.missCount, osrMissCount);
        const newScores = calculateScores(result.metrics);
        result.scores = newScores;
        const { verdict, verdictColor } = generateVerdict(newScores);
        result.verdict = verdict;
        result.verdictColor = verdictColor;
      }

      setAnalysisState({
        mode: 'single',
        result,
        warnings,
        osrData: { replayInfo: info, beatmapInfo, csvContent, computed, userProfile },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setAnalysisState({
        mode: 'single',
        result: {
          metrics: {
            holdtimeMean: 0, holdtimeStd: 0, holdtimeUnder3ms: 0,
            holdtimeUnder10ms: 0, holdtimeGap11_100: 0, holdtimeBimodal: false,
            holdtimeDistribution: [], holdtimeHistogram: [],
            hitErrorMean: 0, hitErrorStd: 0,
            hitErrorSkew: 0, hitErrorHistogram: [], onCircleRate: 0,
            totalNotes: 0, circleCount: 0, sliderCount: 0, spinnerCount: 0, hitCount: 0,
            missCount: 0, circleMissCount: 0, hitRate: 0,
          },
          scores: { holdtimeScore: 0, hitErrorScore: 0, onCircleScore: 0, circleMissScore: 0, finalScore: 0 },
          verdict: 'KEMUNGKINAN BERSIH',
          verdictColor: 'red',
          fileName,
          noteCount: 0,
        },
        warnings: [{
          type: 'beatmap_fetch_error',
          message: `Error: Failed to process replay file. ${message}`,
        }],
      });
    }
  }, [setAnalysisState, setLoadingStep, router]);

  const handleReset = useCallback(() => {
    reset();
    router.push('/');
  }, [reset, router]);

  // ── No file — redirect to home ───────────────────────────────────────────
  if (!sharedFile && analysisState.mode === 'idle') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="text-center p-8 brutal-card bg-white">
          <Terminal className="w-12 h-12 mx-auto mb-4 text-[var(--color-neo-pink)]" />
          <h2 className="text-xl font-black uppercase mb-2">No Replay Loaded</h2>
          <p className="text-sm font-mono font-bold opacity-60 mb-6">Upload a replay file on the Home page first.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase bg-[var(--color-neo-pink)] text-white brutal-btn"
          >
            <Upload className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (analysisState.mode === 'loading') {
    return (
      <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="w-20 h-20 bg-[var(--color-neo-yellow)] brutal-border flex items-center justify-center animate-bounce shadow-[4px_4px_0_0_#000]">
          <Terminal className="w-8 h-8 animate-pulse" />
        </div>
        <div className="text-center p-4 bg-white brutal-border shadow-[4px_4px_0_0_#000]">
          <p className="font-mono font-bold text-lg uppercase">{analysisState.step}</p>
          <p className="font-mono text-sm mt-2 opacity-70">Please wait while the analysis completes...</p>
        </div>
      </div>
    );
  }

  // ── Single result ─────────────────────────────────────────────────────────
  if (analysisState.mode === 'single') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnalysisResultView
          result={analysisState.result}
          warnings={analysisState.warnings}
          onReset={handleReset}
          osrData={analysisState.osrData}
        />
      </div>
    );
  }

  // ── Dual result ───────────────────────────────────────────────────────────
  if (analysisState.mode === 'dual') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap p-4 bg-white brutal-border shadow-[6px_6px_0_0_#000]">
            <div className="flex gap-2">
              {([0, 1] as const).map((i) => (
                <button
                  key={i}
                  onClick={() =>
                    setAnalysisState(
                      analysisState.mode === 'dual'
                        ? { ...analysisState, view: 'individual', activeIndex: i }
                        : analysisState
                    )
                  }
                  className={`px-4 py-2 text-sm font-bold font-mono transition-all duration-200 truncate max-w-[200px] brutal-btn ${
                    analysisState.view === 'individual' && analysisState.activeIndex === i
                      ? 'bg-[var(--color-neo-pink)] text-white'
                      : 'bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-yellow)]'
                  }`}
                >
                  {analysisState.results[i].result.fileName}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setAnalysisState(
                  analysisState.mode === 'dual' ? { ...analysisState, view: 'compare' } : analysisState
                )
              }
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold font-mono transition-all duration-200 brutal-btn ${
                analysisState.view === 'compare'
                  ? 'bg-[var(--color-neo-blue)] text-white'
                  : 'bg-[var(--color-neo-bg)] hover:bg-[var(--color-neo-yellow)]'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Compare Mode
            </button>
            <button
              onClick={handleReset}
              className="ml-auto px-4 py-2 text-sm font-bold font-mono bg-[var(--color-neo-red)] text-white brutal-btn"
            >
              Reset
            </button>
          </div>

          {analysisState.view === 'individual' && (
            <AnalysisResultView
              result={analysisState.results[analysisState.activeIndex].result}
              warnings={analysisState.results[analysisState.activeIndex].warnings}
              onReset={handleReset}
              osrData={analysisState.results[analysisState.activeIndex].osrData}
            />
          )}
          {analysisState.view === 'compare' && (
            <CompareView
              results={[
                analysisState.results[0].result,
                analysisState.results[1].result,
              ]}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
