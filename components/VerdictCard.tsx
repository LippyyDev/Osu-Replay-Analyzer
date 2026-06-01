'use client';

import { AnalysisResult } from '@/lib/types';
import ScoreGauge from './ScoreGauge';
import { FileText, RotateCcw, ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

interface VerdictCardProps {
  result: AnalysisResult;
  onReset: () => void;
}

const verdictConfig = {
  red: {
    bg: 'from-red-950/80 to-red-900/40',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    icon: <ShieldAlert className="w-8 h-8" />,
    scoreColor: '#ef4444',
  },
  orange: {
    bg: 'from-orange-950/80 to-orange-900/40',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    icon: <AlertTriangle className="w-8 h-8" />,
    scoreColor: '#f97316',
  },
  yellow: {
    bg: 'from-yellow-950/80 to-yellow-900/40',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
    icon: <HelpCircle className="w-8 h-8" />,
    scoreColor: '#eab308',
  },
  green: {
    bg: 'from-green-950/80 to-green-900/40',
    border: 'border-green-500/30',
    text: 'text-green-400',
    glow: 'shadow-green-500/20',
    icon: <ShieldCheck className="w-8 h-8" />,
    scoreColor: '#22c55e',
  },
};

export default function VerdictCard({ result, onReset }: VerdictCardProps) {
  const cfg = verdictConfig[result.verdictColor];
  const score = result.scores.finalScore;

  return (
    <div
      className={`
        relative rounded-3xl border p-8 overflow-hidden
        bg-gradient-to-br ${cfg.bg} ${cfg.border}
        shadow-2xl ${cfg.glow}
      `}
    >
      {/* Background noise texture — data URL tidak bisa di Tailwind arbitrary value, pakai style prop */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none bg-repeat"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* Decorative blur blob */}
      <div
        className={`absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none`}
        style={{ backgroundColor: cfg.scoreColor }}
      />

      <div className="relative flex flex-col sm:flex-row items-center gap-6">
        {/* Gauge */}
        <div className="shrink-0">
          <ScoreGauge
            score={score}
            size="lg"
            color={cfg.scoreColor}
            label="Skor Kecurigaan"
          />
        </div>

        {/* Verdict text */}
        <div className="flex-1 text-center sm:text-left">
          <div className={`flex items-center gap-2 justify-center sm:justify-start mb-2 ${cfg.text}`}>
            {cfg.icon}
            <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              Hasil Analisis
            </span>
          </div>
          <h2
            className={`text-3xl sm:text-4xl font-black tracking-tight mb-2 ${cfg.text}`}
            style={{ textShadow: `0 0 30px ${cfg.scoreColor}40` }}
          >
            {result.verdict}
          </h2>
          <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
            <div className="flex items-center gap-1.5 text-white/40 text-sm">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-mono truncate max-w-[200px]">{result.fileName}</span>
            </div>
            <div className="text-white/20 text-xs">·</div>
            <span className="text-white/40 text-sm">{result.noteCount} note</span>
            <div className="text-white/20 text-xs">·</div>
            <span className={`font-bold text-sm ${cfg.text}`}>
              Skor: {score.toFixed(1)} / 100
            </span>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl
          bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
          text-white/60 hover:text-white text-sm font-medium
          transition-all duration-200 hover:scale-[1.03]"
        >
          <RotateCcw className="w-4 h-4" />
          Analisis File Lain
        </button>
      </div>
    </div>
  );
}
