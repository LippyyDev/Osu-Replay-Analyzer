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
    return { label: 'Data Sedikit', color: 'black', emoji: '📊', desc: 'Tidak cukup data untuk klasifikasi' };
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
        color: 'var(--color-neo-red)',
        emoji: '🔴',
        desc: `Dua cluster terpisah — pola klasik Relax hack (R²=${fit.r2.toFixed(2)})`,
      };
    }
    return {
      label: 'Multi-modal',
      color: 'var(--color-neo-yellow)',
      emoji: '⚠️',
      desc: `Beberapa cluster holdtime (R²=${fit.r2.toFixed(2)})`,
    };
  }

  // ── Priority 2: Ultra-short peak (relax hack signature) ────────────────────
  if (mean <= 5 && std <= 3) {
    return {
      label: 'Ultra-short Peak',
      color: 'var(--color-neo-red)',
      emoji: '🔴',
      desc: `Puncak di ≤5ms — auto-click signature (R²=${fit.r2.toFixed(2)})`,
    };
  }

  // ── Priority 3: Log-normal fit quality ─────────────────────────────────────
  if (fit.r2 >= 0.7) {
    return {
      label: 'Log-Normal',
      color: 'var(--color-neo-green)',
      emoji: '✅',
      desc: `Cocok distribusi manusia (R²=${fit.r2.toFixed(2)}, median=${fit.medianMs.toFixed(0)}ms)`,
    };
  }

  if (fit.r2 >= 0.4) {
    return {
      label: 'Mendekati Log-Normal',
      color: 'var(--color-neo-green)',
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
      color: 'var(--color-neo-yellow)',
      emoji: '📐',
      desc: `Puncak sangat tajam — presisi tidak wajar (R²=${fit.r2.toFixed(2)})`,
    };
  }

  if (skewness < -0.5) {
    return {
      label: 'Skewed Kiri',
      color: 'var(--color-neo-yellow)',
      emoji: '↙️',
      desc: `Ekor ke kiri — tidak sesuai pola manusia (R²=${fit.r2.toFixed(2)})`,
    };
  }

  return {
    label: 'Tidak Log-Normal',
    color: 'var(--color-neo-yellow)',
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
    <div className="bg-white border-2 border-black rounded-none px-3 py-2 text-xs shadow-[4px_4px_0_0_#000] font-mono">
      <p className="text-black font-bold mb-1 uppercase">
        [{isOverflow ? '>200MS' : `${label}MS`}]
      </p>
      {barPayload && (
        <p className={`font-black uppercase ${isSuspicious ? 'text-[var(--color-neo-red)]' : 'text-[var(--color-neo-blue)]'}`}>
          {barPayload.value} NOTES
        </p>
      )}
      {curvePayload && (
        <p className="text-black/60 font-bold uppercase mt-1">
          FIT: {Number(curvePayload.value).toFixed(1)}
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
      <div className="flex items-center justify-center h-64 text-black/50 font-bold uppercase text-sm font-mono">
        NO DATA AVAILABLE
      </div>
    );
  }

  // Detailed histogram mode with log-normal curve
  if (chartData && chartData.length > 0 && fit) {
    return (
      <div className="relative w-full h-72 font-mono">
        {/* Distribution classification badge */}
        {classification && (
          <div
            className="absolute top-0 right-0 z-10 flex items-center gap-2 px-3 py-1 font-bold text-[10px] brutal-border bg-white text-black shadow-[2px_2px_0_0_#000]"
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
          <p
            className="absolute top-8 right-0 z-10 text-[9px] font-bold uppercase max-w-[180px] text-right leading-tight text-black/60"
          >
            {classification.desc}
          </p>
        )}
        {/* Log-normal parameters */}
        <div className="absolute top-0 left-0 z-10 text-[9px] font-bold uppercase text-black/40 leading-tight">
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
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(0,0,0,0.15)"
            />
            <XAxis
              dataKey="bin"
              tickFormatter={(v) => (v === 201 ? '>200' : `${v}ms`)}
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            />
            <ReferenceLine
              x={3}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: '3ms',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 'bold',
                position: 'top',
              }}
            />
            <ReferenceLine
              x={10}
              stroke="#eab308"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: '10ms',
                fill: '#eab308',
                fontSize: 10,
                fontWeight: 'bold',
                position: 'top',
              }}
            />

            {/* Histogram bars */}
            <Bar dataKey="count" maxBarSize={20} radius={[0, 0, 0, 0]} stroke="#000" strokeWidth={1}>
              {chartData.map((entry) => (
                <Cell
                  key={`ht-${entry.bin}`}
                  fill={
                    entry.bin <= 3
                      ? '#ef4444'
                      : entry.bin <= 10
                        ? '#eab308'
                        : '#3b82f6'
                  }
                  opacity={entry.count === 0 ? 0.2 : 1}
                />
              ))}
            </Bar>

            {/* Log-normal fitted distribution curve */}
            <Area
              type="monotone"
              dataKey="fitted"
              stroke="#06b6d4"
              strokeWidth={3}
              fill="url(#holdTimeCurveGrad)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4', stroke: '#000', strokeWidth: 2 }}
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
    <div className="w-full h-72 font-mono">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={distribution}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          barCategoryGap="15%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(0,0,0,0.15)"
          />
          <XAxis
            dataKey="range"
            tick={{ fill: 'black', fontSize: 10, fontWeight: 'bold' }}
            axisLine={{ stroke: 'black', strokeWidth: 2 }}
            tickLine={{ stroke: 'black', strokeWidth: 2 }}
          />
          <YAxis
            tick={{ fill: 'black', fontSize: 10, fontWeight: 'bold' }}
            axisLine={{ stroke: 'black', strokeWidth: 2 }}
            tickLine={{ stroke: 'black', strokeWidth: 2 }}
            width={36}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />
          <Bar dataKey="count" radius={[0, 0, 0, 0]} maxBarSize={48} stroke="#000" strokeWidth={2}>
            {distribution.map((entry) => {
              const isRed = ['1ms', '2ms', '3ms'].includes(entry.range);
              return (
                <Cell
                  key={`ht-${entry.range}`}
                  fill={isRed ? '#ef4444' : '#3b82f6'}
                  opacity={entry.count === 0 ? 0.2 : 1}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
