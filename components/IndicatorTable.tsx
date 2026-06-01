'use client';

import { AnalysisMetrics } from '@/lib/types';

interface IndicatorTableProps {
  metrics: AnalysisMetrics;
}

type Status = 'normal' | 'gray' | 'suspicious';

interface Row {
  indicator: string;
  value: string;
  normalRange: string;
  status: Status;
  note?: string;
}

function badge(status: Status) {
  if (status === 'normal')
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
        Wajar
      </span>
    );
  if (status === 'gray')
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
        Abu-abu
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
      Mencurigakan
    </span>
  );
}

// ─── Classification functions ─────────────────────────────────────────────────

// HoldTime mean — Relax: 1-3ms; Human tapping: 50-150ms; Slider holds inflate average
function classifyHoldtimeMean(v: number): Status {
  if (v >= 30 && v <= 300) return 'normal';   // includes slider holds pulling mean up
  if (v >= 5  && v < 30)   return 'gray';
  if (v < 5)               return 'suspicious'; // near-instant clicks
  return 'normal'; // very high = lots of sliders, not suspicious
}

// HoldTime std dev — Relax: very low (machine clicks uniformly short) or very high (mix short+long sliders)
function classifyHoldtimeStd(v: number): Status {
  if (v >= 15 && v <= 150) return 'normal';
  if (v >= 5  && v < 15)   return 'gray';
  if (v < 5)               return 'suspicious'; // suspiciously uniform (all same duration)
  return 'normal';
}

// HoldTime ≤ 3ms percentage — key Relax indicator
function classifyUnder3(pct: number): Status {
  if (pct < 5)  return 'normal';
  if (pct < 20) return 'gray';
  return 'suspicious';
}

// HoldTime ≤ 10ms percentage
function classifyUnder10(pct: number): Status {
  if (pct < 10) return 'normal';
  if (pct < 30) return 'gray';
  return 'suspicious';
}

// Bimodal (no notes in 11-100ms range) — classic Relax pattern
function classifyBimodal(b: boolean): Status {
  return b ? 'suspicious' : 'normal';
}

// Hit Error std dev — lower = more machine-like precision
function classifyHitErrorStd(v: number): Status {
  if (v === 0) return 'normal'; // no hits to measure
  if (v >= 15) return 'normal';
  if (v >= 8)  return 'gray';
  return 'suspicious'; // <8ms std dev is inhuman
}

// Hit Error mean — large absolute offset = consistent early/late
function classifyHitErrorMean(v: number): Status {
  const abs = Math.abs(v);
  if (abs <= 10) return 'normal';
  if (abs <= 25) return 'gray';
  return 'suspicious';
}

// Hit Error skewness — extreme skew = systematic bias
function classifySkewness(v: number): Status {
  const abs = Math.abs(v);
  if (abs <= 1)  return 'normal';
  if (abs <= 2)  return 'gray';
  return 'suspicious';
}

// OnCircle rate = proportion of circle-type notes in the map.
// This is map composition info, NOT a cheat indicator.
// Range depends entirely on the map (some maps are circle-heavy, others slider-heavy).
function classifyOnCircle(_pct: number): Status {
  return 'normal'; // purely informational
}

// Miss count — 0 miss with many notes = suspicious
function classifyMiss(miss: number, total: number): Status {
  if (miss > 0)                   return 'normal';   // has some misses = human evidence
  if (miss === 0 && total > 100)  return 'suspicious';
  if (miss === 0 && total > 50)   return 'gray';
  return 'normal';
}

