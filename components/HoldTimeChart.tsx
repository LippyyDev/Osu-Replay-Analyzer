'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  BarChart,
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
// Log-Normal PDF fitting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log-Normal PDF:  f(x) = (1 / (x·σ·√(2π))) · exp(-(ln(x)-μ)² / (2σ²))
 *
 * Human holdtimes follow log-normal because:
 *   - Bounded at 0 (can't be negative)
 *   - Right-skewed (most taps are short, with a long tail of longer holds)
 *   - Multiplicative variation in motor control timing
 */
function logNormalPDF(x: number, mu: number, sigma: number): number {
  if (x <= 0 || sigma <= 0) return 0;
  const lnx = Math.log(x);
  return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) *
    Math.exp(-((lnx - mu) ** 2) / (2 * sigma ** 2));
}

interface LogNormalFit {
  mu: number;          // mean of ln(x)
  sigma: number;       // std of ln(x)
  curve: number[];     // fitted PDF scaled to histogram counts
  r2: number;          // R² goodness of fit (1.0 = perfect fit)
  medianMs: number;    // exp(μ) — the median in ms
  modeMs: number;      // exp(μ - σ²) — the mode (peak) in ms
}

function fitLogNormal(data: { bin: number; count: number }[]): LogNormalFit {
  // Reconstruct weighted samples from histogram bins
  // Each bin at position `bin` with count `count` contributes `count` samples
  const logValues: number[] = [];
  let totalCount = 0;

  for (const d of data) {
    if (d.bin > 0 && d.count > 0) {
      const lnBin = Math.log(d.bin);
      for (let i = 0; i < d.count; i++) {
        logValues.push(lnBin);
      }
      totalCount += d.count;
    }
  }

  if (logValues.length < 3) {
    return { mu: 0, sigma: 1, curve: data.map(() => 0), r2: 0, medianMs: 0, modeMs: 0 };
  }

  // MLE for log-normal: μ = mean(ln(x)), σ² = var(ln(x))
  const mu = logValues.reduce((a, b) => a + b, 0) / logValues.length;
  const variance = logValues.reduce((s, l) => s + (l - mu) ** 2, 0) / logValues.length;
  const sigma = Math.sqrt(variance);

  // Generate fitted PDF curve at each histogram bin position
  const binWidth = 1; // 1ms bins
  const curve = data.map((d) => {
    if (d.bin <= 0) return 0;
    const pdf = logNormalPDF(d.bin, mu, sigma);
    // Scale: expected count = PDF × totalSamples × binWidth
    return pdf * totalCount * binWidth;
  });

  // R² goodness of fit
  const counts = data.map((d) => d.count);
  const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const ssTotal = counts.reduce((s, c) => s + (c - meanCount) ** 2, 0);
  const ssResidual = counts.reduce((s, c, i) => s + (c - curve[i]) ** 2, 0);
  const r2 = ssTotal > 0 ? Math.max(0, 1 - ssResidual / ssTotal) : 0;

  const medianMs = Math.exp(mu);
  const modeMs = Math.exp(mu - sigma * sigma);

  return { mu, sigma, curve, r2, medianMs, modeMs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Peak detection (for bimodal detection — still uses Gaussian smoothing)
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

// ─────────────────────────────────────────────────────────────────────────────
// Distribution classification (holdtime-specific)
// ─────────────────────────────────────────────────────────────────────────────

interface DistributionClass {
  label: string;
  color: string;
  emoji: string;
  desc: string;
}

function classifyHoldtimeDistribution(
  data: { bin: number; count: number }[],
  fit: LogNormalFit
): DistributionClass {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total < 5) {
    return { label: 'Data Sedikit', color: '#6b7280', emoji: '📊', desc: 'Tidak cukup data untuk klasifikasi' };
  }

  // Peak detection for bimodal check
  const counts = data.map((d) => d.count);
  const smoothSigma = Math.max(2, Math.round(data.length / 15));
  const smoothed = gaussianSmooth(counts, smoothSigma);
  const peaks = findPeaks(smoothed, 0.25);

  // Weighted mean for ultra-short detection
  const mean = data.reduce((s, d) => s + d.bin * d.count, 0) / total;
  const variance = data.reduce((s, d) => s + d.count * (d.bin - mean) ** 2, 0) / total;
  const std = Math.sqrt(variance);

  // ── Priority 1: Bimodal detection ──────────────────────────────────────────
  if (peaks.length >= 2) {
    const lowPeak = peaks.some((p) => data[p]?.bin <= 10);
    const highPeak = peaks.some((p) => data[p]?.bin >= 30);
    if (lowPeak && highPeak) {
      return {
        label: 'Bimodal',
        color: '#ef4444',
        emoji: '🔴',
        desc: `Dua cluster terpisah — pola klasik Relax hack (R²=${fit.r2.toFixed(2)})`,
      };
    }
    return {
      label: 'Multi-modal',
      color: '#f59e0b',
      emoji: '⚠️',
      desc: `Beberapa cluster holdtime (R²=${fit.r2.toFixed(2)})`,
    };
  }

  // ── Priority 2: Ultra-short peak (relax hack signature) ────────────────────
  if (mean <= 5 && std <= 3) {
    return {
      label: 'Ultra-short Peak',
      color: '#ef4444',
      emoji: '🔴',
      desc: `Puncak di ≤5ms — auto-click signature (R²=${fit.r2.toFixed(2)})`,
    };
  }

  // ── Priority 3: Log-normal fit quality ─────────────────────────────────────
  if (fit.r2 >= 0.7) {
    return {
      label: 'Log-Normal',
      color: '#22c55e',
      emoji: '✅',
      desc: `Cocok distribusi manusia (R²=${fit.r2.toFixed(2)}, median=${fit.medianMs.toFixed(0)}ms)`,
    };
  }

  if (fit.r2 >= 0.4) {
    return {
      label: 'Mendekati Log-Normal',
      color: '#84cc16',
      emoji: '🟡',
      desc: `Cukup mirip pola manusia (R²=${fit.r2.toFixed(2)}, median=${fit.medianMs.toFixed(0)}ms)`,
    };
  }

  // ── Priority 4: Poor fit — check why ───────────────────────────────────────
  const skewness = std > 0
    ? data.reduce((s, d) => s + d.count * ((d.bin - mean) / std) ** 3, 0) / total
    : 0;
  const kurtosis = std > 0
    ? data.reduce((s, d) => s + d.count * ((d.bin - mean) / std) ** 4, 0) / total - 3
    : 0;

  if (kurtosis > 4) {
    return {
      label: 'Leptokurtic',
      color: '#f59e0b',
      emoji: '📐',
      desc: `Puncak sangat tajam — presisi tidak wajar (R²=${fit.r2.toFixed(2)})`,
    };
  }

  if (skewness < -0.5) {
    return {
      label: 'Skewed Kiri',
      color: '#eab308',
      emoji: '↙️',
      desc: `Ekor ke kiri — tidak sesuai pola manusia (R²=${fit.r2.toFixed(2)})`,
    };
  }

  return {
    label: 'Tidak Log-Normal',
    color: '#eab308',
    emoji: '⚠️',
    desc: `Distribusi tidak cocok pola manusia (R²=${fit.r2.toFixed(2)})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface HoldTimeChartProps {
  distribution: { range: string; count: number }[];
  histogram?: { bin: number; count: number }[];
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
  const bin = typeof label === 'number' ? label : 0;
  const isSuspicious = bin <= 3;
  const isOverflow = bin === 201;
  const barPayload = payload.find((p) => p.dataKey === 'count');
  const curvePayload = payload.find((p) => p.dataKey === 'fitted');
  return (
    <div className="bg-[#1a1a27] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/60 mb-0.5">
        {isOverflow ? '>200ms' : `${label}ms`}
      </p>
      {barPayload && (
        <p className={`font-semibold ${isSuspicious ? 'text-red-400' : 'text-blue-400'}`}>
          {barPayload.value} note (aktual)
        </p>
      )}
      {curvePayload && (
        <p className="text-cyan-400/70 text-[10px]">
          log-normal fit: {Number(curvePayload.value).toFixed(1)}
        </p>
      )}
    </div>
  );
};

export default function HoldTimeChart({ distribution, histogram }: HoldTimeChartProps) {
  const hasHistogram = histogram && histogram.length > 0;
  const hasBucketed = distribution.length > 0 && distribution.some((d) => d.count > 0);

  const { chartData, classification, fit } = useMemo(() => {
    if (!hasHistogram || !histogram) return { chartData: null, classification: null, fit: null };

    // Fit log-normal distribution to the histogram
    const fit = fitLogNormal(histogram);

    const chartData = histogram.map((d, i) => ({
      ...d,
      fitted: fit.curve[i],
    }));

    const classification = classifyHoldtimeDistribution(histogram, fit);
    return { chartData, classification, fit };
  }, [histogram, hasHistogram]);

  if (!hasHistogram && !hasBucketed) {
    return (
      <div className="flex items-center justify-center h-64 text-white/20 text-sm">
        Tidak ada data holdtime
      </div>
    );
  }

  // Detailed histogram mode with log-normal curve
  if (chartData && chartData.length > 0 && fit) {
    return (
      <div className="relative w-full h-72">
        {/* Distribution classification badge */}
        {classification && (
          <div
            className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm"
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
          <p
            className="absolute top-7 right-0 z-10 text-[9px] max-w-[180px] text-right leading-tight"
            style={{ color: `${classification.color}99` }}
          >
            {classification.desc}
          </p>
        )}
        {/* Log-normal parameters */}
        <div className="absolute top-0 left-0 z-10 text-[9px] text-white/25 leading-tight">
          <span>μ={fit.mu.toFixed(2)} σ={fit.sigma.toFixed(2)}</span>
          <br />
          <span>mode={fit.modeMs.toFixed(0)}ms med={fit.medianMs.toFixed(0)}ms</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            barCategoryGap="2%"
          >
            <defs>
              <linearGradient id="holdTimeCurveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              dataKey="bin"
              tickFormatter={(v) => (v === 201 ? '>200' : `${v}ms`)}
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <ReferenceLine
              x={3}
              stroke="rgba(239,68,68,0.6)"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: '3ms',
                fill: '#ef4444',
                fontSize: 10,
                position: 'top',
              }}
            />
            <ReferenceLine
              x={10}
              stroke="rgba(251,191,36,0.4)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{
                value: '10ms',
                fill: '#fbbf24',
                fontSize: 10,
                position: 'top',
              }}
            />

            {/* Histogram bars */}
            <Bar dataKey="count" maxBarSize={20} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={`ht-${entry.bin}`}
                  fill={
                    entry.bin <= 3
                      ? '#ef4444'
                      : entry.bin <= 10
                        ? '#f59e0b'
                        : '#3b82f6'
                  }
                  opacity={entry.count === 0 ? 0.15 : 0.85}
                />
              ))}
            </Bar>

            {/* Log-normal fitted distribution curve */}
            <Area
              type="monotone"
              dataKey="fitted"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#holdTimeCurveGrad)"
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

  // Fallback: legacy bucketed distribution
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={distribution}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          barCategoryGap="15%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="range"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {distribution.map((entry) => {
              const isRed = ['1ms', '2ms', '3ms'].includes(entry.range);
              return (
                <Cell
                  key={`ht-${entry.range}`}
                  fill={isRed ? '#ef4444' : '#3b82f6'}
                  opacity={entry.count === 0 ? 0.2 : 0.85}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
