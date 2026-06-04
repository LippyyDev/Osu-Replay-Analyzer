'use client';

import React from 'react';
import { AnalysisMetrics } from '@/lib/types';
import { AlertCircle, CheckCircle2, AlertTriangle, List } from 'lucide-react';

interface IndicatorTableProps {
  metrics: AnalysisMetrics;
}

export default function IndicatorTable({ metrics }: IndicatorTableProps) {
  const getStatusColor = (status: 'normal' | 'suspicious' | 'highly_suspicious') => {
    switch (status) {
      case 'highly_suspicious':
        return 'bg-[var(--color-neo-red)] text-white shadow-[2px_2px_0_0_#000]';
      case 'suspicious':
        return 'bg-[var(--color-neo-orange)] text-black shadow-[2px_2px_0_0_#000]';
      case 'normal':
        return 'bg-[var(--color-neo-green)] text-black shadow-[2px_2px_0_0_#000]';
    }
  };

  const getStatusLabel = (status: 'normal' | 'suspicious' | 'highly_suspicious') => {
    switch (status) {
      case 'highly_suspicious':
        return 'HIGH RISK';
      case 'suspicious':
        return 'GRAY ZONE';
      case 'normal':
        return 'NORMAL';
    }
  };

  const getStatusIcon = (status: 'normal' | 'suspicious' | 'highly_suspicious') => {
    switch (status) {
      case 'highly_suspicious':
        return <AlertCircle className="w-4 h-4" />;
      case 'suspicious':
        return <AlertTriangle className="w-4 h-4" />;
      case 'normal':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const dataRows = [
    {
      category: 'Hold Time',
      items: [
        {
          label: 'HOLDTIME MEAN',
          value: `${metrics.holdtimeMean.toFixed(2)}ms`,
          status: metrics.holdtimeMean < 15 ? 'highly_suspicious' : metrics.holdtimeMean < 25 ? 'suspicious' : 'normal',
          desc: 'Low mean indicates potential relax hack.',
        },
        {
          label: 'HOLDTIME STD DEV',
          value: `${metrics.holdtimeStd.toFixed(2)}ms`, // metrics.holdtimeStd instead of holdtimeStdDev
          status: metrics.holdtimeStd < 5 ? 'highly_suspicious' : metrics.holdtimeStd < 10 ? 'suspicious' : 'normal',
          desc: 'Low deviation means unnatural consistency.',
        },
        {
          label: 'HOLDTIME UNDER 3MS',
          value: `${metrics.holdtimeUnder3ms.toFixed(1)}%`,
          status: metrics.holdtimeUnder3ms > 20 ? 'highly_suspicious' : metrics.holdtimeUnder3ms > 5 ? 'suspicious' : 'normal',
          desc: 'Human taps are rarely ≤3ms consistently.',
        },
        {
          label: 'HOLDTIME UNDER 10MS',
          value: `${metrics.holdtimeUnder10ms.toFixed(1)}%`,
          status: metrics.holdtimeUnder10ms > 40 ? 'highly_suspicious' : metrics.holdtimeUnder10ms > 15 ? 'suspicious' : 'normal',
          desc: 'High concentration of ultra-short taps.',
        },
        {
          label: 'BIMODAL DISTRIBUTION',
          value: metrics.holdtimeBimodal ? 'TRUE GAP DETECTED' : 'FALSE',
          status: metrics.holdtimeBimodal ? 'highly_suspicious' : 'normal',
          desc: 'Two distinct peaks, a classic sign of alternating relax clicking.',
        },
      ]
    },
    {
      category: 'Hit Error',
      items: [
        {
          label: 'HIT ERROR STD DEV',
          value: `${metrics.hitErrorStd.toFixed(2)}ms`,
          status: metrics.hitErrorStd < 8 ? 'highly_suspicious' : metrics.hitErrorStd < 12 ? 'suspicious' : 'normal',
          desc: 'Extremely consistent timing is difficult for humans.',
        },
        {
          label: 'HIT ERROR OFFSET',
          value: `${metrics.hitErrorMean.toFixed(2)}ms`,
          status: 'normal',
          desc: 'Average timing offset (early/late).',
        },
        {
          label: 'HIT ERROR SKEWNESS',
          value: metrics.hitErrorSkew.toFixed(2),
          status: Math.abs(metrics.hitErrorSkew) > 1.5 ? 'suspicious' : 'normal',
          desc: 'Highly skewed distributions can indicate assist snapping.',
        },
      ]
    },
    {
      category: 'General',
      items: [
        {
          label: 'ON CIRCLE RATE',
          value: `${metrics.onCircleRate.toFixed(1)}%`,
          status: 'normal',
          desc: 'Contextual metric. Relax hacks only tap for circles.',
        },
        {
          label: 'TOTAL MISS COUNT',
          value: `${metrics.circleMissCount} / ${metrics.circleCount}`,
          status: metrics.circleMissCount === 0 && metrics.circleCount > 500 ? 'suspicious' : 'normal',
          desc: '0 misses on long/hard maps is suspicious.',
        },
        {
          label: 'OVERALL HIT RATE',
          value: `${metrics.hitRate.toFixed(1)}%`,
          status: 'normal',
          desc: 'Total hits vs total notes.',
        },
        {
          label: 'TOTAL PROCESSED NOTES',
          value: metrics.totalNotes.toString(),
          status: metrics.totalNotes < 100 ? 'suspicious' : 'normal',
          desc: 'Very low note count reduces analysis confidence.',
        },
      ]
    }
  ] as const;

  return (
    <div className="brutal-card bg-white overflow-hidden font-mono text-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left font-black uppercase text-black border-b-[3px] border-black bg-[var(--color-neo-bg)]">INDICATOR</th>
              <th className="px-6 py-4 text-left font-black uppercase text-black border-b-[3px] border-black bg-[var(--color-neo-bg)]">VALUE</th>
              <th className="px-6 py-4 text-left font-black uppercase text-black border-b-[3px] border-black bg-[var(--color-neo-bg)] w-32">STATUS</th>
              <th className="px-6 py-4 text-left font-black uppercase text-black border-b-[3px] border-black bg-[var(--color-neo-bg)] hidden md:table-cell">REMARKS</th>
            </tr>
          </thead>
          <tbody className="divide-y-[2px] divide-black/10">
            {dataRows.map((group) => (
              <React.Fragment key={group.category}>
                <tr className="bg-black/5">
                  <td colSpan={4} className="px-6 py-2 font-black uppercase tracking-wider text-black border-b-[2px] border-black/10">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      {group.category} METRICS
                    </div>
                  </td>
                </tr>
                {group.items.map((item, i) => (
                  <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-6 py-4 text-black font-bold border-r-[2px] border-black/10">
                      {item.label}
                    </td>
                    <td className="px-6 py-4 text-black font-black uppercase border-r-[2px] border-black/10">
                      {item.value}
                    </td>
                    <td className="px-6 py-4 border-r-[2px] border-black/10">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 brutal-border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${getStatusColor(item.status as any)}`}>
                        {getStatusIcon(item.status as any)}
                        {getStatusLabel(item.status as any)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-black/60 font-bold text-xs uppercase hidden md:table-cell leading-relaxed">
                      {item.desc}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-[var(--color-neo-bg)] border-t-[3px] border-black flex flex-wrap gap-4 text-xs font-bold uppercase items-center text-black">
        <span className="font-black bg-white brutal-border px-2">LEGEND:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--color-neo-green)] brutal-border" />
          <span>NORMAL RANGE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--color-neo-orange)] brutal-border" />
          <span>GRAY ZONE (POTENTIAL HACK)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--color-neo-red)] brutal-border" />
          <span>HIGH RISK (STRONG EVIDENCE)</span>
        </div>
      </div>
    </div>
  );
}
