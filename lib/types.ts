export interface ReplayNote {
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
}

export interface AnalysisMetrics {
  // HoldTime (circle notes only)
  holdtimeMean: number;
  holdtimeStd: number;
  holdtimeUnder3ms: number; // percentage
  holdtimeUnder10ms: number; // percentage
  holdtimeGap11_100: number; // count of notes between 11-100ms
  holdtimeBimodal: boolean;
  holdtimeDistribution: { range: string; count: number }[];
  holdtimeHistogram: { bin: number; count: number }[];

  // Hit Error (hits only)
  hitErrorMean: number;
  hitErrorStd: number;
  hitErrorSkew: number;
  hitErrorHistogram: { bin: number; count: number }[];

  // OnCircle
  onCircleRate: number; // percentage

  // Notes
  totalNotes: number;
  circleCount: number;
  sliderCount: number;
  spinnerCount: number;
  hitCount: number;
  missCount: number;
  circleMissCount: number;
  hitRate: number;
}

export interface ScoreBreakdown {
  holdtimeScore: number;
  hitErrorScore: number;
  onCircleScore: number;
  circleMissScore: number;
  finalScore: number;
}

export interface AnalysisResult {
  metrics: AnalysisMetrics;
  scores: ScoreBreakdown;
  verdict:
    | 'KEMUNGKINAN BESAR CHEAT'
    | 'MENCURIGAKAN'
    | 'ABU-ABU'
    | 'KEMUNGKINAN BERSIH';
  verdictColor: 'red' | 'orange' | 'yellow' | 'green';
  fileName: string;
  noteCount: number;
}

export interface AnalysisWarning {
  type: 'insufficient_data' | 'no_circles' | 'invalid_format' | 'beatmap_fetch_error';
  message: string;
}

export type ParsedCSVResult = {
  notes: ReplayNote[];
  warnings: AnalysisWarning[];
};

/** Metadata extracted from the .osr binary header */
export interface OsrReplayInfo {
  gameMode: number;
  gameVersion: number;
  beatmapMd5: string;
  playerName: string;
  replayMd5: string;
  count300: number;
  count100: number;
  count50: number;
  countGeki: number;
  countKatu: number;
  countMiss: number;
  score: number;
  maxCombo: number;
  perfectCombo: boolean;
  mods: number;
  timestamp: Date;
  onlineScoreId: bigint;
}

/** Beatmap metadata from osu! API */
export interface BeatmapInfo {
  beatmapId: number;
  beatmapSetId: number;
  title: string;
  artist: string;
  version: string;
  od: number;
  ar: number;
  cs: number;
  bpm: number;
  starRating: number;
}

/** User profile from osu! API */
export interface UserProfile {
  userId: number;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  globalRank: number | null;
  countryCode: string;
  countryName: string | null;
  countryRank: number | null;
  pp: number | null;
  playCount: number;
  accuracy: number | null;
  level: number | null;
}

/** Computed stats from .osr frames + notes — calculated client-side */
export interface OsrComputedStats {
  /** Unstable Rate = stddev(hitErrors) × 10 */
  ur: number;
  /** Adjusted UR — normalized to 1.0× speed (DT: ×1.5, HT: ×0.75) */
  adjUr: number;
  /** Average frame interval (ms) — excludes seed/special frames */
  avgFrametime: number;
  /** Total number of replay frames */
  totalFrames: number;
  /** Circle objects in beatmap */
  beatmapCircles: number;
  /** Slider objects in beatmap */
  beatmapSliders: number;
  /** Spinner objects in beatmap */
  beatmapSpinners: number;
}

/** Mods bitmask (standard subset) */
export const Mods = {
  NoMod: 0,
  NoFail: 1 << 0,
  Easy: 1 << 1,
  Hidden: 1 << 3,
  HardRock: 1 << 4,
  DoubleTime: 1 << 6,
  HalfTime: 1 << 8,
  Flashlight: 1 << 10,
  Relax: 1 << 7,
  Autopilot: 1 << 13,
} as const;

export function modNames(mods: number): string[] {
  const names: string[] = [];
  if (mods === 0) return ['NoMod'];
  if (mods & Mods.NoFail) names.push('NF');
  if (mods & Mods.Easy) names.push('EZ');
  if (mods & Mods.Hidden) names.push('HD');
  if (mods & Mods.HardRock) names.push('HR');
  if (mods & Mods.DoubleTime) names.push('DT');
  if (mods & Mods.HalfTime) names.push('HT');
  if (mods & Mods.Flashlight) names.push('FL');
  if (mods & Mods.Relax) names.push('RX');
  if (mods & Mods.Autopilot) names.push('AP');
  return names.length > 0 ? names : [`Mods(${mods})`];
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY STEALING CHECKER TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A score entry from the beatmap leaderboard */
export interface LeaderboardScore {
  scoreId: number;
  userId: number;
  username: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  mods: number;
  pp: number | null;
  rank: string; // 'X', 'S', 'A', etc.
  createdAt: string;
}

/** Similarity breakdown for each detection aspect */
export interface SimilarityBreakdown {
  /** Aim trajectory similarity (Pearson correlation of dx/dy cursor deltas) */
  aimSimilarity: number;       // 0–100
  /** Hit position similarity (avg Euclidean distance to hit objects, normalized) */
  positionSimilarity: number;  // 0–100
  /** Timing similarity (hit error sequence correlation + distribution match) */
  timingSimilarity: number;    // 0–100
  /** HoldTime distribution similarity (KL divergence normalized) */
  holdtimeSimilarity: number;  // 0–100
  /** Miss pattern similarity (Jaccard index of missed note positions) */
  missSimilarity: number;      // 0–100
}

/** Full similarity result between target and one comparison replay */
export interface SimilarityResult {
  /** Label for the target replay (filename or "username" from leaderboard) */
  targetLabel: string;
  /** Label for the comparison replay */
  comparedLabel: string;
  /** Stable unique ID — scoreId from leaderboard, or undefined for manual uploads */
  scoreId?: number;
  /** Is this from the leaderboard auto scan? */
  fromLeaderboard: boolean;
  /** Leaderboard score metadata (if fromLeaderboard) */
  leaderboardScore?: LeaderboardScore;
  /** Per-aspect similarity breakdown */
  breakdown: SimilarityBreakdown;
  /** Weighted final similarity score 0–100 */
  overallSimilarity: number;
  /** Human-readable verdict */
  verdict: 'SANGAT MIRIP' | 'MUNGKIN DICURI' | 'MIRIP' | 'BERBEDA';
  verdictColor: 'red' | 'orange' | 'yellow' | 'green';
}

/** The logged-in osu! user session (from OAuth) */
export interface OsuUserSession {
  userId: number;
  username: string;
  avatarUrl: string | null;
}

/** Input data for the steal checker — one replay side */
export interface StealReplayInput {
  /** Display label */
  label: string;
  /** Parsed notes (same format as relax detector) */
  notes: ReplayNote[];
  /** Raw cursor frames from .osr (null if CSV-only input) */
  frames: import('./osrParser').OsrFrame[] | null;
  /** Whether this came from a .osr file (vs CSV) */
  isOsr: boolean;
}

