'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Gaussian smoothing + distribution classification
// ─────────────────────────────────────────────────────────────────────────────

function gaussianSmooth(values: number[], sigma: number): number[] {
  const radius = Math.ceil(sigma * 3);
  const kernel: number[] = [];
  for (let i = -radius; i <= radius; i++) {
    kernel.push(Math.exp(-0.5 * (i / sigma) ** 2));
  }
  return values.map((_, idx) => {
    let sum = 0, wt = 0;
    for (let k = 0; k < kernel.length; k++) {
      const j = idx + k - radius;
      if (j >= 0 && j < values.length) {
        sum += values[j] * kernel[k];
        wt += kernel[k];
      }
    }
    return wt > 0 ? sum / wt : 0;
  });
}

function findPeaks(values: number[], minProminence: number = 0.25): number[] {
  const maxV = Math.max(...values);
  if (maxV === 0) return [];
  const thresh = maxV * minProminence;
  const raw: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] >= values[i - 1] && values[i] >= values[i + 1] &&
        values[i] >= thresh &&
        (values[i] > values[i - 1] || values[i] > values[i + 1])) {
      raw.push(i);
    }
  }
  // Merge peaks within 5 bins
  const merged: number[] = [];
  for (const p of raw) {
    if (merged.length === 0 || p - merged[merged.length - 1] > 5) {
      merged.push(p);
    } else if (values[p] > values[merged[merged.length - 1]]) {
      merged[merged.length - 1] = p;
    }
  }
  return merged;
}

interface DistributionClass {
  label: string;
  color: string;
  emoji: string;
  desc: string;
}

