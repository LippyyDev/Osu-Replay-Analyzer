'use client';

import { BarChart2, Shield, Target } from 'lucide-react';

interface ReportEmbedProps {
  reportData: Record<string, unknown>;
  reportType: 'relax' | 'steal';
}

const TYPE_CONFIG = {
  relax: {
    label: 'RELAX HACK ANALYSIS',
    color: 'bg-[var(--color-neo-pink)]',
    icon: Target,
  },
  steal: {
    label: 'REPLAY STEAL ANALYSIS',
    color: 'bg-[var(--color-neo-blue)]',
    icon: Shield,
  },
};

function DataRow({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—');
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-black/10 last:border-0">
      <span className="text-xs font-mono text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-mono font-bold text-right truncate max-w-[60%]">{display}</span>
    </div>
  );
}

export default function ReportEmbed({ reportData, reportType }: ReportEmbedProps) {
  const config = TYPE_CONFIG[reportType];
  const Icon   = config.icon;

  // Pick top-level keys for preview (max 12)
  const entries = Object.entries(reportData).slice(0, 12);

  return (
    <div className="border-[3px] border-black rounded-xl overflow-hidden shadow-[3px_3px_0_0_#000]">
      {/* Header */}
      <div className={`${config.color} px-4 py-3 flex items-center gap-3 border-b-[3px] border-black`}>
        <Icon className="w-5 h-5 text-white" />
        <span className="text-sm font-black font-mono text-white">{config.label}</span>
        <BarChart2 className="w-4 h-4 text-white ml-auto opacity-70" />
      </div>

      {/* Data */}
      <div className="bg-white p-4">
        {entries.length > 0 ? (
          entries.map(([k, v]) => <DataRow key={k} label={k} value={v} />)
        ) : (
          <p className="text-xs font-mono text-gray-400 text-center py-4">No data available</p>
        )}
        {Object.keys(reportData).length > 12 && (
          <p className="text-xs font-mono text-gray-400 text-center mt-2">
            +{Object.keys(reportData).length - 12} more fields
          </p>
        )}
      </div>
    </div>
  );
}
