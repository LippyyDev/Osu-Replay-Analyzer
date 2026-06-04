'use client';

import { AnalysisResult, AnalysisWarning, BeatmapInfo, OsrReplayInfo, OsrComputedStats, UserProfile } from '@/lib/types';
import VerdictCard from './VerdictCard';
import { ScoreBreakdownCards } from './MetricCard';
import HitErrorChart from './HitErrorChart';
import HoldTimeChart from './HoldTimeChart';
import IndicatorTable from './IndicatorTable';
import GeneralInfo from './GeneralInfo';
import FullNoteLog from './FullNoteLog';
import { downloadMarkdownReport } from '@/lib/reportGenerator';
import { AlertTriangle, BarChart2, TableProperties, BookOpen, Download, FileText, List } from 'lucide-react';
import ShareButton from '@/components/ShareButton';

interface AnalysisResultProps {
  result: AnalysisResult;
  warnings: AnalysisWarning[];
  onReset: () => void;
  /** When true, hides the Share button (already on a shared report page) */
  isSharedView?: boolean;
  // Optional: present when source was .osr
  osrData?: {
    replayInfo: OsrReplayInfo;
    beatmapInfo: BeatmapInfo;
    csvContent?: string; // optional — older saved reports may not include this
    computed: OsrComputedStats;
    userProfile?: UserProfile | null;
  };
}

function generateInterpretation(result: AnalysisResult): string {
  const { metrics, scores, verdict } = result;
  const parts: string[] = [];

  if (verdict === 'KEMUNGKINAN BESAR CHEAT') {
    parts.push(
      'Berdasarkan analisis, replay ini menunjukkan pola yang sangat konsisten dengan penggunaan Relax hack.'
    );
  } else if (verdict === 'MENCURIGAKAN') {
    parts.push(
      'Replay ini memiliki beberapa indikator yang mencurigakan, namun belum cukup konklusif untuk memastikan penggunaan cheat.'
    );
  } else if (verdict === 'ABU-ABU') {
    parts.push(
      'Data replay berada di area abu-abu — beberapa indikator sedikit di luar rentang normal namun tidak ada pola yang dominan.'
    );
  } else {
    parts.push(
      'Tidak ditemukan pola yang signifikan mengindikasikan penggunaan Relax hack pada replay ini.'
    );
  }

  // HoldTime commentary
  if (scores.holdtimeScore >= 60) {
    parts.push(
      `HoldTime sangat pendek (${metrics.holdtimeUnder3ms.toFixed(1)}% ketukan circle di bawah 3ms) — ini adalah tanda utama relax hack karena klik otomatis tidak dapat menahan tombol secara wajar.`
    );
  } else if (scores.holdtimeScore >= 35) {
    parts.push(
      `HoldTime cukup pendek untuk ${metrics.holdtimeUnder3ms.toFixed(1)}% ketukan, namun masih bisa dijelaskan dengan gaya bermain tertentu.`
    );
  }

  if (metrics.holdtimeBimodal) {
    parts.push(
      'Distribusi HoldTime bersifat bimodal (hanya ada nilai sangat pendek dan sangat panjang, tidak ada di tengah) — ini pola klasik relax hack.'
    );
  }

  // Hit error commentary
  if (scores.hitErrorScore >= 65) {
    parts.push(
      `Standar deviasi hit error yang sangat rendah (±${metrics.hitErrorStd.toFixed(2)}ms) menunjukkan konsistensi mekanik yang melampaui kemampuan manusia normal.`
    );
  }

  // OnCircle commentary
  if (scores.onCircleScore >= 75) {
    parts.push(
      `OnCircle rate sebesar ${metrics.onCircleRate.toFixed(1)}% sangat tinggi, mengindikasikan aiming yang sangat presisi atau bantuan aim.`
    );
  }

  // Miss commentary
  if (scores.circleMissScore >= 70) {
    parts.push(
      `Nihil miss pada ${metrics.circleCount} circle notes — tidak menemukan satu pun kesalahan dalam jumlah note sebanyak itu sangat tidak wajar untuk pemain manusia.`
    );
  } else if (metrics.circleMissCount > 0) {
    parts.push(
      `Adanya ${metrics.circleMissCount} miss pada circle notes merupakan indikasi bahwa ada ketidaksempurnaan yang lebih konsisten dengan pemain manusia.`
    );
  }

  return parts.join(' ');
}

