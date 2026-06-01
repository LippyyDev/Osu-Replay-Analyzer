/**
 * stealDetector.ts
 *
 * Core similarity engine for the Replay Stealing Checker.
 *
 * Compares a target replay against comparison replays across 5 aspects:
 *   1. Aim Trajectory  (35%) — Pearson correlation of cursor delta vectors
 *   2. Hit Position    (25%) — Avg Euclidean distance per note (normalized)
 *   3. Timing          (20%) — Hit error sequence correlation + distribution match
 *   4. HoldTime        (10%) — KL-divergence of hold time distributions
 *   5. Miss Pattern    (10%) — Jaccard similarity of missed note positions
 *
 * Both .osr (with cursor frames) and CSV (notes only) inputs are supported.
 * When frames are unavailable (CSV mode), aim trajectory falls back to
 * position-based comparison, and its weight is redistributed.
 */

import { ReplayNote, SimilarityResult, SimilarityBreakdown, LeaderboardScore } from './types';
import { OsrFrame } from './osrParser';

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/**
 * Pearson correlation coefficient between two arrays of equal length.
 * Returns 0 if either array has zero variance.
 */
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const as = a.slice(0, n);
  const bs = b.slice(0, n);
  const ma = mean(as);
  const mb = mean(bs);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const a_ = as[i] - ma;
    const b_ = bs[i] - mb;
    num += a_ * b_;
    da  += a_ * a_;
    db  += b_ * b_;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

/**
 * Clamp x to [0, 1].
 */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * KL divergence from P to Q (both histograms, smoothed with ε).
 * Lower = more similar. Returned as a raw value (not percentage).
 */
function klDivergence(p: number[], q: number[], bins: number): number {
  const EPS = 1e-9;
  // Normalize
  const sumP = p.reduce((s, v) => s + v, 0) || 1;
  const sumQ = q.reduce((s, v) => s + v, 0) || 1;
  let kl = 0;
  for (let i = 0; i < bins; i++) {
    const pi = (p[i] ?? 0) / sumP + EPS;
    const qi = (q[i] ?? 0) / sumQ + EPS;
    kl += pi * Math.log(pi / qi);
  }
  return kl;
}

/**
 * Build a holdtime histogram in 1ms bins from 0–200ms (+ overflow).
 * Returns an array of length `bins`.
 */
function buildHoldtimeHist(notes: ReplayNote[], bins = 41): number[] {
  const hist = new Array<number>(bins).fill(0);
  const circleHits = notes.filter((n) => n.onCircleHitWindow && n.isHit);
  for (const n of circleHits) {
    const b = Math.min(Math.round(n.holdTime / 5), bins - 1); // 5ms per bin
    hist[b]++;
  }
  return hist;
}

/**
 * Jaccard similarity for two sets.
 * Returns 1 if both empty (no misses = same pattern), 0 if totally disjoint.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AIM TRAJECTORY SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes aim trajectory similarity using Pearson correlation on cursor delta
 * vectors (dx, dy between consecutive frames).
 *
 * Frames are resampled to a fixed temporal grid (every 16ms) to align two
 * replays that may have different frame counts. The correlation of both dx and
 * dy sequences are averaged for the final score.
 *
 * Returns 0–100.
 */
