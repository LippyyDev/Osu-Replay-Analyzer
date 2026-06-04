'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnalysisResult, AnalysisWarning, BeatmapInfo, OsrReplayInfo, OsrComputedStats, UserProfile } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OsrData {
  replayInfo: OsrReplayInfo;
  beatmapInfo: BeatmapInfo;
  csvContent?: string; // optional — older saved reports may not include this
  computed: OsrComputedStats;
  userProfile?: UserProfile | null;
}

/** Raw file info stored so Steal Checker can reuse the uploaded file. */
export interface SharedReplayFile {
  name: string;
  type: 'osr' | 'csv';
  buffer?: ArrayBuffer; // for .osr
  content?: string;     // for .csv
}

export type AnalysisState =
  | { mode: 'idle' }
  | { mode: 'loading'; step: string }
  | {
      mode: 'single';
      result: AnalysisResult;
      warnings: AnalysisWarning[];
      osrData?: OsrData;
    }
  | {
      mode: 'dual';
      results: [
        { result: AnalysisResult; warnings: AnalysisWarning[]; osrData?: OsrData },
        { result: AnalysisResult; warnings: AnalysisWarning[]; osrData?: OsrData },
      ];
      view: 'individual' | 'compare';
      activeIndex: 0 | 1;
    };

interface ReplayContextValue {
  /** The shared file that was uploaded (reusable across tabs). */
  sharedFile: SharedReplayFile | null;
  setSharedFile: (file: SharedReplayFile | null) => void;

  /** Full analysis state for Relax Detector tab. */
  analysisState: AnalysisState;
  setAnalysisState: (state: AnalysisState) => void;

  /** Convenience setter — just update the loading step text. */
  setLoadingStep: (step: string) => void;

  /** Reset everything. */
  reset: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ReplayContext = createContext<ReplayContextValue | null>(null);

export function ReplayProvider({ children }: { children: React.ReactNode }) {
  const [sharedFile, setSharedFile] = useState<SharedReplayFile | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ mode: 'idle' });

  const setLoadingStep = useCallback((step: string) => {
    setAnalysisState({ mode: 'loading', step });
  }, []);

  const reset = useCallback(() => {
    setSharedFile(null);
    setAnalysisState({ mode: 'idle' });
  }, []);

  return (
    <ReplayContext.Provider
      value={{
        sharedFile,
        setSharedFile,
        analysisState,
        setAnalysisState,
        setLoadingStep,
        reset,
      }}
    >
      {children}
    </ReplayContext.Provider>
  );
}

/** Hook — throws if used outside ReplayProvider. */
export function useReplay(): ReplayContextValue {
  const ctx = useContext(ReplayContext);
  if (!ctx) throw new Error('useReplay must be used inside <ReplayProvider>');
  return ctx;
}
