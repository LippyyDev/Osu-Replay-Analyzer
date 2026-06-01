'use client';

import { useState, useCallback } from 'react';
import UnifiedDropzone from '@/components/FileDropzone';
import AnalysisResultView from '@/components/AnalysisResult';
import CompareView from '@/components/CompareView';
import { analyzeReplay, calculateScores, generateVerdict } from '@/lib/analyzer';
import { parseOsrBuffer, parseOsuFile, framesToNotes, notesToCSV, computeOsrStats } from '@/lib/osrParser';
import { fetchBeatmapByMd5, downloadBeatmapOsu, fetchUserProfile } from '@/lib/osuApi';
import { AnalysisResult, AnalysisWarning, BeatmapInfo, OsrReplayInfo, OsrComputedStats, UserProfile } from '@/lib/types';
import { Activity, ArrowLeftRight, Loader2 } from 'lucide-react';

interface OsrData {
  replayInfo: OsrReplayInfo;
  beatmapInfo: BeatmapInfo;
  csvContent: string;
  computed: OsrComputedStats;
  userProfile?: UserProfile | null;
}

type AppState =
  | { mode: 'idle' }
  | { mode: 'loading'; step: string }
  | {
      mode: 'single';
      result: AnalysisResult;
      warnings: AnalysisWarning[];
      osrData?: OsrData;
    }
  | {
      mode: 'dual';
      results: [
        { result: AnalysisResult; warnings: AnalysisWarning[]; osrData?: OsrData },
        { result: AnalysisResult; warnings: AnalysisWarning[]; osrData?: OsrData },
      ];
      view: 'individual' | 'compare';
      activeIndex: 0 | 1;
    };

