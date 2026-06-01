'use client';

import { useCallback, useState, useRef } from 'react';
import { Target, Plus, X, FileText, Upload } from 'lucide-react';

export type StealFile = {
  name: string;
  type: 'osr' | 'csv';
  buffer?: ArrayBuffer; // for .osr
  content?: string;     // for .csv
};

interface StealDropzoneProps {
  targetFile: StealFile | null;
  comparisonFiles: StealFile[];
  onTargetChange: (file: StealFile | null) => void;
  onComparisonChange: (files: StealFile[]) => void;
  disabled?: boolean;
}

const MAX_COMPARISONS = 5;

async function readFileAsBuffer(file: File): Promise<StealFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'osr') {
    const buffer = await file.arrayBuffer();
    return { name: file.name, type: 'osr', buffer };
  } else {
    const content = await file.text();
    return { name: file.name, type: 'csv', content };
  }
}

function isValidFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'osr' || ext === 'csv';
}

function FileChip({
  file,
  onRemove,
  color = 'pink',
}: {
  file: StealFile;
  onRemove: () => void;
  color?: 'pink' | 'violet';
}) {
  const colors = {
    pink:   'bg-pink-500/10 border-pink-500/20 text-pink-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[color]}`}>
      <FileText className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[140px]">{file.name}</span>
      <button
        onClick={onRemove}
        className="ml-auto shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DropZone({
  label,
  sublabel,
  color,
  onFiles,
  maxFiles = 1,
  disabled,
  children,
}: {
  label: string;
  sublabel: string;
  color: 'pink' | 'violet';
  onFiles: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = {
    pink: {
      border: dragging ? 'border-pink-400/60 bg-pink-500/5' : 'border-pink-500/20 hover:border-pink-500/40',
      icon: 'bg-pink-500/10 text-pink-400',
      text: 'text-pink-400',
    },
    violet: {
      border: dragging ? 'border-violet-400/60 bg-violet-500/5' : 'border-violet-500/20 hover:border-violet-500/40',
      icon: 'bg-violet-500/10 text-violet-400',
      text: 'text-violet-400',
    },
  }[color];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(isValidFile);
    if (files.length > 0) onFiles(files.slice(0, maxFiles));
  }, [disabled, maxFiles, onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer p-5 ${colors.border} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".osr,.csv"
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter(isValidFile);
          if (files.length > 0) onFiles(files.slice(0, maxFiles));
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${colors.text}`}>{label}</p>
          <p className="text-xs text-white/30 mt-0.5">{sublabel}</p>
        </div>

        {children && (
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StealDropzone({
  targetFile,
  comparisonFiles,
  onTargetChange,
  onComparisonChange,
  disabled,
}: StealDropzoneProps) {
  const handleTargetFiles = useCallback(async (files: File[]) => {
    const f = await readFileAsBuffer(files[0]);
    onTargetChange(f);
  }, [onTargetChange]);

  const handleComparisonFiles = useCallback(async (files: File[]) => {
    const parsed = await Promise.all(files.map(readFileAsBuffer));
    const combined = [...comparisonFiles, ...parsed].slice(0, MAX_COMPARISONS);
    onComparisonChange(combined);
  }, [onComparisonChange, comparisonFiles]);

  const removeComparison = useCallback((i: number) => {
    onComparisonChange(comparisonFiles.filter((_, idx) => idx !== i));
  }, [onComparisonChange, comparisonFiles]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Target Replay ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Target Replay</span>
          <span className="ml-auto text-[10px] text-white/25">.osr atau .csv</span>
        </div>

        {targetFile ? (
          <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-2">
            <FileChip
              file={targetFile}
              onRemove={() => onTargetChange(null)}
              color="pink"
            />
            <p className="text-[10px] text-white/25 text-center">
              Replay ini yang akan dibandingkan
            </p>
          </div>
        ) : (
          <DropZone
            label="Drop Target Replay"
            sublabel="Replay yang ingin kamu cek apakah dicuri"
            color="pink"
            onFiles={handleTargetFiles}
            disabled={disabled}
          />
        )}
      </div>

      {/* ── Comparison Replays ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Comparison Replays
          </span>
          <span className="ml-auto text-[10px] text-white/25">
            {comparisonFiles.length}/{MAX_COMPARISONS} replay
          </span>
        </div>

        <div className="space-y-2">
          {comparisonFiles.map((f, i) => (
            <FileChip
              key={`${f.name}-${i}`}
              file={f}
              onRemove={() => removeComparison(i)}
              color="violet"
            />
          ))}

          {comparisonFiles.length < MAX_COMPARISONS && (
            <DropZone
              label={comparisonFiles.length === 0 ? 'Drop Comparison Replays' : 'Tambah Replay'}
              sublabel={`Maksimal ${MAX_COMPARISONS} replay untuk dibandingkan`}
              color="violet"
              onFiles={handleComparisonFiles}
              maxFiles={MAX_COMPARISONS - comparisonFiles.length}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
