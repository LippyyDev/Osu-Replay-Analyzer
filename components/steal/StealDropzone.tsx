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
  const bg = color === 'pink' ? 'bg-[var(--color-neo-pink)] text-white' : 'bg-[var(--color-neo-blue)] text-white';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 brutal-border font-mono text-xs font-bold ${bg}`}>
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate max-w-[140px] uppercase">[{file.name}]</span>
      <button
        onClick={onRemove}
        className="ml-auto shrink-0 bg-white text-black brutal-border p-0.5 hover:bg-[var(--color-neo-red)] hover:text-white transition-colors"
      >
        <X className="w-3 h-3" />
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(isValidFile);
    if (files.length > 0) onFiles(files.slice(0, maxFiles));
  }, [disabled, maxFiles, onFiles]);

  const activeColor = color === 'pink' ? 'bg-[var(--color-neo-pink)] text-white' : 'bg-[var(--color-neo-blue)] text-white';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative brutal-card cursor-pointer p-6 transition-all duration-200 
        ${dragging ? activeColor : 'bg-white hover:bg-[var(--color-neo-yellow)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      <div className="flex flex-col items-center gap-4 text-center font-mono">
        <div className="w-12 h-12 bg-white text-black brutal-border shadow-[2px_2px_0_0_#000] flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase">[{label}]</p>
          <p className="text-xs opacity-80 mt-1 uppercase">__{sublabel}</p>
        </div>

        {children && (
          <div className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── Target Replay ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-[var(--color-neo-bg)] brutal-border p-2 shadow-[2px_2px_0_0_#000]">
          <Target className="w-5 h-5 text-black" />
          <span className="text-sm font-bold font-mono uppercase tracking-wide">target replay</span>
          <span className="ml-auto text-xs font-mono font-bold bg-white px-2 border-l-2 border-black">.osr / .csv</span>
        </div>

        {targetFile ? (
          <div className="brutal-card p-4 space-y-4 bg-white">
            <FileChip
              file={targetFile}
              onRemove={() => onTargetChange(null)}
              color="pink"
            />
            <p className="text-xs font-mono font-bold text-center uppercase bg-[var(--color-neo-yellow)] brutal-border p-1">
              subject for analysis
            </p>
          </div>
        ) : (
          <DropZone
            label="awaiting target file —"
            sublabel="drop suspected replay here"
            color="pink"
            onFiles={handleTargetFiles}
            disabled={disabled}
          />
        )}
      </div>

      {/* ── Comparison Replays ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-[var(--color-neo-bg)] brutal-border p-2 shadow-[2px_2px_0_0_#000]">
          <Plus className="w-5 h-5 text-black" />
          <span className="text-sm font-bold font-mono uppercase tracking-wide">
            comparison pool
          </span>
          <span className="ml-auto text-xs font-mono font-bold bg-white px-2 border-l-2 border-black">
            {comparisonFiles.length}/{MAX_COMPARISONS} max
          </span>
        </div>

        <div className="space-y-3">
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
              label={comparisonFiles.length === 0 ? "awaiting reference pool —" : "add reference replay —"}
              sublabel={`max ${MAX_COMPARISONS} replays permitted`}
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