function aimTrajectorySimilarity(
  framesA: OsrFrame[],
  framesB: OsrFrame[]
): number {
  if (framesA.length < 10 || framesB.length < 10) return 0;

  const GRID_MS = 16; // ~60fps resample grid

  function resample(frames: OsrFrame[]): { dx: number[]; dy: number[] } {
    const start = frames[0].startTime;
    const end   = frames[frames.length - 1].startTime;
    const dx: number[] = [];
    const dy: number[] = [];
    let prev = frames[0];
    for (let t = start + GRID_MS; t <= end; t += GRID_MS) {
      // Find the nearest frame at or before t
      const frame = frames.reduce((best, f) => {
        if (f.startTime > t) return best;
        return f.startTime > best.startTime ? f : best;
      }, frames[0]);
      dx.push(frame.x - prev.x);
      dy.push(frame.y - prev.y);
      prev = frame;
    }
    return { dx, dy };
  }

  const a = resample(framesA);
  const b = resample(framesB);

  const corrX = pearson(a.dx, b.dx);
  const corrY = pearson(a.dy, b.dy);

  // Convert correlation [-1, 1] → similarity [0, 100]
  const similarity = ((corrX + corrY) / 2 + 1) / 2;
  return Math.round(clamp01(similarity) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HIT POSITION SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares cursor position per hit note using Euclidean distance.
 *
 * For each note in A, find the temporally nearest note in B and compute the
 * distance between their (posX, posY). The average distance is normalized
 * against the osu! playfield diagonal (512×384 → ~640px) to a 0–100 score.
 *
 * Returns 0–100 (100 = identical positions).
 */
function hitPositionSimilarity(
  notesA: ReplayNote[],
  notesB: ReplayNote[]
): number {
  const PLAYFIELD_DIAG = Math.sqrt(512 ** 2 + 384 ** 2); // ~640
  const hitsA = notesA.filter((n) => n.isHit);
  const hitsB = notesB.filter((n) => n.isHit);
  if (hitsA.length === 0 || hitsB.length === 0) return 0;

  let totalDist = 0;
  let count = 0;

  for (const a of hitsA) {
    // Find temporally closest note in B
    let best: ReplayNote | null = null;
    let bestDt = Infinity;
    for (const b of hitsB) {
      const dt = Math.abs(a.startTime - b.startTime);
      if (dt < bestDt) { bestDt = dt; best = b; }
    }
    if (best && bestDt < 500) { // only match within 500ms
      const dist = Math.sqrt((a.posX - best.posX) ** 2 + (a.posY - best.posY) ** 2);
      totalDist += dist;
      count++;
    }
  }

  if (count === 0) return 0;
  const avgDist = totalDist / count;
  // Normalize: 0 dist = 100%, PLAYFIELD_DIAG = 0%
  const similarity = 1 - clamp01(avgDist / PLAYFIELD_DIAG);
  return Math.round(similarity * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TIMING SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares hit error sequences using Pearson correlation.
 *
 * Hit errors from A and B are aligned by note index (up to the shorter list)
 * and correlated. Additionally, we compare the mean and std of the distributions.
 *
 * Returns 0–100.
 */
function timingSimilarity(
  notesA: ReplayNote[],
  notesB: ReplayNote[]
): number {
  const errorsA = notesA.filter((n) => n.isHit && n.hitError !== null).map((n) => n.hitError as number);
  const errorsB = notesB.filter((n) => n.isHit && n.hitError !== null).map((n) => n.hitError as number);

  if (errorsA.length < 5 || errorsB.length < 5) return 0;

  // Sequence correlation
  const corr = pearson(errorsA, errorsB);
  const seqSim = (corr + 1) / 2; // [-1,1] → [0,1]

  // Mean + std match (compare distributions)
  const mA = mean(errorsA), mB = mean(errorsB);
  const sA = stddev(errorsA), sB = stddev(errorsB);

  // Similarity based on difference in mean (normalized by ±50ms range)
  const meanDiff = Math.abs(mA - mB);
  const meanSim  = clamp01(1 - meanDiff / 50);

  // Similarity based on difference in std (normalized by ±30ms range)
  const stdDiff = Math.abs(sA - sB);
  const stdSim  = clamp01(1 - stdDiff / 30);

  // Weighted: sequence correlation 60%, mean 20%, std 20%
  const combined = seqSim * 0.6 + meanSim * 0.2 + stdSim * 0.2;
  return Math.round(clamp01(combined) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HOLDTIME SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares holdtime distributions using KL divergence.
 *
 * Holdtime histograms are binned in 5ms buckets (0–200ms). KL divergence is
 * computed symmetrically (average of KL(P‖Q) and KL(Q‖P)) and mapped to 0–100.
 *
 * Returns 0–100.
 */
function holdtimeSimilarity(
  notesA: ReplayNote[],
  notesB: ReplayNote[]
): number {
  const BINS = 41;
  const histA = buildHoldtimeHist(notesA, BINS);
  const histB = buildHoldtimeHist(notesB, BINS);

  // If both have no circle hits, treat as identical
  const sumA = histA.reduce((s, v) => s + v, 0);
  const sumB = histB.reduce((s, v) => s + v, 0);
  if (sumA === 0 && sumB === 0) return 100;
  if (sumA === 0 || sumB === 0) return 0;

  // Symmetric KL divergence
  const klPQ = klDivergence(histA, histB, BINS);
  const klQP = klDivergence(histB, histA, BINS);
  const symKL = (klPQ + klQP) / 2;

  // Map KL to similarity: 0 = identical (sim 100), >5 = very different (sim 0)
  const similarity = clamp01(1 - symKL / 5);
  return Math.round(similarity * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MISS PATTERN SIMILARITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares miss patterns using Jaccard similarity on missed note timestamps
 * (quantized to 50ms buckets to allow minor timing differences).
 *
 * Returns 0–100.
 */
function missSimilarity(
  notesA: ReplayNote[],
  notesB: ReplayNote[]
): number {
  const BUCKET_MS = 50;

  const missSetA = new Set(
    notesA.filter((n) => !n.isHit).map((n) => String(Math.round(n.startTime / BUCKET_MS)))
  );
  const missSetB = new Set(
    notesB.filter((n) => !n.isHit).map((n) => String(Math.round(n.startTime / BUCKET_MS)))
  );

  return Math.round(jaccard(missSetA, missSetB) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT
// ─────────────────────────────────────────────────────────────────────────────

function generateStealVerdict(score: number): {
  verdict: SimilarityResult['verdict'];
  verdictColor: SimilarityResult['verdictColor'];
} {
  if (score >= 85) return { verdict: 'SANGAT MIRIP',    verdictColor: 'red'    };
  if (score >= 70) return { verdict: 'MUNGKIN DICURI',  verdictColor: 'orange' };
  if (score >= 55) return { verdict: 'MIRIP',           verdictColor: 'yellow' };
  return              { verdict: 'BERBEDA',            verdictColor: 'green'  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: compareSingleReplay
// ─────────────────────────────────────────────────────────────────────────────

export interface ReplayCompareInput {
  label: string;
  notes: ReplayNote[];
  frames: OsrFrame[] | null;
}

/**
 * Compares a target replay against a single comparison replay.
 * Returns a complete SimilarityResult with per-aspect breakdown + final verdict.
 *
 * Weights:
 *   Aim Trajectory  35% (falls back to position 60% if no frames)
 *   Hit Position    25%
 *   Timing          20%
 *   HoldTime        10%
 *   Miss Pattern    10%
 */
export function compareSingleReplay(
  target: ReplayCompareInput,
  comparison: ReplayCompareInput,
  leaderboardScore?: LeaderboardScore
): SimilarityResult {
  const hasFrames = target.frames !== null && comparison.frames !== null
    && target.frames.length > 10 && comparison.frames.length > 10;

  // ── Compute each aspect ──────────────────────────────────────────────────
  const aimSim = hasFrames
    ? aimTrajectorySimilarity(target.frames!, comparison.frames!)
    : 0; // no frames available

  const posSim  = hitPositionSimilarity(target.notes, comparison.notes);
  const timeSim = timingSimilarity(target.notes, comparison.notes);
  const holdSim = holdtimeSimilarity(target.notes, comparison.notes);
  const missSim = missSimilarity(target.notes, comparison.notes);

  // ── Weighted final score ─────────────────────────────────────────────────
  let overall: number;
  if (hasFrames) {
    overall =
      aimSim  * 0.35 +
      posSim  * 0.25 +
      timeSim * 0.20 +
      holdSim * 0.10 +
      missSim * 0.10;
  } else {
    // No frames: redistribute aim weight to position + timing
    overall =
      posSim  * 0.55 +
      timeSim * 0.25 +
      holdSim * 0.10 +
      missSim * 0.10;
  }

  const overallSimilarity = Math.round(clamp01(overall / 100) * 100);
  const { verdict, verdictColor } = generateStealVerdict(overallSimilarity);

  const breakdown: SimilarityBreakdown = {
    aimSimilarity:       hasFrames ? aimSim : posSim, // fallback display
    positionSimilarity:  posSim,
    timingSimilarity:    timeSim,
    holdtimeSimilarity:  holdSim,
    missSimilarity:      missSim,
  };

  return {
    targetLabel:      target.label,
    comparedLabel:    comparison.label,
    scoreId:          leaderboardScore?.scoreId,
    fromLeaderboard:  !!leaderboardScore,
    leaderboardScore,
    breakdown,
    overallSimilarity,
    verdict,
    verdictColor,
  };
}

/**
 * Compare a target replay against multiple comparison replays.
 * Results are sorted by overallSimilarity descending.
 */
export function compareReplayBatch(
  target: ReplayCompareInput,
  comparisons: ReplayCompareInput[],
  leaderboardScores?: LeaderboardScore[]
): SimilarityResult[] {
  return comparisons
    .map((comp, i) =>
      compareSingleReplay(
        target,
        comp,
        leaderboardScores?.[i]
      )
    )
    .sort((a, b) => b.overallSimilarity - a.overallSimilarity);
}
