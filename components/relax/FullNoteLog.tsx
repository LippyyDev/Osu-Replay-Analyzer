'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { ChevronLeft, ChevronRight, Filter, Info, Search } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteRow {
  index: number;
  startTime: number;
  endTime: number;
  holdTime: number;
  holdTimeNormalized: number;
  key: string;
  onCircleHitWindow: boolean;
  isHit: boolean;
  hitError: number | null;
  posX: number;
  posY: number;
  judgment: '300' | '100' | '50' | 'Miss';
}

interface FullNoteLogProps {
  csvContent: string;
  od: number;
  mods: number;
}

// ─── Hit window calculator ────────────────────────────────────────────────────

function getHitWindows(od: number, mods: number) {
  const DT_MASK = 64 | 512;
  const HT_MASK = 256;
  let speedFactor = 1.0;
  if (mods & DT_MASK) speedFactor = 1.5;
  else if (mods & HT_MASK) speedFactor = 0.75;

  return {
    w300: (80 - 6 * od) / speedFactor,
    w100: (140 - 8 * od) / speedFactor,
    w50:  (200 - 10 * od) / speedFactor,
  };
}

function getJudgment(
  isHit: boolean,
  hitError: number | null,
  w300: number,
  w100: number,
  w50: number
): '300' | '100' | '50' | 'Miss' {
  if (!isHit || hitError === null) return 'Miss';
  const abs = Math.abs(hitError);
  if (abs <= w300) return '300';
  if (abs <= w100) return '100';
  return '50';
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseNotes(csv: string, od: number, mods: number): NoteRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const { w300, w100, w50 } = getHitWindows(od, mods);

  return parsed.data.map((row, i) => {
    const get = (key: string) => {
      const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
      return found ? (row[found] ?? '').trim() : '';
    };
    const hitErrorRaw = get('HitError');
    const hitError = hitErrorRaw === '' ? null : parseFloat(hitErrorRaw);
    const isHit = get('IsHit').toLowerCase() === 'true';

    return {
      index: i + 1,
      startTime: parseFloat(get('StartTime')) || 0,
      endTime: parseFloat(get('EndTime')) || 0,
      holdTime: parseFloat(get('HoldTime')) || 0,
      holdTimeNormalized: parseFloat(get('HoldTimeNormalized')) || 0,
      key: get('Key') || 'K1',
      onCircleHitWindow: get('OnCircleHitWindow').toLowerCase() === 'true',
      isHit,
      hitError,
      posX: parseFloat(get('PosX')) || 0,
      posY: parseFloat(get('PosY')) || 0,
      judgment: getJudgment(isHit, hitError, w300, w100, w50),
    };
  });
}

// ─── Judgment styling ─────────────────────────────────────────────────────────

const JUDGMENT_STYLES = {
  '300': {
    row: 'bg-[var(--color-neo-blue)]/10 hover:bg-[var(--color-neo-blue)]/20',
  },
  '100': {
    row: 'bg-[var(--color-neo-green)]/10 hover:bg-[var(--color-neo-green)]/20',
  },
  '50': {
    row: 'bg-[var(--color-neo-yellow)]/10 hover:bg-[var(--color-neo-yellow)]/20',
  },
  'Miss': {
    row: 'bg-[var(--color-neo-red)]/10 hover:bg-[var(--color-neo-red)]/20',
  },
} as const;

// ─── Column Tooltip ───────────────────────────────────────────────────────────

const COLUMN_TOOLTIPS: Record<string, string> = {
  '#': 'Nomor urut note dalam replay',
  'Time (ms)': 'Waktu saat tombol ditekan, diukur dalam milidetik (ms) dari awal lagu',
  'End (ms)': 'Waktu saat tombol dilepas (ms dari awal lagu)',
  'Hold (ms)': 'Durasi tombol ditekan = End − Time (ms). Circle normal: 10–200ms. ≤3ms mencurigakan.',
  'Hold% Beat': 'Hold time sebagai % dari panjang 1 beat pada BPM saat itu. 100% = 1 ketukan penuh.',
  'Key': 'Tombol yang ditekan: K1/K2 (keyboard) atau M1/M2 (mouse)',
  'Type': 'Tipe hit object: Circle = note bulat, Slider/Spinner = note panjang/berputar',
  'Judgment': '300 (tepat), 100 (oke), 50 (terlambat/cepat), Miss (tidak kena). Berdasarkan hit error vs hit window OD.',
  'Status': 'Hit (✅ tombol terdeteksi dalam window) atau Miss (❌ tidak ada klik yang cocok)',
  'Hit Error': 'Selisih waktu klik vs waktu ideal note. Negatif = terlalu cepat (early), Positif = terlambat (late), 0 = sempurna.',
  'Pos X': 'Posisi kursor horizontal saat tombol ditekan (0–512 osu!pixels)',
  'Pos Y': 'Posisi kursor vertikal saat tombol ditekan (0–384 osu!pixels)',
};

