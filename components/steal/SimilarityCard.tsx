'use client';

import { SimilarityResult } from '@/lib/types';
import { modNames } from '@/lib/types';
import { TrendingUp, Clock, Crosshair, MousePointer2, Target, Skull, ExternalLink } from 'lucide-react';

interface SimilarityCardProps {
  result: SimilarityResult;
  index: number;
}

const VERDICT_CONFIG = {
  'SANGAT MIRIP':   { bg: 'bg-[var(--color-neo-red)]',    text: 'text-white' },
  'MUNGKIN DICURI': { bg: 'bg-[var(--color-neo-yellow)]', text: 'text-black' },
  'MIRIP':          { bg: 'bg-[var(--color-neo-pink)]',   text: 'text-white' },
  'BERBEDA':        { bg: 'bg-[var(--color-neo-green)]',  text: 'text-black' },
} as const;

const ASPECT_CONFIG = [
  { key: 'aimSimilarity',      label: 'AIM TRAJECTORY',  icon: MousePointer2, color: 'bg-black' },
  { key: 'positionSimilarity', label: 'HIT POSITION',    icon: Crosshair,     color: 'bg-black' },
  { key: 'timingSimilarity',   label: 'HIT ERROR',       icon: Clock,         color: 'bg-black' },
  { key: 'holdtimeSimilarity', label: 'HOLD TIME',       icon: TrendingUp,    color: 'bg-black' },
  { key: 'missSimilarity',     label: 'MISS PATTERN',    icon: Skull,         color: 'bg-black' },
] as const;

/** Arc/gauge SVG for the overall similarity score */
function SimilarityGauge({ score }: { score: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;

  return (
    <div className="relative flex items-center justify-center bg-white brutal-border shadow-[2px_2px_0_0_#000] p-2" style={{ width: 110, height: 110 }}>
      <svg width={90} height={90} viewBox="0 0 110 110" className="-rotate-90">
        {/* Track */}
        <circle cx={55} cy={55} r={R} fill="none" stroke="#e5e7eb" strokeWidth={12} />
        {/* Progress */}
        <circle
          cx={55} cy={55} r={R}
          fill="none"
          stroke="#000"
          strokeWidth={12}
          strokeLinecap="square"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span className="text-xl font-black text-black">{score}<span className="text-xs font-bold">%</span></span>
      </div>
    </div>
  );
}

function AspectBar({ label, icon: Icon, value, color }: { label: string; icon: React.ElementType; value: number; color: string }) {
  return (
    <div className="space-y-1 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white brutal-border p-0.5">
            <Icon className="w-3 h-3 text-black" />
          </div>
          <span className="text-[10px] font-bold text-black uppercase">{label}</span>
        </div>
        <span className="text-[10px] font-black text-black">{value}%</span>
      </div>
      <div className="h-3 brutal-border bg-white overflow-hidden p-[1px]">
        <div
          className={`h-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function SimilarityCard({ result, index }: SimilarityCardProps) {
  const cfg = VERDICT_CONFIG[result.verdict];
  const ls  = result.leaderboardScore;

  return (
    <div
      className={`brutal-card p-6 space-y-6 transition-all duration-300 ${cfg.bg} ${cfg.text}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 font-mono">
        <div className="min-w-0 flex-1 bg-white brutal-border p-3 text-black shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 shrink-0 text-black" />
            <span className="text-xs font-bold truncate uppercase bg-[var(--color-neo-yellow)] px-1 border border-black">
              [{result.targetLabel}]
            </span>
          </div>
          <h3 className="text-sm font-black truncate">{result.comparedLabel}</h3>
          {ls && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold bg-[var(--color-neo-bg)] px-2 brutal-border">
                #{ls.rank} · {ls.accuracy.toFixed(2)}% · {ls.maxCombo}x
              </span>
              {ls.mods !== 0 && (
                <span className="text-[10px] font-bold bg-[var(--color-neo-pink)] text-white px-2 brutal-border">
                  +{modNames(ls.mods).join('')}
                </span>
              )}
              {ls.pp && (
                <span className="text-[10px] font-bold bg-[var(--color-neo-blue)] text-white px-2 brutal-border">
                  {Math.round(ls.pp)}pp
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 brutal-border shadow-[2px_2px_0_0_#000] bg-white text-black`}>
            {result.verdict}
          </span>
          {ls && (
            <a
              href={`https://osu.ppy.sh/scores/${ls.scoreId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold font-mono bg-black text-white px-2 py-1 brutal-border hover:bg-[var(--color-neo-yellow)] hover:text-black transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              OSU WEB
            </a>
          )}
        </div>
      </div>

      {/* Gauge + breakdown */}
      <div className="flex items-center gap-6 bg-white brutal-border p-4 shadow-[4px_4px_0_0_#000]">
        <SimilarityGauge score={result.overallSimilarity} />

        <div className="flex-1 space-y-3">
          {ASPECT_CONFIG.map(({ key, label, icon, color }) => (
            <AspectBar
              key={key}
              label={label}
              icon={icon}
              value={result.breakdown[key]}
              color={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
