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
  if (total < 5) return { label: 'Data Sedikit', color: '#6b7280', emoji: '📊', desc: 'Tidak cukup data' };

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
    return { label: 'Bimodal', color: '#ef4444', emoji: '⚠️', desc: 'Dua puncak — pola tidak biasa' };
  }
  if (kurtosis > 4) {
    return { label: 'Leptokurtic', color: '#f59e0b', emoji: '📐', desc: 'Puncak sangat tajam — presisi tinggi' };
  }
  if (skewness > 1) {
    return { label: 'Skewed Kanan', color: '#eab308', emoji: '↗️', desc: 'Ekor panjang ke kanan' };
  }
  if (skewness < -1) {
    return { label: 'Skewed Kiri', color: '#eab308', emoji: '↙️', desc: 'Ekor panjang ke kiri' };
  }
  if (Math.abs(skewness) <= 0.5 && kurtosis >= -1.5 && kurtosis <= 2) {
    return { label: 'Normal', color: '#22c55e', emoji: '✅', desc: 'Distribusi simetris — pola manusia wajar' };
  }
  if (skewness > 0.5) {
    return { label: 'Agak Skewed Kanan', color: '#84cc16', emoji: '↗️', desc: 'Sedikit condong ke kanan' };
  }
  if (skewness < -0.5) {
    return { label: 'Agak Skewed Kiri', color: '#84cc16', emoji: '↙️', desc: 'Sedikit condong ke kiri' };
  }
  if (kurtosis < -1.5) {
    return { label: 'Platykurtic', color: '#3b82f6', emoji: '📏', desc: 'Distribusi sangat datar' };
  }
  return { label: 'Normal', color: '#22c55e', emoji: '✅', desc: 'Distribusi wajar' };
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
    <div className="bg-[#1a1a27] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/60 mb-0.5">
        {label !== undefined ? `${label}ms` : ''}
      </p>
      {barPayload && (
        <p className="text-pink-400 font-semibold">{barPayload.value} note</p>
      )}
      {curvePayload && (
        <p className="text-purple-400/60 text-[10px]">
          curve: {Number(curvePayload.value).toFixed(1)}
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
      <div className="flex items-center justify-center h-64 text-white/20 text-sm">
        Tidak ada data hit error
      </div>
    );
  }

  return (
    <div className="relative w-full h-72">
      {/* Distribution classification badge */}
      {classification && (
        <div className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm"
          style={{
            backgroundColor: `${classification.color}18`,
            color: classification.color,
            border: `1px solid ${classification.color}30`,
          }}
        >
          <span>{classification.emoji}</span>
          <span>{classification.label}</span>
        </div>
      )}
      {classification && (
        <p className="absolute top-7 right-0 z-10 text-[9px] max-w-[160px] text-right"
          style={{ color: `${classification.color}99` }}
        >
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
              <stop offset="0%" stopColor="#c084fc" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#c084fc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="bin"
            tickFormatter={(v) => `${v}ms`}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine
            x={0}
            stroke="rgba(255,102,171,0.6)"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{
              value: '0',
              fill: '#ff66ab',
              fontSize: 10,
              position: 'top',
            }}
          />

          {/* Bars */}
          <Bar dataKey="count" maxBarSize={20} radius={[2, 2, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={`hit-${entry.bin}`}
                fill={
                  entry.bin >= -5 && entry.bin <= 5
                    ? '#60a5fa'
                    : 'rgba(148,163,184,0.4)'
                }
              />
            ))}
          </Bar>

          {/* Smooth distribution curve */}
          <Area
            type="monotone"
            dataKey="smoothed"
            stroke="#c084fc"
            strokeWidth={2.5}
            fill="url(#hitErrorCurveGrad)"
            fillOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