export default function AnalysisResultView({
  result,
  warnings,
  onReset,
  osrData,
  isSharedView = false,
}: AnalysisResultProps) {
  const interpretation = generateInterpretation(result);

  function downloadCSV() {
    if (!osrData?.csvContent) return; // csvContent not available in shared view
    const blob = new Blob([osrData.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName.replace('.osr', '_raw_data.csv');
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    // When loaded from Supabase JSON, timestamp is an ISO string — reconvert to Date
    const safeReplayInfo = osrData?.replayInfo
      ? {
          ...osrData.replayInfo,
          timestamp: osrData.replayInfo.timestamp instanceof Date
            ? osrData.replayInfo.timestamp
            : new Date(osrData.replayInfo.timestamp as unknown as string),
          // onlineScoreId may be a string when loaded from JSON
          onlineScoreId: typeof osrData.replayInfo.onlineScoreId === 'bigint'
            ? osrData.replayInfo.onlineScoreId
            : BigInt(osrData.replayInfo.onlineScoreId ?? 0),
        }
      : undefined;

    downloadMarkdownReport({
      result,
      warnings,
      replayInfo:  safeReplayInfo,
      beatmapInfo: osrData?.beatmapInfo,
      computed:    osrData?.computed,
      csvContent:  osrData?.csvContent,
    });
  }

  return (
    <div className="w-full space-y-10 animate-fade-in pb-16">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-3 font-mono">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-4 px-5 py-4 brutal-card bg-[var(--color-neo-yellow)] text-black"
            >
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <span className="font-bold uppercase leading-relaxed text-sm">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Verdict */}
      <VerdictCard result={result} onReset={onReset} />

      {/* General Info (only for .osr source) */}
      {osrData && (
        <section className="font-mono">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <SectionHeader
              icon={<BarChart2 className="w-5 h-5" />}
              title="General Info"
              subtitle="Replay and beatmap metadata"
            />
            <div className="flex items-center gap-3 flex-wrap">
              {!isSharedView && (
                <ShareButton
                  result={result}
                  warnings={warnings}
                  osrData={osrData}
                  filename={result.fileName}
                />
              )}
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase bg-white text-black brutal-btn"
              >
                <FileText className="w-4 h-4" />
                Download Report
              </button>
              {/* Hide RAW CSV in shared view — csvContent is not stored in Supabase */}
              {osrData.csvContent && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase bg-white text-black brutal-btn"
                >
                  <Download className="w-4 h-4" />
                  RAW CSV
                </button>
              )}
            </div>
          </div>
          <GeneralInfo
            replayInfo={osrData.replayInfo}
            beatmapInfo={osrData.beatmapInfo}
            computed={osrData.computed}
            userProfile={osrData.userProfile ?? null}
          />
        </section>
      )}

      {/* Download Report + Share for CSV-only analysis (no osrData) */}
      {!osrData && (
        <div className="flex justify-end gap-3 font-mono flex-wrap">
          {!isSharedView && (
            <ShareButton
              result={result}
              warnings={warnings}
              filename={result.fileName}
            />
          )}
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase bg-[var(--color-neo-yellow)] text-black brutal-btn"
          >
            <FileText className="w-5 h-5" />
              Download Report
          </button>
        </div>
      )}

      {/* 2. Score Breakdown */}
      <section>
        <SectionHeader
          icon={<BarChart2 className="w-5 h-5" />}
          title="Score Breakdown"
          subtitle="Component contributions to final score"
        />
        <ScoreBreakdownCards
          scores={result.scores}
          metrics={{
            holdtimeUnder3ms: result.metrics.holdtimeUnder3ms,
            hitErrorStd: result.metrics.hitErrorStd,
            onCircleRate: result.metrics.onCircleRate,
            circleMissCount: result.metrics.circleMissCount,
            circleCount: result.metrics.circleCount,
          }}
        />
      </section>

      {/* 3. Charts */}
      <section>
        <SectionHeader
          icon={<BarChart2 className="w-5 h-5" />}
          title="Data Distribution"
          subtitle="Visual analysis of HitError and HoldTime"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Hit Error Distribution" subtitle="Timing Offsets (ms)">
            <HitErrorChart histogram={result.metrics.hitErrorHistogram} />
            <p className="text-xs text-black/60 font-bold uppercase mt-4 text-center border-t-[3px] border-black pt-2">
              BLUE = ±5ms · PINK = 0ms · PURPLE = CURVE
            </p>
          </ChartCard>
          <ChartCard title="Hold Time Distribution" subtitle="Circle Press Duration (ms)">
            <HoldTimeChart
              distribution={result.metrics.holdtimeDistribution}
              histogram={result.metrics.holdtimeHistogram}
            />
            <p className="text-xs text-black/60 font-bold uppercase mt-4 text-center border-t-[3px] border-black pt-2">
              RED = ≤3ms · YELLOW = 4-10ms · CYAN = LOG-NORMAL FIT
            </p>
          </ChartCard>
        </div>
      </section>

      {/* 4. Metrics Table */}
      <section>
        <SectionHeader
          icon={<TableProperties className="w-5 h-5" />}
          title="Indicator Details"
          subtitle="Comprehensive metrics and classifications"
        />
        <IndicatorTable metrics={result.metrics} />
      </section>

      {/* 5. Full Note Log */}
      {osrData?.csvContent && (
        <section>
          <SectionHeader
            icon={<List className="w-5 h-5" />}
            title="Full Note Log"
            subtitle="Raw event data with cursor positioning"
          />
          <FullNoteLog
            csvContent={osrData.csvContent}
            od={osrData.beatmapInfo.od}
            mods={osrData.replayInfo.mods}
          />
        </section>
      )}

      {/* 6. Interpretation */}
      <section>
        <SectionHeader
          icon={<BookOpen className="w-5 h-5" />}
          title="Interpretation"
          subtitle="Automated analysis conclusion"
        />
        <div className="brutal-card bg-white px-6 py-6 font-mono">
          <p className="text-black font-bold uppercase leading-relaxed">{interpretation}</p>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6 font-mono">
      <div className="p-3 brutal-border bg-[var(--color-neo-pink)] text-white shadow-[2px_2px_0_0_#000]">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider">{title}</h2>
        <p className="text-xs font-bold text-black/60 uppercase">{subtitle}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="brutal-card bg-white p-6 font-mono">
      <div className="mb-6 flex flex-col gap-1 border-b-[3px] border-black pb-3">
        <h3 className="text-lg font-black text-black uppercase">{title}</h3>
        <p className="text-xs font-bold text-black/60 uppercase">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
