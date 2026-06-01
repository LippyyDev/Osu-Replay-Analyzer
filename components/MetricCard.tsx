'use client';

import { ScoreBreakdown } from '@/lib/types';
import ScoreGauge from './ScoreGauge';

interface MetricCardProps {
  title: string;
  subtitle: string;
  score: number;
  metricValue: string;
  metricLabel: string;
  description: string;
  icon: React.ReactNode;
  weight: string;
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Sangat Mencurigakan';
  if (score >= 50) return 'Mencurigakan';
  if (score >= 25) return 'Abu-abu';
  return 'Wajar';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'from-red-500 to-red-600';
  if (score >= 50) return 'from-orange-500 to-orange-600';
  if (score >= 25) return 'from-yellow-500 to-yellow-600';
  return 'from-green-500 to-green-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return 'border-red-500/20 bg-red-500/5';
  if (score >= 50) return 'border-orange-500/20 bg-orange-500/5';
  if (score >= 25) return 'border-yellow-500/20 bg-yellow-500/5';
  return 'border-green-500/20 bg-green-500/5';
}

function getScoreTextColor(score: number): string {
  if (score >= 75) return 'text-red-400';
  if (score >= 50) return 'text-orange-400';
  if (score >= 25) return 'text-yellow-400';
  return 'text-green-400';
}

export default function MetricCard({
  title,
  subtitle,
  score,
  metricValue,
  metricLabel,
  description,
  icon,
  weight,
}: MetricCardProps) {
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div
      className={`
      relative rounded-2xl border p-5 flex flex-col gap-4
      bg-[#13131a] transition-all duration-300
      hover:scale-[1.02] hover:shadow-xl
      ${getScoreBgColor(clampedScore)}
    `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 text-pink-400">{icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">{title}</h3>
            <p className="text-xs text-white/40">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0">
          <ScoreGauge score={clampedScore} size="sm" />
        </div>
      </div>

      {/* Metric value */}
      <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">
          {metricLabel}
        </p>
        <p className={`text-xl font-bold ${getScoreTextColor(clampedScore)}`}>
          {metricValue}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className={`text-xs font-medium ${getScoreTextColor(clampedScore)}`}>
            {getScoreLabel(clampedScore)}
          </span>
          <span className="text-xs text-white/30">Bobot {weight}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(clampedScore)} transition-all duration-1000 ease-out`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <p className="text-xs text-white/30 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ScoreBreakdownCardsProps {
  scores: ScoreBreakdown;
  metrics: {
    holdtimeUnder3ms: number;
    hitErrorStd: number;
    onCircleRate: number;
    circleMissCount: number;
    circleCount: number;
  };
}

import {
  MousePointerClick,
  Crosshair,
  Target,
  CircleX,
} from 'lucide-react';

export function ScoreBreakdownCards({
  scores,
  metrics,
}: ScoreBreakdownCardsProps) {
  const cards: MetricCardProps[] = [
    {
      title: 'HoldTime Score',
      subtitle: 'Durasi tekan tombol (circle)',
      score: scores.holdtimeScore,
      metricValue: `${metrics.holdtimeUnder3ms.toFixed(1)}%`,
      metricLabel: 'HoldTime ≤ 3ms',
      description:
        'Persentase ketukan circle dengan durasi tekan ≤ 3ms. Nilai tinggi mengindikasikan klik otomatis (auto-click).',
      icon: <MousePointerClick className="w-4 h-4" />,
      weight: '50%',
    },
    {
      title: 'Hit Error Score',
      subtitle: 'Konsistensi timing klik',
      score: scores.hitErrorScore,
      metricValue: `±${metrics.hitErrorStd.toFixed(2)}ms`,
      metricLabel: 'Hit Error Std Dev',
      description:
        'Standar deviasi selisih waktu klik vs. waktu ideal. Nilai sangat rendah (<10ms) tidak wajar untuk manusia.',
      icon: <Crosshair className="w-4 h-4" />,
      weight: '30%',
    },
    {
      title: 'OnCircle Score',
      subtitle: 'Proporsi circle di map',
      score: scores.onCircleScore,
      metricValue: `${metrics.onCircleRate.toFixed(1)}%`,
      metricLabel: 'Circle Ratio',
      description:
        'Persentase notes yang merupakan circle-type objects (bukan slider/spinner). Ini info komposisi map — bukan indikator Relax. Relax hanya auto-click, bukan aim assist.',
      icon: <Target className="w-4 h-4" />,
      weight: 'Info',
    },
    {
      title: 'Miss Score',
      subtitle: 'Bukti kegagalan manusiawi',
      score: scores.circleMissScore,
      metricValue: `${metrics.circleMissCount} miss`,
      metricLabel: `dari ${metrics.circleCount} notes`,
      description:
        'Miss (termasuk slider break) adalah bukti ketidaksempurnaan manusiawi. Nol miss dari banyak notes adalah tanda Relax hack.',
      icon: <CircleX className="w-4 h-4" />,
      weight: '20%',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </div>
  );
}
