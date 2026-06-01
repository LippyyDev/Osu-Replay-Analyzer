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

interface AnalysisResultProps {
  result: AnalysisResult;
  warnings: AnalysisWarning[];
  onReset: () => void;
  // Optional: present when source was .osr
  osrData?: {
    replayInfo: OsrReplayInfo;
    beatmapInfo: BeatmapInfo;
    csvContent: string;
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
}: AnalysisResultProps) {
  const interpretation = generateInterpretation(result);

  function downloadCSV() {
    if (!osrData) return;
    const blob = new Blob([osrData.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName.replace('.osr', '_raw_data.csv');
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReport() {
    downloadMarkdownReport({
      result,
      warnings,
      replayInfo:  osrData?.replayInfo,
      beatmapInfo: osrData?.beatmapInfo,
      computed:    osrData?.computed,
      csvContent:  osrData?.csvContent,
    });
  }

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* General Info (only for .osr source) */}
      {osrData && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              icon={<BarChart2 className="w-4 h-4" />}
              title="General Information"
              subtitle="Informasi replay dan beatmap dari osu! API"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40
                text-purple-400 transition-all duration-200"
              >
                <FileText className="w-3.5 h-3.5" />
                Download Report (.md)
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 hover:border-pink-500/40
                text-pink-400 transition-all duration-200"
              >
                <Download className="w-3.5 h-3.5" />
                Download Raw CSV
              </button>
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

      {/* Download Report button for CSV-only analysis (no osrData) */}
      {!osrData && (
        <div className="flex justify-end">
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
            bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40
            text-purple-400 transition-all duration-200"
          >
            <FileText className="w-3.5 h-3.5" />
            Download Report (.md)
          </button>
        </div>
      )}

      {/* 1. Verdict */}
      <VerdictCard result={result} onReset={onReset} />

      {/* 2. Score Breakdown */}
      <section>
        <SectionHeader
          icon={<BarChart2 className="w-4 h-4" />}
          title="Breakdown Skor"
          subtitle="Kontribusi setiap indikator terhadap skor akhir"
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
          icon={<BarChart2 className="w-4 h-4" />}
          title="Distribusi Data"
          subtitle="Visualisasi distribusi Hit Error dan HoldTime"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Distribusi Hit Error" subtitle="Histogram selisih waktu klik (ms)">
            <HitErrorChart histogram={result.metrics.hitErrorHistogram} />
            <p className="text-xs text-white/25 mt-2 text-center">
              Biru = ±5ms (range ideal) · Garis merah muda = titik 0ms · Kurva ungu = distribusi
            </p>
          </ChartCard>
          <ChartCard title="Distribusi HoldTime" subtitle="Circle notes only — durasi tombol ditekan (per 1ms)">
            <HoldTimeChart
              distribution={result.metrics.holdtimeDistribution}
              histogram={result.metrics.holdtimeHistogram}
            />
            <p className="text-xs text-white/25 mt-2 text-center">
              Merah = ≤3ms · Kuning = 4-10ms · Biru = normal · Kurva cyan = log-normal fit
            </p>
          </ChartCard>
        </div>
      </section>

      {/* 4. Metrics Table */}
      <section>
        <SectionHeader
          icon={<TableProperties className="w-4 h-4" />}
          title="Detail Indikator"
          subtitle="Tabel lengkap semua metrik dengan rentang normal dan status"
        />
        <IndicatorTable metrics={result.metrics} />
      </section>

      {/* 5. Full Note Log */}
      {osrData?.csvContent && (
        <section>
          <SectionHeader
            icon={<List className="w-4 h-4" />}
            title="Full Note Log"
            subtitle="Log lengkap semua note dengan status, timing, dan posisi kursor"
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
          icon={<BookOpen className="w-4 h-4" />}
          title="Interpretasi"
          subtitle="Penjelasan otomatis berdasarkan indikator yang paling menonjol"
        />
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-5">
          <p className="text-white/60 leading-relaxed text-sm">{interpretation}</p>
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
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        <p className="text-xs text-white/30">{subtitle}</p>
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
    <div className="rounded-2xl border border-white/5 bg-[#13131a] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
        <p className="text-xs text-white/30">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