function ColHeader({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  const tip = COLUMN_TOOLTIPS[label];
  return (
    <th
      className="px-4 py-3 text-left text-xs uppercase font-black text-black whitespace-nowrap select-none border-b-[3px] border-black bg-[var(--color-neo-bg)]"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {tip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShow(true)}
              onMouseLeave={() => setShow(false)}
              className="text-black/60 hover:text-black transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
            {show && (
              <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white brutal-border px-4 py-3 shadow-[4px_4px_0_0_#000] text-black text-xs font-bold leading-relaxed pointer-events-none whitespace-normal">
                {tip}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

export default function FullNoteLog({ csvContent, od, mods }: FullNoteLogProps) {
  const allNotes = useMemo(() => parseNotes(csvContent, od, mods), [csvContent, od, mods]);

  const [showHit, setShowHit] = useState(true);
  const [showMiss, setShowMiss] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // ── Derived counts ───────────────────────────────────────────────────────
  const hitCount  = useMemo(() => allNotes.filter((n) => n.isHit).length,  [allNotes]);
  const missCount = useMemo(() => allNotes.filter((n) => !n.isHit).length, [allNotes]);

  // ── Filtered & searched ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allNotes.filter((n) => {
      if (n.isHit  && !showHit)  return false;
      if (!n.isHit && !showMiss) return false;
      if (q) {
        if (
          !n.index.toString().includes(q) &&
          !n.startTime.toFixed(0).includes(q)
        ) return false;
      }
      return true;
    });
  }, [allNotes, showHit, showMiss, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageNotes = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearchQuery(v);
    setPage(1);
  }

  const { w300, w100, w50 } = useMemo(() => getHitWindows(od, mods), [od, mods]);

  return (
    <div className="brutal-card bg-white overflow-hidden font-mono text-sm">

      {/* ── Header controls ── */}
      <div className="px-6 py-5 border-b-[3px] border-black flex flex-wrap items-center gap-4 bg-[var(--color-neo-bg)]">

        {/* Hit / Miss filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-black font-black uppercase text-sm mr-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> FILTER:
          </span>

          {/* Hit chip */}
          <button
            onClick={() => {
              if (showHit && !showMiss) return; // keep at least 1
              setShowHit((v) => !v);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-1 font-bold text-sm uppercase transition-all duration-150 brutal-border ${
              showHit
                ? 'bg-[var(--color-neo-green)] text-black shadow-[2px_2px_0_0_#000]'
                : 'bg-white text-black/40 shadow-none'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showHit ? 'bg-black' : 'bg-black/20'}`} />
            HIT
            <span className="text-[10px] bg-black text-white px-1 ml-1 opacity-90">{hitCount}</span>
          </button>

          {/* Miss chip */}
          <button
            onClick={() => {
              if (!showHit && showMiss) return; // keep at least 1
              setShowMiss((v) => !v);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-3 py-1 font-bold text-sm uppercase transition-all duration-150 brutal-border ${
              showMiss
                ? 'bg-[var(--color-neo-red)] text-white shadow-[2px_2px_0_0_#000]'
                : 'bg-white text-black/40 shadow-none'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showMiss ? 'bg-white' : 'bg-black/20'}`} />
            MISS
            <span className="text-[10px] bg-white text-black px-1 ml-1 opacity-90">{missCount}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black font-bold pointer-events-none" />
          <input
            type="text"
            placeholder="SEARCH # OR TIME..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="brutal-border bg-white pl-10 pr-4 py-2 font-bold text-black uppercase focus:outline-none focus:ring-4 focus:ring-[var(--color-neo-pink)]/30 w-64 shadow-[2px_2px_0_0_#000] transition-colors placeholder:text-black/40"
          />
        </div>
      </div>

      {/* ── Hit window legend ── */}
      <div className="px-6 py-3 border-b-[3px] border-black flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase bg-white">
        <span className="text-black bg-[var(--color-neo-bg)] brutal-border px-2">WINDOWS (OD {od}):</span>
        <span className="text-black"><span className="text-[var(--color-neo-blue)]">🔵</span> 300 ≤ ±{w300.toFixed(1)}MS</span>
        <span className="text-black"><span className="text-[var(--color-neo-green)]">🟢</span> 100 ≤ ±{w100.toFixed(1)}MS</span>
        <span className="text-black"><span className="text-[var(--color-neo-yellow)]">🟡</span> 50 ≤ ±{w50.toFixed(1)}MS</span>
        <span className="text-black"><span className="text-[var(--color-neo-red)]">❌</span> MISS = OUTSIDE ±{w50.toFixed(1)}MS</span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 shadow-[0_2px_0_0_#000]">
            <tr>
              {[
                '#', 'Time (ms)', 'End (ms)', 'Hold (ms)', 'Hold% Beat',
                'Key', 'Type', 'Status', 'Hit Error', 'Pos X', 'Pos Y',
              ].map((col) => (
                <ColHeader key={col} label={col} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-[2px] divide-black/10">
            {pageNotes.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-black font-black uppercase text-lg">
                  NO NOTES MATCHING FILTER
                </td>
              </tr>
            ) : (
              pageNotes.map((n) => {
                const s = JUDGMENT_STYLES[n.judgment];
                return (
                  <tr key={n.index} className={`transition-colors ${s.row} hover:opacity-90`}>
                    {/* # */}
                    <td className="px-4 py-2 text-black/60 font-black bg-black/5 border-r border-black/10">{n.index}</td>
                    {/* Time */}
                    <td className="px-4 py-2 text-black font-bold">{n.startTime.toFixed(0)}</td>
                    {/* End */}
                    <td className="px-4 py-2 text-black/70 font-semibold">{n.endTime.toFixed(0)}</td>
                    {/* Hold */}
                    <td className="px-4 py-2 font-bold">
                      {n.isHit ? (
                        <span className={n.holdTime <= 3 && n.onCircleHitWindow ? 'text-white bg-[var(--color-neo-red)] px-1 brutal-border shadow-[2px_2px_0_0_#000]' : 'text-black'}>
                          {n.holdTime}
                          {n.holdTime <= 3 && n.onCircleHitWindow && ' ⚠️'}
                        </span>
                      ) : (
                        <span className="text-black/30">—</span>
                      )}
                    </td>
                    {/* Hold% Beat */}
                    <td className="px-4 py-2 text-black/70 font-semibold">
                      {n.isHit ? `${n.holdTimeNormalized}%` : <span className="text-black/30">—</span>}
                    </td>
                    {/* Key */}
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                        {n.key}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-2 whitespace-nowrap font-bold uppercase">
                      {n.onCircleHitWindow ? (
                        <span className="text-[var(--color-neo-pink)]">Circle</span>
                      ) : (
                        <span className="text-[var(--color-neo-blue)]">Long</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-2 whitespace-nowrap font-black uppercase">
                      {n.isHit ? (
                        <span className="text-[var(--color-neo-green)]">✅ HIT</span>
                      ) : (
                        <span className="text-[var(--color-neo-red)]">❌ MISS</span>
                      )}
                    </td>
                    {/* Hit Error */}
                    <td className="px-4 py-2 font-black whitespace-nowrap">
                      {n.hitError !== null ? (
                        <span className={
                          Math.abs(n.hitError) <= w300
                            ? 'text-[var(--color-neo-blue)]'
                            : Math.abs(n.hitError) <= w100
                            ? 'text-[var(--color-neo-green)]'
                            : 'text-[var(--color-neo-yellow)]'
                        }>
                          {n.hitError >= 0 ? '+' : ''}{n.hitError.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-black/30">—</span>
                      )}
                    </td>
                    {/* Pos X */}
                    <td className="px-4 py-2 text-black/60 font-semibold">{n.posX.toFixed(1)}</td>
                    {/* Pos Y */}
                    <td className="px-4 py-2 text-black/60 font-semibold">{n.posY.toFixed(1)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="px-6 py-4 border-t-[3px] border-black flex items-center justify-between gap-4 bg-[var(--color-neo-bg)] flex-wrap">
        <span className="text-black font-bold uppercase text-xs">
          SHOWING {pageNotes.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} OF {filtered.length}
          {filtered.length < allNotes.length && ` (FILTERED FROM ${allNotes.length})`}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 brutal-border bg-white text-black disabled:opacity-50 hover:bg-black/5 disabled:hover:bg-white shadow-[2px_2px_0_0_#000]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {/* Page number pills */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show pages around current
            let pg: number;
            if (totalPages <= 5) pg = i + 1;
            else if (safePage <= 3) pg = i + 1;
            else if (safePage >= totalPages - 2) pg = totalPages - 4 + i;
            else pg = safePage - 2 + i;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-10 h-10 font-black text-sm uppercase transition-all shadow-[2px_2px_0_0_#000] brutal-border ${
                  pg === safePage
                    ? 'bg-[var(--color-neo-pink)] text-white'
                    : 'bg-white text-black hover:bg-[var(--color-neo-yellow)]'
                }`}
              >
                {pg}
              </button>
            );
          })}
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 brutal-border bg-white text-black disabled:opacity-50 hover:bg-black/5 disabled:hover:bg-white shadow-[2px_2px_0_0_#000]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