export default function HomePage() {
  const [state, setState] = useState<AppState>({ mode: 'idle' });

  // ── CSV handlers ───────────────────────────────────────────────────────────
  const handleSingleCSV = useCallback((content: string, fileName: string) => {
    setState({ mode: 'loading', step: 'Parsing CSV...' });
    try {
      const { result, warnings } = analyzeReplay(content, fileName);
      setState({ mode: 'single', result, warnings });
    } catch {
      setState({ mode: 'idle' });
    }
  }, []);

  const handleDualCSV = useCallback(
    (files: { content: string; fileName: string }[]) => {
      setState({ mode: 'loading', step: 'Parsing CSV files...' });
      try {
        const [a, b] = files.map(({ content, fileName }) =>
          analyzeReplay(content, fileName)
        );
        setState({
          mode: 'dual',
          results: [a, b],
          view: 'individual',
          activeIndex: 0,
        });
      } catch {
        setState({ mode: 'idle' });
      }
    },
    []
  );

  // ── .osr handler ──────────────────────────────────────────────────────────
  const handleOSR = useCallback(async (buffer: ArrayBuffer, fileName: string) => {
    try {
      // Step 1: Parse .osr binary
      setState({ mode: 'loading', step: 'Membaca file .osr...' });
      const { info, frames } = await parseOsrBuffer(buffer);

      // Step 2: Fetch beatmap info by MD5
      setState({ mode: 'loading', step: `Mencari beatmap (${info.beatmapMd5.slice(0, 8)}...)` });
      const beatmapInfo = await fetchBeatmapByMd5(info.beatmapMd5);

      // Step 3: Download .osu file
      setState({ mode: 'loading', step: `Download beatmap: ${beatmapInfo.title}...` });
      const osuContent = await downloadBeatmapOsu(beatmapInfo.beatmapId);

      // Step 4: Parse .osu + hit detection
      setState({ mode: 'loading', step: 'Melakukan hit detection...' });
      const beatmap = parseOsuFile(osuContent);
      const notes = framesToNotes(frames, beatmap, info.mods);
      const csvContent = notesToCSV(notes);

      // Step 5: Computed stats (UR, frametime, counts)
      const beatmapCircles  = beatmap.hitObjects.filter((o) => o.isCircle).length;
      const beatmapSliders  = beatmap.hitObjects.filter((o) => o.isSlider).length;
      const beatmapSpinners = beatmap.hitObjects.filter((o) => o.isSpinner).length;
      const computed = computeOsrStats(
        notes, frames, info.mods,
        beatmapCircles, beatmapSliders, beatmapSpinners
      );

      // Step 6: Fetch user profile (non-blocking — failure is OK)
      setState({ mode: 'loading', step: `Mengambil profil ${info.playerName}...` });
      const userProfile = await fetchUserProfile(info.playerName);

      // Step 7: Run cheat analysis
      setState({ mode: 'loading', step: 'Menganalisis pola cheat...' });
      const { result, warnings } = analyzeReplay(csvContent, fileName);

      // Step 7: Override miss count with the authoritative value from the .osr header.
      // framesToNotes() hit-window detection may miss-classify some misses (e.g. when
      // osu! used a slightly different timing or the player had a late-hit that osu!
      // counted as miss but our algorithm matched). info.countMiss is recorded by the
      // osu! game engine itself and is always correct.
      const osrMissCount = info.countMiss;
      if (osrMissCount !== result.metrics.circleMissCount) {
        result.metrics.circleMissCount = osrMissCount;
        result.metrics.missCount = Math.max(result.metrics.missCount, osrMissCount);
        // Recalculate scores so Miss Score card reflects the corrected count
        const newScores = calculateScores(result.metrics);
        result.scores = newScores;
        const { verdict, verdictColor } = generateVerdict(newScores);
        result.verdict = verdict;
        result.verdictColor = verdictColor;
      }

      setState({
        mode: 'single',
        result,
        warnings,
        osrData: { replayInfo: info, beatmapInfo, csvContent, computed, userProfile },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // Show error as a result with warning instead of silent fail
      setState({
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
          verdictColor: 'green',
          fileName,
          noteCount: 0,
        },
        warnings: [{
          type: 'beatmap_fetch_error',
          message: `Gagal memproses .osr: ${message}`,
        }],
      });
    }
  }, []);

  const handleReset = useCallback(() => setState({ mode: 'idle' }), []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-pink-600/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-700/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-blue-700/5 blur-[80px]" />
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* IDLE */}
        {state.mode === 'idle' && (
          <div className="flex flex-col items-center gap-12 animate-fade-in">
            <div className="text-center max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium mb-6">
                <Activity className="w-3.5 h-3.5" />
                Relax Hack Detector
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
                Deteksi{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-600">
                  Relax Hack
                </span>
              </h2>
              <p className="text-white/40 text-base leading-relaxed">
                Upload file{' '}
                <span className="text-pink-400/80 font-semibold">.osr</span>{' '}
                langsung dari osu! — beatmap di-fetch otomatis via osu! API.
                Atau upload{' '}
                <span className="text-pink-400/80 font-semibold">CSV</span>{' '}
                dari analyzer.osu.report.
              </p>
            </div>

            <UnifiedDropzone
              onCSVAccepted={handleSingleCSV}
              onCSVsAccepted={handleDualCSV}
              onOSRAccepted={handleOSR}
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                'Upload .osr Langsung',
                'Auto-fetch Beatmap',
                'HoldTime Analysis',
                'Hit Error Stats',
                'OnCircle Rate',
                'Download Raw CSV',
                'Bandingkan 2 Replay',
              ].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs text-white/40 border border-white/[0.06] bg-white/[0.02]"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {state.mode === 'loading' && (
          <div className="flex flex-col items-center gap-5 py-32 animate-fade-in">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-pink-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white/70 font-medium">{state.step}</p>
              <p className="text-white/25 text-sm mt-1">Mohon tunggu...</p>
            </div>
          </div>
        )}

        {/* SINGLE RESULT */}
        {state.mode === 'single' && (
          <AnalysisResultView
            result={state.result}
            warnings={state.warnings}
            onReset={handleReset}
            osrData={state.osrData}
          />
        )}

        {/* DUAL RESULT */}
        {state.mode === 'dual' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                {([0, 1] as const).map((i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setState((s) =>
                        s.mode === 'dual'
                          ? { ...s, view: 'individual', activeIndex: i }
                          : s
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 truncate max-w-[160px] ${
                      state.view === 'individual' && state.activeIndex === i
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : 'bg-white/[0.03] text-white/40 border border-white/5 hover:text-white/70'
                    }`}
                  >
                    {state.results[i].result.fileName}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setState((s) =>
                    s.mode === 'dual' ? { ...s, view: 'compare' } : s
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  state.view === 'compare'
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/5 hover:text-white/70'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Bandingkan
              </button>
              <button
                onClick={handleReset}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.03] text-white/30 border border-white/5 hover:text-white/60 transition-all"
              >
                Reset
              </button>
            </div>

            {state.view === 'individual' && (
              <AnalysisResultView
                result={state.results[state.activeIndex].result}
                warnings={state.results[state.activeIndex].warnings}
                onReset={handleReset}
                osrData={state.results[state.activeIndex].osrData}
              />
            )}
            {state.view === 'compare' && (
              <CompareView
                results={[
                  state.results[0].result,
                  state.results[1].result,
                ]}
              />
            )}
          </div>
        )}
      </main>

      <footer className="relative border-t border-white/[0.04] mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-white/15 text-xs">
          <p>osu! Cheat Detector — Support .osr langsung &amp; CSV dari analyzer.osu.report</p>
          <p className="mt-1">Hanya untuk tujuan edukasi. Hasil analisis bukan keputusan final tentang status akun.</p>
        </div>
      </footer>
    </div>
  );
}
