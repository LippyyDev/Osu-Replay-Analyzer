'use client';

import { ScoreBreakdown } from '@/lib/types';
import ScoreGauge from './ScoreGauge';
import {
  MousePointerClick,
  Crosshair,
  Target,
  CircleX,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  subtitle: string;
  score: number;
  metricValue: string;
  metricLabel: string;
  description: string;
  icon: React.ReactNode;
  weight: string;
  accentColor: string; // e.g. 'var(--color-neo-blue)'
  accentText: string;  // e.g. 'text-white' or 'text-black'
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'HIGH RISK';
  if (score >= 50) return 'SUSPICIOUS';
  if (score >= 25) return 'INCONCLUSIVE';
  return 'NORMAL';
}

function getScoreColors(score: number): { bg: string; text: string; bar: string } {
  if (score >= 75) return {
    bg: 'bg-[var(--color-neo-red)]',
    text: 'text-white',
    bar: 'bg-[var(--color-neo-red)]',
  };
  if (score >= 50) return {
    bg: 'bg-[var(--color-neo-orange)]',
    text: 'text-black',
    bar: 'bg-[var(--color-neo-orange)]',
  };
  if (score >= 25) return {
    bg: 'bg-[var(--color-neo-yellow)]',
    text: 'text-black',
    bar: 'bg-[var(--color-neo-yellow)]',
  };
  return {
    bg: 'bg-[var(--color-neo-green)]',
    text: 'text-black',
    bar: 'bg-[var(--color-neo-green)]',
  };
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
  accentColor,
  accentText,
}: MetricCardProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const scoreColors = getScoreColors(clampedScore);

  return (
    <div className="brutal-card p-5 flex flex-col gap-4 font-mono bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="p-2 brutal-border shadow-[2px_2px_0_0_#000] text-white"
            style={{ backgroundColor: accentColor }}
          >
            <span className={accentText}>{icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
            <p className="text-[10px] uppercase opacity-60 mt-0.5 font-bold">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 bg-white brutal-border p-1 shadow-[2px_2px_0_0_#000]">
          <ScoreGauge score={clampedScore} size="sm" />
        </div>
      </div>

      {/* Metric value */}
      <div
        className="px-3 py-3 brutal-border shadow-[2px_2px_0_0_#000]"
        style={{ backgroundColor: accentColor + '15' }}
      >
        <p className="text-[10px] uppercase font-black opacity-70 mb-1">{metricLabel}</p>
        <p className="text-2xl font-black" style={{ color: accentColor }}>
          {metricValue}
        </p>
      </div>

      {/* Status + progress bar */}
      <div className="space-y-2 mt-auto">
        <div className="flex justify-between items-center text-xs font-black uppercase">
          <span className={`px-2 py-0.5 brutal-border shadow-[2px_2px_0_0_#000] ${scoreColors.bg} ${scoreColors.text}`}>
            {getScoreLabel(clampedScore)}
          </span>
          <span className="opacity-70 bg-white px-2 py-0.5 brutal-border shadow-[2px_2px_0_0_#000]">
            WT: {weight}
          </span>
        </div>
        <div className="h-3 brutal-border bg-[var(--color-neo-bg)] overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-out ${scoreColors.bar}`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <p className="text-[10px] leading-relaxed uppercase opacity-70 mt-1 font-bold">{description}</p>
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

export function ScoreBreakdownCards({
  scores,
  metrics,
}: ScoreBreakdownCardsProps) {
  const cards: MetricCardProps[] = [
    {
      title: 'HoldTime Score',
      subtitle: 'Button hold duration',
      score: scores.holdtimeScore,
      metricValue: `${metrics.holdtimeUnder3ms.toFixed(1)}%`,
      metricLabel: 'HoldTime under 3ms',
      description:
        'Percentage of circle hits with duration under 3ms. A high value indicates auto-click behavior.',
      icon: <MousePointerClick className="w-5 h-5" />,
      weight: '50%',
      accentColor: 'var(--color-neo-blue)',
      accentText: 'text-white',
    },
    {
      title: 'HitError Score',
      subtitle: 'Timing consistency',
      score: scores.hitErrorScore,
      metricValue: `±${metrics.hitErrorStd.toFixed(2)}ms`,
      metricLabel: 'HitError Std Dev',
      description:
        'Standard deviation of click timing vs ideal. A very low value (under 10ms) is inhuman.',
      icon: <Crosshair className="w-5 h-5" />,
      weight: '30%',
      accentColor: 'var(--color-neo-pink)',
      accentText: 'text-white',
    },
    {
      title: 'OnCircle Score',
      subtitle: 'Circle density',
      score: scores.onCircleScore,
      metricValue: `${metrics.onCircleRate.toFixed(1)}%`,
      metricLabel: 'Circle Ratio',
      description:
        'Percentage of circle-type objects. Contextual info — Relax only clicks, no aim assist.',
      icon: <Target className="w-5 h-5" />,
      weight: 'Info',
      accentColor: 'var(--color-neo-green)',
      accentText: 'text-black',
    },
    {
      title: 'Miss Score',
      subtitle: 'Human error evidence',
      score: scores.circleMissScore,
      metricValue: `${metrics.circleMissCount} miss`,
      metricLabel: `out of ${metrics.circleCount} notes`,
      description:
        'Zero misses across many notes is a strong indicator of Relax hack.',
      icon: <CircleX className="w-5 h-5" />,
      weight: '20%',
      accentColor: 'var(--color-neo-orange)',
      accentText: 'text-black',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </div>
  );
}
