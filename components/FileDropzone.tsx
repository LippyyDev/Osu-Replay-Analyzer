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
          setError('Pilih file .osr untuk mode ini.');
          return;
        }
        const buf = await osr.arrayBuffer();
        onOSRAccepted(buf, osr.name);
      } else {
        const limited = acceptedFiles.slice(0, 2).filter((f) =>
          f.name.endsWith('.csv')
        );
        if (limited.length === 0) {
          setError('Pilih file CSV untuk mode ini.');
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
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit mx-auto">
        {([
          { key: 'osr', label: '📁 Upload .osr Replay', desc: 'Otomatis fetch beatmap via osu! API' },
          { key: 'csv', label: '📊 Upload CSV', desc: 'Dari analyzer.osu.report' },
        ] as const).map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(null); }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-center ${
              mode === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span className="block">{label}</span>
            <span className="text-[10px] opacity-60">{desc}</span>
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer rounded-2xl border-2 border-dashed p-12
          flex flex-col items-center justify-center gap-5
          transition-all duration-300 ease-in-out
          ${isDragActive
            ? 'border-pink-400 bg-pink-500/10 scale-[1.02] shadow-xl shadow-pink-500/20'
            : 'border-white/10 bg-white/[0.03] hover:border-pink-500/50 hover:bg-pink-500/5 hover:shadow-lg hover:shadow-pink-500/10'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none" />
        <input {...getInputProps()} />

        {/* Icon */}
        <div
          className={`relative p-6 rounded-2xl transition-all duration-300
            ${isDragActive
              ? 'bg-pink-500/20 text-pink-400 scale-110'
              : 'bg-white/5 text-white/40 group-hover:bg-pink-500/10 group-hover:text-pink-400 group-hover:scale-105'
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
          <p className={`text-lg font-semibold transition-colors duration-300 ${
            isDragActive ? 'text-pink-400' : 'text-white/70 group-hover:text-white/90'
          }`}>
            {disabled
              ? 'Sedang menganalisis...'
              : isDragActive
              ? 'Lepaskan file di sini...'
              : mode === 'osr'
              ? 'Drop file .osr replay di sini, atau klik untuk browse'
              : 'Drop file CSV di sini, atau klik untuk browse'}
          </p>
          <p className="text-sm text-white/30">
            {mode === 'osr'
              ? 'Format: file binary .osr dari osu! · Beatmap di-fetch otomatis'
              : 'Format: CSV dengan separator titik koma (;) · Maksimal 2 file'}
          </p>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-pink-500/30 rounded-tl-lg group-hover:border-pink-400/60 transition-colors" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-pink-500/30 rounded-tr-lg group-hover:border-pink-400/60 transition-colors" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-pink-500/30 rounded-bl-lg group-hover:border-pink-400/60 transition-colors" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-pink-500/30 rounded-br-lg group-hover:border-pink-400/60 transition-colors" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