// Hit rate — informational
function classifyHitRate(pct: number): Status {
  if (pct > 99.5) return 'gray'; // perfect FC = slightly suspicious contextually
  return 'normal';
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function IndicatorTable({ metrics }: IndicatorTableProps) {
  const rows: Row[] = [
    // ── HoldTime section ─────────────────────────────────────────────────────
    {
      indicator: 'HoldTime rata-rata',
      value: `${metrics.holdtimeMean.toFixed(2)} ms`,
      normalRange: '30 – 300 ms',
      status: classifyHoldtimeMean(metrics.holdtimeMean),
      note: 'Rata-rata durasi tombol ditekan (seluruh hit notes)',
    },
    {
      indicator: 'HoldTime std dev',
      value: `${metrics.holdtimeStd.toFixed(2)} ms`,
      normalRange: '15 – 150 ms',
      status: classifyHoldtimeStd(metrics.holdtimeStd),
      note: 'Konsistensi durasi tekan — terlalu seragam = mencurigakan',
    },
    {
      indicator: 'HoldTime ≤ 3ms (%)',
      value: `${metrics.holdtimeUnder3ms.toFixed(2)}%`,
      normalRange: '< 5%',
      status: classifyUnder3(metrics.holdtimeUnder3ms),
      note: 'Indikator utama Relax — auto-click melepas tombol hampir instan',
    },
    {
      indicator: 'HoldTime ≤ 10ms (%)',
      value: `${metrics.holdtimeUnder10ms.toFixed(2)}%`,
      normalRange: '< 10%',
      status: classifyUnder10(metrics.holdtimeUnder10ms),
    },
    {
      indicator: 'Distribusi bimodal',
      value: metrics.holdtimeBimodal ? 'Ya (gap 11-100ms kosong)' : 'Tidak',
      normalRange: 'Tidak',
      status: classifyBimodal(metrics.holdtimeBimodal),
      note: 'Gap 11-100ms kosong + ada holdtime >100ms = pola klasik Relax+slider',
    },
    // ── Hit Error section ─────────────────────────────────────────────────────
    {
      indicator: 'Hit Error std dev',
      value: `${metrics.hitErrorStd.toFixed(2)} ms`,
      normalRange: '≥ 15 ms',
      status: classifyHitErrorStd(metrics.hitErrorStd),
      note: 'Std dev <8ms = presisi melampaui kemampuan manusia normal',
    },
    {
      indicator: 'Hit Error mean (offset)',
      value: `${metrics.hitErrorMean >= 0 ? '+' : ''}${metrics.hitErrorMean.toFixed(2)} ms`,
      normalRange: '-10 s/d +10 ms',
      status: classifyHitErrorMean(metrics.hitErrorMean),
      note: 'Negatif = tendency early, positif = tendency late',
    },
    {
      indicator: 'Hit Error skewness',
      value: metrics.hitErrorSkew.toFixed(3),
      normalRange: '-1.0 s/d +1.0',
      status: classifySkewness(metrics.hitErrorSkew),
    },
    // ── Cursor & miss section ─────────────────────────────────────────────────
    {
      indicator: 'Proporsi circle di map',
      value: `${metrics.onCircleRate.toFixed(2)}%`,
      normalRange: 'Tergantung map',
      status: classifyOnCircle(metrics.onCircleRate),
      note: 'Persentase notes yang merupakan circle-type (bukan slider/spinner). Info komposisi map, bukan indikator cheat.',
    },
    {
      indicator: 'Total miss (incl. slider break)',
      value: `${metrics.circleMissCount} / ${metrics.circleCount} notes`,
      normalRange: '> 0',
      status: classifyMiss(metrics.circleMissCount, metrics.circleCount),
      note: '0 miss dari banyak notes = sangat mencurigakan',
    },
    {
      indicator: 'Hit rate keseluruhan',
      value: `${metrics.hitRate.toFixed(2)}%`,
      normalRange: '–',
      status: classifyHitRate(metrics.hitRate),
    },
    // ── Summary ───────────────────────────────────────────────────────────────
    {
      indicator: 'Total notes dianalisis',
      value: `${metrics.totalNotes} (${metrics.hitCount} hit, ${metrics.missCount} miss)`,
      normalRange: '–',
      status: 'normal',
    },
  ];

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.03]">
            <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs uppercase tracking-wider">
              Indikator
            </th>
            <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs uppercase tracking-wider">
              Nilai
            </th>
            <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs uppercase tracking-wider hidden md:table-cell">
              Range Normal
            </th>
            <th className="text-left px-5 py-3.5 text-white/40 font-medium text-xs uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-white/[0.02] transition-colors duration-150 group"
            >
              <td className="px-5 py-3.5">
                <p className="text-white/70 font-medium">{row.indicator}</p>
                {row.note && (
                  <p className="text-white/25 text-[10px] mt-0.5 leading-snug">{row.note}</p>
                )}
              </td>
              <td className="px-5 py-3.5 text-white font-mono text-xs">
                {row.value}
              </td>
              <td className="px-5 py-3.5 text-white/30 text-xs hidden md:table-cell">
                {row.normalRange}
              </td>
              <td className="px-5 py-3.5">{badge(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
