/**
 * osrParser.ts
 *
 * Parses a binary .osr replay file using the osu-parsers library.
 * The library handles LZMA decompression and binary format parsing internally.
 *
 * KEY BUG FIX: In osu!, pressing K1 also triggers the M1 bit simultaneously
 * (they're bound to the same gameplay action). Previous code counted K1+M1 as
 * 2 separate press events for 1 physical click, causing ~half the notes to be
 * unmatched. Fixed by grouping LEFT (M1|K1) and RIGHT (M2|K2) into single events.
 *
 * Produces the same ReplayNote[] format as parseCSV().
 */

import { OsrReplayInfo, OsrComputedStats, ReplayNote } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OsrFrame {
  startTime: number; // absolute ms from map start
  interval: number;  // ms since previous frame
  x: number;
  y: number;
  buttonState: number; // ReplayButtonState bitmask
}

export interface OsrParseResult {
  info: OsrReplayInfo;
  frames: OsrFrame[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: parse .osr using osu-parsers (handles LZMA internally)
// ─────────────────────────────────────────────────────────────────────────────

export async function parseOsrBuffer(buffer: ArrayBuffer): Promise<OsrParseResult> {
  const { ScoreDecoder } = await import('osu-parsers');
  const { HitResult } = await import('osu-classes');

  const decoder = new ScoreDecoder();
  const uint8 = new Uint8Array(buffer);
  const score = await decoder.decodeFromBuffer(uint8);

  const si = score.info;
  const replay = score.replay;

  const stats = si.statistics;
  const count300  = stats?.get(HitResult.Great)   ?? 0;
  const count100  = stats?.get(HitResult.Ok)       ?? 0;
  const count50   = stats?.get(HitResult.Meh)      ?? 0;
  const countGeki = stats?.get(HitResult.Perfect)  ?? 0;
  const countKatu = stats?.get(HitResult.Good)     ?? 0;
  const countMiss = stats?.get(HitResult.Miss)     ?? 0;

  const rawMods = si.rawMods;
  let modsBitmask = 0;
  if (typeof rawMods === 'number') {
    modsBitmask = rawMods;
  } else if (typeof rawMods === 'string') {
    modsBitmask = parseInt(rawMods, 10) || 0;
  }

  const info: OsrReplayInfo = {
    gameMode: si.rulesetId ?? 0,
    gameVersion: replay?.gameVersion ?? 0,
    beatmapMd5: si.beatmapHashMD5 ?? '',
    playerName: si.username ?? '',
    replayMd5: replay?.hashMD5 ?? '',
    count300,
    count100,
    count50,
    countGeki,
    countKatu,
    countMiss,
    score: si.totalScore ?? 0,
    maxCombo: si.maxCombo ?? 0,
    perfectCombo: si.perfect ?? false,
    mods: modsBitmask,
    timestamp: si.date ? new Date(si.date) : new Date(),
    onlineScoreId: BigInt(si.id ?? 0),
  };

  // Extract frames — filter out seed frames (interval < 0 = special osu! marker)
  const frames: OsrFrame[] = [];
  for (const frame of replay?.frames ?? []) {
    const f = frame as unknown as {
      startTime: number;
      interval: number;
      mouseX: number;
      mouseY: number;
      buttonState: number;
    };

    // Skip seed frames (interval = -100000 or other negative sentinel values)
    // These are internal osu! markers, not actual gameplay frames
    if (f.interval < 0) continue;

    frames.push({
      startTime: f.startTime,
      interval: f.interval,
      x: f.mouseX ?? 0,
      y: f.mouseY ?? 0,
      buttonState: f.buttonState ?? 0,
    });
  }

  return { info, frames };
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed stats (UR, frametime, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates Unstable Rate (UR) and other stats from notes + frames.
 * UR = standard deviation of hit errors × 10 (osu! convention).
 * Adjusted UR normalizes for speed mods: DT = ×1.5, HT = ×0.75.
 */
export function computeOsrStats(
  notes: ReplayNote[],
  frames: OsrFrame[],
  mods: number,
  beatmapCircles: number,
  beatmapSliders: number,
  beatmapSpinners: number
): OsrComputedStats {
  // Hit errors for UR
  const hitErrors = notes
    .filter((n) => n.hitError !== null)
    .map((n) => n.hitError!);

  let ur = 0;
  if (hitErrors.length > 1) {
    const mean = hitErrors.reduce((s, e) => s + e, 0) / hitErrors.length;
    const variance =
      hitErrors.reduce((s, e) => s + (e - mean) ** 2, 0) / hitErrors.length;
    ur = Math.sqrt(variance) * 10;
  }

  // Adj UR: normalize to 1.0× playback speed (convert map-time UR to real-time UR)
  //
  // .osr replay frames use MAP TIME coordinates. With DT (1.5× speed), a 10ms
  // hit error in map-time is actually only 10/1.5 ≈ 6.67ms in real (wall-clock)
  // time. To get the real-time UR:
  //   DT/NC: adjUr = ur / 1.5  (smaller — player is more precise in real time)
  //   HT:    adjUr = ur / 0.75 (larger  — player had more time per beat)
  //   NoMod: adjUr = ur
  const DT_MASK = 64 | 512;  // DoubleTime | Nightcore
  const HT_MASK = 256;
  let adjUr = ur;
  if (mods & DT_MASK) adjUr = ur / 1.5;
  else if (mods & HT_MASK) adjUr = ur / 0.75;

  // Average frametime (exclude zero-interval frames)
  const validFrames = frames.filter((f) => f.interval > 0);
  const avgFrametime =
    validFrames.length > 0
      ? validFrames.reduce((s, f) => s + f.interval, 0) / validFrames.length
      : 0;

  return {
    ur,
    adjUr,
    avgFrametime,
    totalFrames: frames.length,
    beatmapCircles,
    beatmapSliders,
    beatmapSpinners,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// .osu beatmap parser
// ─────────────────────────────────────────────────────────────────────────────

export interface HitObject {
  x: number;
  y: number;
  time: number;
  isCircle: boolean;
  isSlider: boolean;
  isSpinner: boolean;
}

export interface BeatmapTimingPoint {
  offset: number;
  beatLength: number;
  inherited: boolean;
}

export interface ParsedBeatmap {
  od: number;
  cs: number;
  ar: number;
  hitObjects: HitObject[];
  timingPoints: BeatmapTimingPoint[];
}

export function parseOsuFile(content: string): ParsedBeatmap {
  // Strip BOM if present
  const cleanContent = content.startsWith('\ufeff') ? content.slice(1) : content;
  const lines = cleanContent.split(/\r?\n/);
  let section = '';
  let od = 8;
  let cs = 4;
  let ar = 9;

  const hitObjects: HitObject[] = [];
  const timingPoints: BeatmapTimingPoint[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.startsWith('[')) {
      section = line.slice(1, -1).trim();
      continue;
    }

    if (section === 'Difficulty') {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const val = parseFloat(line.slice(colonIdx + 1).trim());
      if (isNaN(val)) continue;
      if (key === 'OverallDifficulty') od = val;
      else if (key === 'CircleSize') cs = val;
      else if (key === 'ApproachRate') ar = val;
    }

    if (section === 'TimingPoints') {
      const parts = line.split(',');
      if (parts.length < 2) continue;
      const offset = parseFloat(parts[0]);
      const beatLength = parseFloat(parts[1]);
      if (isNaN(offset) || isNaN(beatLength)) continue;
      // uninherited: 1 = BPM timing point, 0 = inherited (velocity)
      const uninherited = parts.length > 6 ? parseInt(parts[6], 10) : 1;
      timingPoints.push({
        offset,
        beatLength,
        inherited: uninherited === 0,
      });
    }

    if (section === 'HitObjects') {
      const parts = line.split(',');
      if (parts.length < 4) continue;
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      const time = parseInt(parts[2], 10);
      const typeFlags = parseInt(parts[3], 10);
      if (isNaN(x) || isNaN(y) || isNaN(time) || isNaN(typeFlags)) continue;

      // type bitmask: bit0=circle, bit1=slider, bit3=spinner
      // bits 2,4,5,6 are combo flags (ignore for hit type)
      const isCircle  = (typeFlags & 1) !== 0;
      const isSlider  = (typeFlags & 2) !== 0;
      const isSpinner = (typeFlags & 8) !== 0;

      hitObjects.push({ x, y, time, isCircle, isSlider, isSpinner });
    }
  }

  return { od, cs, ar, hitObjects, timingPoints };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hit detection
// ─────────────────────────────────────────────────────────────────────────────

function getHitWindows(od: number) {
  return {
    w300: Math.max(0, 80 - 6 * od),
    w100: Math.max(0, 140 - 8 * od),
    w50:  Math.max(0, 200 - 10 * od),
  };
}

function circleRadius(cs: number): number {
  return 54.4 - 4.48 * cs;
}

function euclidDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// ─── ReplayButtonState bitmasks (from osu-classes) ───────────────────────────
// Left1 = 1  (M1), Right1 = 2 (M2), Left2 = 4 (K1), Right2 = 8 (K2)
//
// CRITICAL: In osu!, pressing K1 also sets the M1 bit simultaneously
// (they're both "left click" in gameplay). Treating them as independent
// would generate 2 press events for 1 physical click → half the notes unmatched.
//
// Fix: Group LEFT = M1|K1, RIGHT = M2|K2.
// A "left click" is when (state & LEFT_MASK) goes from 0 → nonzero.
// A "right click" is when (state & RIGHT_MASK) goes from 0 → nonzero.
const LEFT_MASK  = 1 | 4;  // M1 | K1
const RIGHT_MASK = 2 | 8;  // M2 | K2

interface PressEvent {
  time: number;
  releaseTime: number;
  x: number;
  y: number;
  key: string; // K1, K2, M1, or M2 — whichever key was dominant
}

/**
 * Extracts clean key-press/release events by grouping LEFT (M1+K1) and RIGHT (M2+K2).
 * This prevents double-counting when pressing K1 simultaneously sets M1.
 */
function extractPressEvents(frames: OsrFrame[]): PressEvent[] {
  const events: PressEvent[] = [];

  // Held state per group
  let leftHeld: { time: number; x: number; y: number; key: string } | null = null;
  let rightHeld: { time: number; x: number; y: number; key: string } | null = null;

  let prevState = 0;

  for (const frame of frames) {
    const curr = frame.buttonState;

    const prevLeft  = (prevState & LEFT_MASK)  !== 0;
    const currLeft  = (curr & LEFT_MASK)        !== 0;
    const prevRight = (prevState & RIGHT_MASK)  !== 0;
    const currRight = (curr & RIGHT_MASK)       !== 0;

    // LEFT group transitions
    if (!prevLeft && currLeft) {
      // Prefer K1 (Left2=4) name over M1, since K1 is the keyboard key
      const key = (curr & 4) ? 'K1' : 'M1';
      leftHeld = { time: frame.startTime, x: frame.x, y: frame.y, key };
    }
    if (prevLeft && !currLeft && leftHeld) {
      events.push({ ...leftHeld, releaseTime: frame.startTime });
      leftHeld = null;
    }

    // RIGHT group transitions
    if (!prevRight && currRight) {
      const key = (curr & 8) ? 'K2' : 'M2';
      rightHeld = { time: frame.startTime, x: frame.x, y: frame.y, key };
    }
    if (prevRight && !currRight && rightHeld) {
      events.push({ ...rightHeld, releaseTime: frame.startTime });
      rightHeld = null;
    }

    prevState = curr;
  }

  // Handle keys still held at end of replay
  const lastTime = frames[frames.length - 1]?.startTime ?? 0;
  if (leftHeld)  events.push({ ...leftHeld,  releaseTime: lastTime });
  if (rightHeld) events.push({ ...rightHeld, releaseTime: lastTime });

  return events.sort((a, b) => a.time - b.time);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main conversion: frames + beatmap → ReplayNote[]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts parsed .osr cursor frames and a beatmap into ReplayNote[] rows.
 *
 * For each hit object:
 *  1. Find the nearest UNUSED press event within the ±w50 hit window
 *  2. Compute OnCircleHitWindow, IsHit, HitError, HoldTime
 *  3. If no press found → miss
 *
 * Notes are generated for ALL hit objects (circles, sliders, spinners),
 * matching the full row count from analyzer.osu.report CSV exports.
 *
 * The `mods` bitmask is needed to adjust hit windows for speed mods:
 *   DT/NC (1.5×): hit windows are ÷1.5 (tighter timing)
 *   HT    (0.75×): hit windows are ÷0.75 (more lenient)
 */
export function framesToNotes(
  frames: OsrFrame[],
  beatmap: ParsedBeatmap,
  mods: number = 0
): ReplayNote[] {
  // Compute speed factor from mods
  const DT_MASK = 64 | 512;  // DoubleTime | Nightcore
  const HT_MASK = 256;
  let speedFactor = 1.0;
  if (mods & DT_MASK) speedFactor = 1.5;
  else if (mods & HT_MASK) speedFactor = 0.75;

  const { w300, w100, w50 } = getHitWindows(beatmap.od);
  // With DT/HT, osu! applies the speed factor to hit windows.
  // .osr timestamps are in map-time, so we divide the window by speed:
  //   DT: effective w50 = 140/1.5 ≈ 93ms (tighter — player has less real time)
  //   HT: effective w50 = 140/0.75 ≈ 187ms (looser — player has more real time)
  const effectiveW50 = w50 / speedFactor;
  const radius = circleRadius(beatmap.cs);
  const pressEvents = extractPressEvents(frames);
  const notes: ReplayNote[] = [];
  const usedPress = new Set<number>();

  for (const obj of beatmap.hitObjects) {
    const windowStart = obj.time - effectiveW50;
    const windowEnd   = obj.time + effectiveW50;

    // Find nearest unused press within the hit window
    // Note: do NOT use `break` here — usedPress gaps mean we must scan all
    let bestIdx  = -1;
    let bestDist = Infinity;

    for (let i = 0; i < pressEvents.length; i++) {
      if (usedPress.has(i)) continue;
      const p = pressEvents[i];
      // Skip presses clearly before window (optimize — but don't break)
      if (p.time < windowStart - 1) continue;
      // Stop scanning once clearly past window
      if (p.time > windowEnd + 1)   break;

      const d = Math.abs(p.time - obj.time);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    // Cursor position at hit object's nominal time (for miss reporting)
    const nearestFrame = frames.length > 0
      ? frames.reduce((best, f) =>
          Math.abs(f.startTime - obj.time) < Math.abs(best.startTime - obj.time)
            ? f : best
        )
      : null;

    if (bestIdx === -1) {
      // Miss — no matching press in window
      // OnCircleHitWindow = obj.isCircle:
      //   True  → this is a CIRCLE object (circle miss = player missed a circle)
      //   False → this is a SLIDER or SPINNER (slider break / spinner miss)
      notes.push({
        startTime: obj.time,
        endTime:   obj.time,
        holdTime:  0,
        holdTimeNormalized: 0,
        key: 'K1',
        onCircleHitWindow: obj.isCircle, // ← circle TYPE flag, not cursor position
        isHit:    false,
        hitError: null,
        posX: nearestFrame?.x ?? 0,
        posY: nearestFrame?.y ?? 0,
      });
    } else {
      usedPress.add(bestIdx);
      const press   = pressEvents[bestIdx];
      const holdTime = Math.max(0, press.releaseTime - press.time);
      const hitError = press.time - obj.time;
      const isHit    = Math.abs(hitError) <= effectiveW50;
      // OnCircleHitWindow semantics (matching analyzer.osu.report behavior):
      //
      //   TRUE  = this hit object is a CIRCLE type
      //   FALSE = this hit object is a SLIDER or SPINNER
      //
      // Rationale: analyzer.osu.report's CSV shows OnCircleHitWindow≈40% for a map
      // with 59 circles and 86 sliders → 59/145 = 40.7%. This confirms the field
      // marks CIRCLE-TYPE notes, not "cursor was inside the hit area" (which would
      // always be 100% for hits, since osu! requires cursor-on-circle to register a hit).
      //
      // This interpretation enables:
      //   • Correct holdtime analysis (circles only → short holdtimes ≠ slider holds)
      //   • Correct circleCount = actual number of circle objects
      //   • Correct circleMissCount = circles the player actually missed
      const onCircle = obj.isCircle;

      // Normalized holdtime relative to current beat length
      const tp = beatmap.timingPoints
        .filter((t) => !t.inherited && t.offset <= press.time)
        .sort((a, b) => b.offset - a.offset)[0];
      const beatMs  = tp?.beatLength ?? 500;
      const holdNorm = beatMs > 0 ? Math.round((holdTime / beatMs) * 100) : 0;

      notes.push({
        startTime: press.time,
        endTime:   press.releaseTime,
        holdTime,
        holdTimeNormalized: holdNorm,
        key:   press.key,
        onCircleHitWindow: onCircle,
        isHit,
        hitError: isHit ? hitError : null,
        posX: press.x,
        posY: press.y,
      });
    }
  }

  return notes;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export (same format as analyzer.osu.report)
// ─────────────────────────────────────────────────────────────────────────────

export function notesToCSV(notes: ReplayNote[]): string {
  const header =
    'StartTime;EndTime;HoldTime;HoldTimeNormalized;Key;OnCircleHitWindow;IsHit;HitError;PosX;PosY';
  const rows = notes.map((n) =>
    [
      n.startTime,
      n.endTime,
      n.holdTime,
      n.holdTimeNormalized,
      n.key,
      n.onCircleHitWindow,
      n.isHit,
      n.hitError !== null ? n.hitError.toFixed(3) : '',
      n.posX.toFixed(2),
      n.posY.toFixed(2),
    ].join(';')
  );
  return [header, ...rows].join('\n');
}
