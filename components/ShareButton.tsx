'use client';

import { useState } from 'react';
import { Share2, Check, Loader2, ExternalLink } from 'lucide-react';
import type { AnalysisResult, AnalysisWarning } from '@/lib/types';
import type { OsrData } from '@/lib/context/ReplayContext';

interface ShareButtonProps {
  result: AnalysisResult;
  warnings: AnalysisWarning[];
  osrData?: OsrData;
  filename?: string;
}

export default function ShareButton({ result, warnings, osrData, filename }: ShareButtonProps) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setState('saving');
    try {
      // JSON.stringify cannot handle bigint or Date — convert manually
      const safeReplayInfo = osrData?.replayInfo
        ? {
            ...osrData.replayInfo,
            // bigint → string
            onlineScoreId: osrData.replayInfo.onlineScoreId?.toString() ?? null,
            // Date → ISO string
            timestamp: osrData.replayInfo.timestamp instanceof Date
              ? osrData.replayInfo.timestamp.toISOString()
              : osrData.replayInfo.timestamp,
          }
        : undefined;

      const osrDataToSave = osrData
        ? {
            replayInfo:  safeReplayInfo,
            beatmapInfo: osrData.beatmapInfo,
            computed:    osrData.computed,
            userProfile: osrData.userProfile ?? null,
            csvContent:  osrData.csvContent ?? null,
          }
        : null;

      // Extract online_score_id for deduplication
      // onlineScoreId can be bigint (live) or string (from JSON)
      const rawScoreId = osrData?.replayInfo?.onlineScoreId;
      const onlineScoreId = rawScoreId != null
        ? rawScoreId.toString()
        : null;

      const payload = {
        relax_result:   result,
        relax_warnings: warnings,
        osr_data:       osrDataToSave,
        filename:       filename ?? result.fileName,
        online_score_id: onlineScoreId,
      };

      const res = await fetch('/api/report/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('[ShareButton] Server error:', res.status, errBody);
        throw new Error(`Server: ${res.status}`);
      }
      const { id, slug } = await res.json();

      // Use slug URL if available, fallback to UUID
      const path = slug ? slug : id;
      const url = `${window.location.origin}/report/${path}`;
      setShareUrl(url);
      setState('done');

      // Auto-copy to clipboard
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('[ShareButton] Failed:', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Link display */}
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-white border-[2px] border-black rounded-xl truncate max-w-[200px] sm:max-w-xs hover:bg-[var(--color-neo-yellow)] transition-colors"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">/report/{shareUrl.split('/report/')[1]}</span>
        </a>
        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black font-mono bg-[var(--color-neo-green)] text-black border-[2px] border-black rounded-xl shadow-[2px_2px_0_0_#000] hover:brightness-105 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? 'COPIED!' : 'COPY LINK'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === 'saving'}
      title="Generate a shareable link for this analysis"
      className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase border-[3px] border-black rounded-xl shadow-[3px_3px_0_0_#000] transition-all
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        ${state === 'error'
          ? 'bg-[var(--color-neo-red)] text-white'
          : 'bg-[var(--color-neo-green)] text-black hover:brightness-105'
        }
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {state === 'saving' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : state === 'error' ? (
        <Share2 className="w-4 h-4" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {state === 'saving' ? 'GENERATING...' : state === 'error' ? 'FAILED — RETRY' : 'SHARE'}
    </button>
  );
}
