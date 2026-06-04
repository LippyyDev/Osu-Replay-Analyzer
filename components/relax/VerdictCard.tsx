'use client';

import { AnalysisResult } from '@/lib/types';
import ScoreGauge from './ScoreGauge';
import { FileText, RotateCcw, AlertTriangle, ShieldCheck, Search, Flag } from 'lucide-react';

interface VerdictCardProps {
  result: AnalysisResult;
  onReset?: () => void;
}

export default function VerdictCard({ result, onReset }: VerdictCardProps) {
  const score = result.scores.finalScore;

  const getVerdictStyle = (s: number) => {
    if (s >= 75) return {
      bg: 'bg-[var(--color-neo-red)]',
      text: 'text-white',
      title: 'HIGH RISK DETECTED',
      icon: <AlertTriangle className="w-8 h-8 md:w-12 md:h-12" />,
      verdictTitle: 'HIGH RISK DETECTED',
    };
    if (s >= 50) return {
      bg: 'bg-[var(--color-neo-orange)]',
      text: 'text-black',
      title: 'SUSPICIOUS PATTERN',
      icon: <Flag className="w-8 h-8 md:w-12 md:h-12" />,
      verdictTitle: 'SUSPICIOUS PATTERN',
    };
    if (s >= 25) return {
      bg: 'bg-[var(--color-neo-yellow)]',
      text: 'text-black',
      title: 'ANOMALY DETECTED',
      icon: <Search className="w-8 h-8 md:w-12 md:h-12" />,
      verdictTitle: 'ANOMALY DETECTED',
    };
    return {
      bg: 'bg-[var(--color-neo-green)]',
      text: 'text-black',
      title: 'CLEAN RECORD',
      icon: <ShieldCheck className="w-8 h-8 md:w-12 md:h-12" />,
      verdictTitle: 'CLEAN RECORD',
    };
  };

  const style = getVerdictStyle(score);

  return (
    <div className={`relative brutal-card p-8 overflow-hidden ${style.bg} ${style.text}`}>
      <div className="relative flex flex-col sm:flex-row items-center gap-8">
        {/* Gauge */}
        <div className="shrink-0 bg-white brutal-border p-4 shadow-[4px_4px_0_0_#000]">
          <ScoreGauge
            score={score}
            size="lg"
            color="#FF69B4"
            label="SUSPICION SCORE"
          />
        </div>

        {/* Verdict text */}
        <div className="flex-1 text-center sm:text-left font-mono">
          <div className="flex items-center gap-3 justify-center sm:justify-start mb-3 bg-white text-black w-fit brutal-border px-3 py-1 shadow-[2px_2px_0_0_#000] mx-auto sm:mx-0">
            {style.icon}
            <span className="text-sm font-bold uppercase tracking-widest">
              {style.verdictTitle}
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 uppercase">
            [{style.title}]
          </h2>
          
          <div className="flex items-center gap-4 justify-center sm:justify-start flex-wrap bg-white text-black brutal-border p-2 shadow-[2px_2px_0_0_#000] text-sm font-bold">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{result.fileName || 'Replay'}</span>
            </div>
            <div className="w-1 h-4 bg-black"></div>
            <span>{result.noteCount || 0} NOTES</span>
            <div className="w-1 h-4 bg-black"></div>
            <span>SCORE: {score.toFixed(1)}/100</span>
          </div>
        </div>

        {/* Reset button */}
        {onReset && (
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-2 px-6 py-3 font-mono font-bold text-sm bg-white text-black brutal-btn uppercase"
          >
            <RotateCcw className="w-5 h-5" />
            ANALYZE ANOTHER
          </button>
        )}
      </div>
    </div>
  );
}

