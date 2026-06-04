'use client';

import { AnalysisResult } from '@/lib/types';
import { ArrowLeftRight } from 'lucide-react';

interface CompareViewProps {
  results: [AnalysisResult, AnalysisResult];
}

type MetricRow = {
  label: string;
  getValue: (r: AnalysisResult) => string | number;
  getNumeric: (r: AnalysisResult) => number;
  higherIsBetter?: boolean; // true = higher = worse (suspicion)
  format?: (v: number) => string;
};

const ROWS: MetricRow[] = [
  {
    label: 'Final Score',
    getValue: (r) => `${r.scores.finalScore.toFixed(1)} / 100`,
    getNumeric: (r) => r.scores.finalScore,
  },
  {
    label: 'HoldTime ≤ 3ms',
    getValue: (r) => `${r.metrics.holdtimeUnder3ms.toFixed(2)}%`,
    getNumeric: (r) => r.metrics.holdtimeUnder3ms,
  },
  {
    label: 'HoldTime rata-rata',
    getValue: (r) => `${r.metrics.holdtimeMean.toFixed(2)} ms`,
    getNumeric: (r) => r.metrics.holdtimeMean,
    higherIsBetter: false,
  },
  {
    label: 'HoldTime std dev',
    getValue: (r) => `${r.metrics.holdtimeStd.toFixed(2)} ms`,
    getNumeric: (r) => r.metrics.holdtimeStd,
    higherIsBetter: false,
  },
  {
    label: 'Hit Error std dev',
    getValue: (r) => `±${r.metrics.hitErrorStd.toFixed(2)} ms`,
    getNumeric: (r) => r.metrics.hitErrorStd,
    higherIsBetter: false,
  },
  {
    label: 'Hit Error mean',
    getValue: (r) =>
      `${r.metrics.hitErrorMean >= 0 ? '+' : ''}${r.metrics.hitErrorMean.toFixed(2)} ms`,
    getNumeric: (r) => Math.abs(r.metrics.hitErrorMean),
  },
  {
    label: 'OnCircle rate',
    getValue: (r) => `${r.metrics.onCircleRate.toFixed(2)}%`,
    getNumeric: (r) => r.metrics.onCircleRate,
  },
  {
    label: 'Circle miss',
    getValue: (r) => `${r.metrics.circleMissCount} / ${r.metrics.circleCount}`,
    getNumeric: (r) => r.metrics.circleMissCount,
    higherIsBetter: false,
  },
  {
    label: 'Hit rate',
    getValue: (r) => `${r.metrics.hitRate.toFixed(2)}%`,
    getNumeric: (r) => r.metrics.hitRate,
    higherIsBetter: false,
  },
];

const verdictBadge: Record<string, string> = {
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  green: 'bg-green-500/15 text-green-400 border-green-500/20',
};

export default function CompareView({ results }: CompareViewProps) {
  const [r1, r2] = results;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
          <ArrowLeftRight className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white/90">
            Perbandingan Dua Replay
          </h2>
          <p className="text-xs text-white/30">
            Selisih nilai antar file — merah = lebih mencurigakan
          </p>
        </div>
      </div>

      {/* Verdict row */}
      <div className="grid grid-cols-3 gap-4">
        <FileVerdict result={r1} />
        <div className="flex items-center justify-center">
          <div className="w-px h-full bg-white/5" />
          <span className="px-3 py-1 rounded-full text-xs text-white/20 border border-white/5 bg-white/[0.02]">
            VS
          </span>
          <div className="w-px h-full bg-white/5" />
        </div>
        <FileVerdict result={r2} />
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-4 bg-white/[0.03] border-b border-white/5">
          <div className="px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">
            Indikator
          </div>
          <div className="px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium truncate">
            {r1.fileName}
          </div>
          <div className="px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium truncate">
            {r2.fileName}
          </div>
          <div className="px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">
            Selisih
          </div>
        </div>
        {ROWS.map((row, i) => {
          const v1 = row.getNumeric(r1);
          const v2 = row.getNumeric(r2);
          const diff = v1 - v2;
          const absDiff = Math.abs(diff).toFixed(2);
          const isDiffSignificant = Math.abs(diff) > 0.01;

          return (
            <div
              key={i}
              className="grid grid-cols-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <div className="px-5 py-3.5 text-sm text-white/60 font-medium">
                {row.label}
              </div>
              <div className="px-5 py-3.5 font-mono text-sm text-white/80">
                {row.getValue(r1)}
              </div>
              <div className="px-5 py-3.5 font-mono text-sm text-white/80">
                {row.getValue(r2)}
              </div>
              <div className="px-5 py-3.5">
                {isDiffSignificant ? (
                  <span
                    className={`font-mono text-xs font-semibold ${
                      diff > 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }`}
                  >
                    {diff > 0 ? '+' : '-'}
                    {absDiff}
                  </span>
                ) : (
                  <span className="text-white/20 text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FileVerdict({ result }: { result: AnalysisResult }) {
  const cls = verdictBadge[result.verdictColor];
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
      <p className="text-xs text-white/30 font-mono truncate w-full text-center">
        {result.fileName}
      </p>
      <p className="text-2xl font-black text-white">
        {result.scores.finalScore.toFixed(1)}
      </p>
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${cls}`}
      >
        {result.verdict}
      </span>
    </div>
  );
}
