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
    row: 'bg-blue-500/[0.04] hover:bg-blue-500/[0.08]',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
    label: '300',
  },
  '100': {
    row: 'bg-green-500/[0.04] hover:bg-green-500/[0.08]',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    dot: 'bg-green-400',
    label: '100',
  },
  '50': {
    row: 'bg-yellow-500/[0.06] hover:bg-yellow-500/[0.10]',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-400',
    label: '50',
  },
  'Miss': {
    row: 'bg-red-500/[0.06] hover:bg-red-500/[0.10]',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    dot: 'bg-red-500',
    label: 'Miss',
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
      className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-semibold text-white/40 whitespace-nowrap select-none"
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {tip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShow(true)}
              onMouseLeave={() => setShow(false)}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <Info className="w-3 h-3" />
            </button>
            {show && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[#1c1c28] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-white/70 text-[11px] leading-relaxed pointer-events-none">
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
    <div className="rounded-2xl border border-white/[0.06] bg-[#13131a] overflow-hidden">

      {/* ── Header controls ── */}
      <div className="px-5 py-4 border-b border-white/[0.04] flex flex-wrap items-center gap-3">

        {/* Hit / Miss filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white/25 text-xs mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          {/* Hit chip */}
          <button
            onClick={() => {
              if (showHit && !showMiss) return; // keep at least 1
              setShowHit((v) => !v);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
              showHit
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : 'bg-white/[0.03] text-white/20 border-white/[0.06] opacity-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Hit
            <span className="text-[10px] opacity-70">({hitCount})</span>
          </button>

          {/* Miss chip */}
          <button
            onClick={() => {
              if (!showHit && showMiss) return; // keep at least 1
              setShowMiss((v) => !v);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
              showMiss
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-white/[0.03] text-white/20 border-white/[0.06] opacity-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Miss
            <span className="text-[10px] opacity-70">({missCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari # atau waktu..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-pink-500/40 w-44 transition-colors"
          />
        </div>
      </div>

      {/* ── Hit window legend ── */}
      <div className="px-5 py-2.5 border-b border-white/[0.04] flex flex-wrap gap-x-5 gap-y-1 text-[10px]">
        <span className="text-white/30">Hit Windows (OD {od}):</span>
        <span className="text-blue-400">🔵 300 ≤ ±{w300.toFixed(1)}ms</span>
        <span className="text-green-400">🟢 100 ≤ ±{w100.toFixed(1)}ms</span>
        <span className="text-yellow-400">🟡 50 ≤ ±{w50.toFixed(1)}ms</span>
        <span className="text-red-400">❌ Miss = di luar ±{w50.toFixed(1)}ms atau tidak klik</span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-white/[0.02] sticky top-0 z-10">
            <tr>
              {[
                '#', 'Time (ms)', 'End (ms)', 'Hold (ms)', 'Hold% Beat',
                'Key', 'Type', 'Status', 'Hit Error', 'Pos X', 'Pos Y',
              ].map((col) => (
                <ColHeader key={col} label={col} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.025]">
            {pageNotes.length === 0 ? (
              <tr>
                    <td colSpan={11} className="py-12 text-center text-white/20 text-sm">
                  Tidak ada note yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              pageNotes.map((n) => {
                const s = JUDGMENT_STYLES[n.judgment];
                return (
                  <tr key={n.index} className={`transition-colors ${s.row}`}>
                    {/* # */}
                    <td className="px-3 py-2 text-white/30 font-mono">{n.index}</td>
                    {/* Time */}
                    <td className="px-3 py-2 text-white/70 font-mono">{n.startTime.toFixed(0)}</td>
                    {/* End */}
                    <td className="px-3 py-2 text-white/50 font-mono">{n.endTime.toFixed(0)}</td>
                    {/* Hold */}
                    <td className="px-3 py-2 font-mono">
                      {n.isHit ? (
                        <span className={n.holdTime <= 3 && n.onCircleHitWindow ? 'text-red-400 font-bold' : 'text-white/70'}>
                          {n.holdTime}
                          {n.holdTime <= 3 && n.onCircleHitWindow && ' ⚠️'}
                        </span>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    {/* Hold% Beat */}
                    <td className="px-3 py-2 text-white/50 font-mono">
                      {n.isHit ? `${n.holdTimeNormalized}%` : <span className="text-white/25">—</span>}
                    </td>
                    {/* Key */}
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 text-[10px] font-mono font-bold">
                        {n.key}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2 text-white/50 whitespace-nowrap">
                      {n.onCircleHitWindow ? (
                        <span className="text-pink-400/70">Circle</span>
                      ) : (
                        <span className="text-purple-400/60">Slider/Spinner</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {n.isHit ? (
                        <span className="text-green-400 text-[11px]">✅ Hit</span>
                      ) : (
                        <span className="text-red-400 text-[11px]">❌ Miss</span>
                      )}
                    </td>
                    {/* Hit Error */}
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      {n.hitError !== null ? (
                        <span className={
                          Math.abs(n.hitError) <= w300
                            ? 'text-blue-300'
                            : Math.abs(n.hitError) <= w100
                            ? 'text-green-300'
                            : 'text-yellow-300'
                        }>
                          {n.hitError >= 0 ? '+' : ''}{n.hitError.toFixed(2)} ms
                        </span>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    {/* Pos X */}
                    <td className="px-3 py-2 text-white/40 font-mono">{n.posX.toFixed(1)}</td>
                    {/* Pos Y */}
                    <td className="px-3 py-2 text-white/40 font-mono">{n.posY.toFixed(1)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="px-5 py-3.5 border-t border-white/[0.04] flex items-center justify-between gap-3">
        <span className="text-white/30 text-xs">
          Menampilkan {pageNotes.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length} note
          {filtered.length < allNotes.length && ` (difilter dari ${allNotes.length} total)`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-white/[0.06] text-white/40 disabled:opacity-30 hover:bg-white/[0.05] transition-colors disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
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
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  pg === safePage
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    : 'text-white/30 hover:text-white/60 border border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                {pg}
              </button>
            );
          })}
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-white/[0.06] text-white/40 disabled:opacity-30 hover:bg-white/[0.05] transition-colors disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
