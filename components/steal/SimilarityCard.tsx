'use client';

import { SimilarityResult } from '@/lib/types';
import { modNames } from '@/lib/types';
import { TrendingUp, Clock, Crosshair, MousePointer2, Target, Skull, ExternalLink } from 'lucide-react';

interface SimilarityCardProps {
  result: SimilarityResult;
  index: number;
}

const VERDICT_CONFIG = {
  'SANGAT MIRIP':   { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    ring: '#ef4444' },
  'MUNGKIN DICURI': { bg: 'bg-orange-500/10',  border: 'border-orange-500/30', text: 'text-orange-400', ring: '#f97316' },
  'MIRIP':          { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30', text: 'text-yellow-400', ring: '#eab308' },
  'BERBEDA':        { bg: 'bg-green-500/10',   border: 'border-green-500/30',  text: 'text-green-400',  ring: '#22c55e' },
} as const;

const ASPECT_CONFIG = [
  { key: 'aimSimilarity',      label: 'Aim Trajectory',  icon: MousePointer2, color: '#a78bfa' },
  { key: 'positionSimilarity', label: 'Hit Position',    icon: Crosshair,     color: '#60a5fa' },
  { key: 'timingSimilarity',   label: 'Timing / Hit Error', icon: Clock,      color: '#34d399' },
  { key: 'holdtimeSimilarity', label: 'HoldTime Pattern', icon: TrendingUp,   color: '#fbbf24' },
  { key: 'missSimilarity',     label: 'Miss Pattern',    icon: Skull,         color: '#f87171' },
] as const;

/** Arc/gauge SVG for the overall similarity score */
function SimilarityGauge({ score, color }: { score: number; color: string }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width={110} height={110} viewBox="0 0 110 110" className="-rotate-90">
        {/* Track */}
        <circle cx={55} cy={55} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        {/* Progress */}
        <circle
          cx={55} cy={55} r={R}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white">{score}<span className="text-sm font-bold text-white/40">%</span></span>
      </div>
    </div>
  );
}

function AspectBar({ label, icon: Icon, value, color }: { label: string; icon: React.ElementType; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} />
          <span className="text-[11px] text-white/50">{label}</span>
        </div>
        <span className="text-[11px] font-semibold text-white/70">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
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
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 space-y-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-white/30 shrink-0" />
            <span className="text-xs text-white/40 truncate">{result.targetLabel}</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">{result.comparedLabel}</h3>
          {ls && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-white/30">
                {ls.rank} · {ls.accuracy.toFixed(2)}% · {ls.maxCombo}x
              </span>
              {ls.mods !== 0 && (
                <span className="text-[10px] text-yellow-400/60">
                  +{modNames(ls.mods).join('')}
                </span>
              )}
              {ls.pp && (
                <span className="text-[10px] text-blue-400/60">{Math.round(ls.pp)}pp</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            {result.verdict}
          </span>
          {ls && (
            <a
              href={`https://osu.ppy.sh/scores/${ls.scoreId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              osu!
            </a>
          )}
        </div>
      </div>

      {/* Gauge + breakdown */}
      <div className="flex items-center gap-5">
        <SimilarityGauge score={result.overallSimilarity} color={cfg.ring} />

        <div className="flex-1 space-y-2.5">
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
