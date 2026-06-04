'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

type UploadMode = 'csv' | 'osr';

interface UnifiedDropzoneProps {
  onCSVAccepted: (content: string, fileName: string) => void;
  onCSVsAccepted?: (files: { content: string; fileName: string }[]) => void;
  onOSRAccepted: (buffer: ArrayBuffer, fileName: string) => void;
  disabled?: boolean;
}

export default function UnifiedDropzone({
  onCSVAccepted,
  onCSVsAccepted,
  onOSRAccepted,
  disabled,
}: UnifiedDropzoneProps) {
  const [mode, setMode] = useState<UploadMode>('osr');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      if (acceptedFiles.length === 0) return;

      if (mode === 'osr') {
        const osr = acceptedFiles.find((f) => f.name.endsWith('.osr'));
        if (!osr) {
          setError('err: expecting .osr format — file rejected');
          return;
        }
        const buf = await osr.arrayBuffer();
        onOSRAccepted(buf, osr.name);
      } else {
        const limited = acceptedFiles.slice(0, 2).filter((f) =>
          f.name.endsWith('.csv')
        );
        if (limited.length === 0) {
          setError('err: expecting .csv format — file rejected');
          return;
        }
        if (limited.length === 1) {
          const text = await limited[0].text();
          onCSVAccepted(text, limited[0].name);
        } else if (onCSVsAccepted) {
          const results = await Promise.all(
            limited.map(async (f) => ({ content: await f.text(), fileName: f.name }))
          );
          onCSVsAccepted(results);
        }
      }
    },
    [mode, onCSVAccepted, onCSVsAccepted, onOSRAccepted]
  );

  const accept: Record<string, string[]> =
    mode === 'osr'
      ? { 'application/octet-stream': ['.osr'] }
      : { 'text/csv': ['.csv'], 'text/plain': ['.csv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: mode === 'osr' ? 1 : 2,
    disabled,
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-4 p-2 bg-white brutal-border shadow-[4px_4px_0_0_#000] w-fit mx-auto">
        {([
          { key: 'osr', label: '[ MODE OSR ]', desc: 'auto beatmap fetch' },
          { key: 'csv', label: '[ MODE CSV ]', desc: 'report analyzer' },
        ] as const).map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(null); }}
            className={`px-4 py-2 font-mono font-bold text-sm transition-all duration-200 text-center brutal-btn ${
              mode === key
                ? 'bg-[var(--color-neo-pink)] text-white'
                : 'bg-[var(--color-neo-bg)] text-black hover:bg-[var(--color-neo-yellow)]'
            }`}
          >
            <span className="block">{label}</span>
            <span className="text-[10px] uppercase opacity-90">{desc}</span>
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer p-12 brutal-card
          flex flex-col items-center justify-center gap-5
          ${isDragActive ? 'bg-[var(--color-neo-yellow)] scale-[1.02]' : 'bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <div
          className={`relative p-6 brutal-border transition-all duration-300 shadow-[4px_4px_0_0_#000]
            ${isDragActive
              ? 'bg-[var(--color-neo-pink)] text-white scale-110'
              : 'bg-[var(--color-neo-bg)] text-black group-hover:bg-[var(--color-neo-green)] group-hover:scale-105'
            }`}
        >
          {disabled ? (
            <Loader2 className="w-12 h-12 animate-spin" />
          ) : isDragActive ? (
            <FileText className="w-12 h-12" />
          ) : (
            <Upload className="w-12 h-12" />
          )}
        </div>

        {/* Text */}
        <div className="relative text-center space-y-2">
          <p className="text-xl font-mono font-bold uppercase transition-colors duration-300">
            {disabled
              ? 'processing_data —'
              : isDragActive
              ? 'drop_file_now —'
              : mode === 'osr'
              ? 'awaiting .osr file — drop or click'
              : 'awaiting .csv file — drop or click'}
          </p>
          <p className="text-sm font-mono opacity-70">
            {mode === 'osr'
              ? 'format: .osr binary · auto beatmap retrieval active'
              : 'format: .csv (semicolon delimited) · max 2 files'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-[var(--color-neo-red)] text-white brutal-border shadow-[4px_4px_0_0_#000] p-4 text-sm font-mono font-bold animate-fade-in uppercase">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