function classifyDistribution(
  data: { bin: number; count: number }[],
  smoothed: number[]
): DistributionClass {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total < 5) return { label: 'Data Sedikit', color: 'black', emoji: '📊', desc: 'Tidak cukup data' };

  const mean = data.reduce((s, d) => s + d.bin * d.count, 0) / total;
  const variance = data.reduce((s, d) => s + d.count * (d.bin - mean) ** 2, 0) / total;
  const std = Math.sqrt(variance);

  const skewness = std > 0
    ? data.reduce((s, d) => s + d.count * ((d.bin - mean) / std) ** 3, 0) / total
    : 0;
  const kurtosis = std > 0
    ? data.reduce((s, d) => s + d.count * ((d.bin - mean) / std) ** 4, 0) / total - 3
    : 0;

  const peaks = findPeaks(smoothed, 0.3);

  if (peaks.length >= 2) {
    return { label: 'Bimodal', color: 'var(--color-neo-red)', emoji: '⚠️', desc: 'Dua puncak — pola tidak biasa' };
  }
  if (kurtosis > 4) {
    return { label: 'Leptokurtic', color: 'var(--color-neo-yellow)', emoji: '📐', desc: 'Puncak sangat tajam — presisi tinggi' };
  }
  if (skewness > 1) {
    return { label: 'Skewed Kanan', color: 'var(--color-neo-yellow)', emoji: '↗️', desc: 'Ekor panjang ke kanan' };
  }
  if (skewness < -1) {
    return { label: 'Skewed Kiri', color: 'var(--color-neo-yellow)', emoji: '↙️', desc: 'Ekor panjang ke kiri' };
  }
  if (Math.abs(skewness) <= 0.5 && kurtosis >= -1.5 && kurtosis <= 2) {
    return { label: 'Normal', color: 'var(--color-neo-green)', emoji: '✅', desc: 'Distribusi simetris — pola wajar' };
  }
  if (skewness > 0.5) {
    return { label: 'Agak Skewed Kanan', color: 'var(--color-neo-green)', emoji: '↗️', desc: 'Sedikit condong ke kanan' };
  }
  if (skewness < -0.5) {
    return { label: 'Agak Skewed Kiri', color: 'var(--color-neo-green)', emoji: '↙️', desc: 'Sedikit condong ke kiri' };
  }
  if (kurtosis < -1.5) {
    return { label: 'Platykurtic', color: 'var(--color-neo-blue)', emoji: '📏', desc: 'Distribusi sangat datar' };
  }
  return { label: 'Normal', color: 'var(--color-neo-green)', emoji: '✅', desc: 'Distribusi wajar' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface HitErrorChartProps {
  histogram: { bin: number; count: number }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  const barPayload = payload.find((p) => p.dataKey === 'count');
  const curvePayload = payload.find((p) => p.dataKey === 'smoothed');
  return (
    <div className="bg-white border-2 border-black rounded-none px-3 py-2 text-xs shadow-[4px_4px_0_0_#000] font-mono">
      <p className="text-black font-bold mb-1">
        [{label !== undefined ? `${label}MS` : ''}]
      </p>
      {barPayload && (
        <p className="text-black font-black">{barPayload.value} NOTES</p>
      )}
      {curvePayload && (
        <p className="text-black/60 font-bold uppercase mt-1">
          CURVE: {Number(curvePayload.value).toFixed(1)}
        </p>
      )}
    </div>
  );
};

export default function HitErrorChart({ histogram }: HitErrorChartProps) {
  const { chartData, classification } = useMemo(() => {
    if (histogram.length === 0) return { chartData: [], classification: null };

    const counts = histogram.map((d) => d.count);
    const sigma = Math.max(2, Math.round(histogram.length / 15));
    const smoothed = gaussianSmooth(counts, sigma);

    const chartData = histogram.map((d, i) => ({
      ...d,
      smoothed: smoothed[i],
    }));

    const classification = classifyDistribution(histogram, smoothed);
    return { chartData, classification };
  }, [histogram]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-black/50 font-bold uppercase text-sm font-mono">
        NO DATA AVAILABLE
      </div>
    );
  }

  return (
    <div className="relative w-full h-72 font-mono">
      {/* Distribution classification badge */}
      {classification && (
        <div className="absolute top-0 right-0 z-10 flex items-center gap-2 px-3 py-1 font-bold text-[10px] brutal-border bg-white text-black shadow-[2px_2px_0_0_#000]"
          style={{
            borderLeftColor: classification.color,
            borderLeftWidth: '4px'
          }}
        >
          <span>{classification.emoji}</span>
          <span className="uppercase">{classification.label}</span>
        </div>
      )}
      {classification && (
        <p className="absolute top-8 right-0 z-10 text-[9px] font-bold uppercase max-w-[160px] text-right text-black/60">
          {classification.desc}
        </p>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          barCategoryGap="2%"
        >
          <defs>
            <linearGradient id="hitErrorCurveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#c084fc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(0,0,0,0.15)"
          />
          <XAxis
            dataKey="bin"
            tickFormatter={(v) => `${v}ms`}
            tick={{ fill: 'black', fontSize: 10, fontWeight: 'bold' }}
            axisLine={{ stroke: 'black', strokeWidth: 2 }}
            tickLine={{ stroke: 'black', strokeWidth: 2 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'black', fontSize: 10, fontWeight: 'bold' }}
            axisLine={{ stroke: 'black', strokeWidth: 2 }}
            tickLine={{ stroke: 'black', strokeWidth: 2 }}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          <ReferenceLine
            x={0}
            stroke="#ff66ab"
            strokeWidth={3}
            strokeDasharray="4 2"
            label={{
              value: '0',
              fill: '#ff66ab',
              fontSize: 10,
              fontWeight: 'bold',
              position: 'top',
            }}
          />

          {/* Bars */}
          <Bar dataKey="count" maxBarSize={20} radius={[0, 0, 0, 0]} stroke="#000" strokeWidth={1}>
            {chartData.map((entry) => (
              <Cell
                key={`hit-${entry.bin}`}
                fill={
                  entry.bin >= -5 && entry.bin <= 5
                    ? '#60a5fa'
                    : '#e2e8f0'
                }
              />
            ))}
          </Bar>

          {/* Smooth distribution curve */}
          <Area
            type="monotone"
            dataKey="smoothed"
            stroke="#c084fc"
            strokeWidth={3}
            fill="url(#hitErrorCurveGrad)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: '#c084fc', stroke: '#000', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
