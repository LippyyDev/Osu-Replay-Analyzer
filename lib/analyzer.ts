import Papa from 'papaparse';
import {
  AnalysisMetrics,
  AnalysisResult,
  AnalysisWarning,
  ParsedCSVResult,
  ReplayNote,
  ScoreBreakdown,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the arithmetic mean of an array of numbers.
 * Returns 0 if the array is empty.
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Computes the population standard deviation of an array of numbers.
 * Returns 0 if fewer than 2 values are provided.
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Computes the sample skewness of an array of numbers using the adjusted
 * Fisher–Pearson standardized moment coefficient:
 *   g1 = n / ((n-1)(n-2)) * Σ((xi - mean)^3) / std^3
 * Returns 0 if fewer than 3 values are provided or std === 0.
 */
export function calculateSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const mean = calculateMean(values);
  const std = calculateStdDev(values);
  if (std === 0) return 0;
  const cubedDeviations = values.reduce(
    (s, v) => s + Math.pow(v - mean, 3),
    0
  );
  return (n / ((n - 1) * (n - 2))) * (cubedDeviations / Math.pow(std, 3));
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a raw CSV string (semicolon-delimited) into an array of ReplayNote
 * objects.  Also returns any warnings about data quality.
 *
 * Expected columns (case-insensitive):
 *   StartTime | EndTime | HoldTime | HoldTimeNormalized | Key |
 *   OnCircleHitWindow | IsHit | HitError | PosX | PosY
 */
export function parseCSV(content: string): ParsedCSVResult {
  const warnings: AnalysisWarning[] = [];

  const parsed = Papa.parse<Record<string, string>>(content.trim(), {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    warnings.push({
      type: 'invalid_format',
      message: 'Format file tidak dikenali. Pastikan file CSV menggunakan separator titik koma (;).',
    });
    return { notes: [], warnings };
  }

  const requiredColumns = [
    'StartTime',
    'EndTime',
    'HoldTime',
    'HoldTimeNormalized',
    'Key',
    'OnCircleHitWindow',
    'IsHit',
    'HitError',
    'PosX',
    'PosY',
  ];

  const headers = Object.keys(parsed.data[0] ?? {});
  const missingCols = requiredColumns.filter(
    (col) => !headers.some((h) => h.toLowerCase() === col.toLowerCase())
  );

  if (missingCols.length > 0) {
    warnings.push({
      type: 'invalid_format',
      message: `Format file tidak dikenali. Kolom yang tidak ditemukan: ${missingCols.join(', ')}`,
    });
    return { notes: [], warnings };
  }

  const notes: ReplayNote[] = parsed.data.map((row) => {
    // Case-insensitive field access helper
    const get = (key: string): string => {
      const found = Object.keys(row).find(
        (k) => k.toLowerCase() === key.toLowerCase()
      );
      return found ? (row[found] ?? '').trim() : '';
    };

    const hitErrorRaw = get('HitError');
    return {
      startTime: parseFloat(get('StartTime')) || 0,
      endTime: parseFloat(get('EndTime')) || 0,
      holdTime: parseFloat(get('HoldTime')) || 0,
      holdTimeNormalized: parseFloat(get('HoldTimeNormalized')) || 0,
      key: get('Key'),
      onCircleHitWindow:
        get('OnCircleHitWindow').toLowerCase() === 'true',
      isHit: get('IsHit').toLowerCase() === 'true',
      hitError:
        hitErrorRaw === '' || hitErrorRaw === null
          ? null
          : parseFloat(hitErrorRaw),
      posX: parseFloat(get('PosX')) || 0,
      posY: parseFloat(get('PosY')) || 0,
    };
  });

  if (notes.length < 20) {
    warnings.push({
      type: 'insufficient_data',
      message: `Data terlalu sedikit untuk analisis akurat (${notes.length} note). Diperlukan minimal 20 note.`,
    });
  }

  const circleNotes = notes.filter((n) => n.onCircleHitWindow);
  if (circleNotes.length === 0) {
    warnings.push({
      type: 'no_circles',
      message: 'Tidak ditemukan circle notes di file ini.',
    });
  }

  return { notes, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the holdtime distribution bar chart data grouped into fixed ranges:
 * "1ms", "2ms", "3ms", "4-10ms", "11-100ms", "101-500ms", "500ms+"
 */
function buildHoldtimeDistribution(
  holdTimes: number[]
): { range: string; count: number }[] {
  const buckets = [
    { range: '1ms', check: (v: number) => v <= 1 },
    { range: '2ms', check: (v: number) => v === 2 },
    { range: '3ms', check: (v: number) => v === 3 },
    { range: '4-10ms', check: (v: number) => v >= 4 && v <= 10 },
    { range: '11-100ms', check: (v: number) => v >= 11 && v <= 100 },
    { range: '101-500ms', check: (v: number) => v >= 101 && v <= 500 },
    { range: '500ms+', check: (v: number) => v > 500 },
  ];

  return buckets.map((b) => ({
    range: b.range,
    count: holdTimes.filter(b.check).length,
  }));
}

/**
 * Builds a detailed holdtime histogram with 1ms bins spanning from min to max.
 * Similar to the hit error histogram — gives a per-ms view of hold durations.
 * For very wide ranges (e.g. slider holdtimes reaching 500ms+), bins are
 * clamped to a reasonable maximum to keep the chart readable.
 */
function buildHoldtimeHistogram(
  holdTimes: number[]
): { bin: number; count: number }[] {
  if (holdTimes.length === 0) return [];
  const rounded = holdTimes.map((h) => Math.round(h));
  const min = Math.min(...rounded);
  const rawMax = Math.max(...rounded);
  // Cap at 200ms to keep chart readable — anything beyond is clearly not relax
  const max = Math.min(rawMax, 200);
  const histogram: { bin: number; count: number }[] = [];
  for (let bin = min; bin <= max; bin++) {
    histogram.push({
      bin,
      count: rounded.filter((h) => h === bin).length,
    });
  }
  // If there are values beyond the cap, add an overflow bin
  if (rawMax > 200) {
    const overflowCount = rounded.filter((h) => h > 200).length;
    if (overflowCount > 0) {
      histogram.push({ bin: 201, count: overflowCount });
    }
  }
  return histogram;
}

/**
 * Builds the hit error histogram with 1ms bins spanning from min to max.
 * Each bin represents a 1ms-wide bucket centered on an integer ms value.
 */
function buildHitErrorHistogram(
  hitErrors: number[]
): { bin: number; count: number }[] {
  if (hitErrors.length === 0) return [];
  const min = Math.floor(Math.min(...hitErrors));
  const max = Math.ceil(Math.max(...hitErrors));
  const histogram: { bin: number; count: number }[] = [];
  for (let bin = min; bin <= max; bin++) {
    histogram.push({
      bin,
      count: hitErrors.filter((e) => e >= bin - 0.5 && e < bin + 0.5).length,
    });
  }
  return histogram;
}

/**
 * Computes all analysis metrics from an array of ReplayNote objects.
 *
 * Separates circle notes (OnCircleHitWindow === true) from slider notes,
 * then calculates hold-time stats, hit-error stats, on-circle rate,
 * and miss breakdown.
 */
export function calculateMetrics(notes: ReplayNote[]): AnalysisMetrics {
  // ── Circle vs non-circle segregation ───────────────────────────────────────
  // onCircleHitWindow = True  → CIRCLE-type hit object
  // onCircleHitWindow = False → SLIDER or SPINNER hit object
  // This matches analyzer.osu.report: 59 circles + 86 sliders → rate = 59/145 = 40.7%
  const circleNotes    = notes.filter((n) => n.onCircleHitWindow);
  const nonCircleNotes = notes.filter((n) => !n.onCircleHitWindow);

  // ── HoldTime (hit circles only) ───────────────────────────────────────────────
  // Circles only: slider holds are 200-800ms — including them would hide short-holdtime patterns.
  // Misses excluded: missed notes have holdTime=0 which inflates "under 3ms" percentage.
  const circleHits = circleNotes.filter((n) => n.isHit);
  const holdTimes  = circleHits.map((n) => n.holdTime);

  const holdtimeMean = calculateMean(holdTimes);
  const holdtimeStd  = calculateStdDev(holdTimes);

  const under3     = holdTimes.filter((h) => h <= 3).length;
  const under10    = holdTimes.filter((h) => h <= 10).length;
  const gap11_100  = holdTimes.filter((h) => h >= 11 && h <= 100).length;
  const hasOver100 = holdTimes.some((h) => h > 100);

  const holdtimeUnder3ms  = holdTimes.length > 0 ? (under3  / holdTimes.length) * 100 : 0;
  const holdtimeUnder10ms = holdTimes.length > 0 ? (under10 / holdTimes.length) * 100 : 0;
  const holdtimeBimodal    = gap11_100 === 0 && hasOver100;
  const holdtimeDistribution = buildHoldtimeDistribution(holdTimes);
  const holdtimeHistogram     = buildHoldtimeHistogram(holdTimes);

  // ── Hit Error (all hit notes) ─────────────────────────────────────────────────
  const allHitNotes = notes.filter((n) => n.isHit);
  const hitErrors   = allHitNotes
    .filter((n) => n.hitError !== null)
    .map((n) => n.hitError as number);

  const hitErrorMean = calculateMean(hitErrors);
  const hitErrorStd  = calculateStdDev(hitErrors);
  const hitErrorSkew = calculateSkewness(hitErrors);
  const hitErrorHistogram = buildHitErrorHistogram(hitErrors);

  // ── OnCircle Rate (= circle-type ratio in map) ────────────────────────────
  // Proportion of notes that are circle-type objects.
  // Informational — depends on map composition, not a cheat indicator.
  const onCircleRate =
    notes.length > 0
      ? (circleNotes.length / notes.length) * 100
      : 0;

  // ── Notes Breakdown ─────────────────────────────────────────────────────────────
  const totalNotes      = notes.length;
  const circleCount     = circleNotes.length;
  const sliderCount     = nonCircleNotes.length;
  const hitCount        = allHitNotes.length;
  const missCount       = notes.filter((n) => !n.isHit).length;
  const circleMissCount = circleNotes.filter((n) => !n.isHit).length;
  const hitRate         = totalNotes > 0 ? (hitCount / totalNotes) * 100 : 0;

  return {
    holdtimeMean,
    holdtimeStd,
    holdtimeUnder3ms,
    holdtimeUnder10ms,
    holdtimeGap11_100: gap11_100,
    holdtimeBimodal,
    holdtimeDistribution,
    holdtimeHistogram,
    hitErrorMean,
    hitErrorStd,
    hitErrorSkew,
    hitErrorHistogram,
    onCircleRate,
    totalNotes,
    circleCount,
    sliderCount,
    spinnerCount: 0,
    hitCount,
    missCount,
    circleMissCount,
    hitRate,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the HoldTime suspicion score (0-100).
 *
 * High percentage of very-short hold times (≤3ms) is the primary driver.
 * A bimodal distribution (no notes in 11-100ms range but some over 100ms)
 * adds a +20 bonus (capped at 100).
 */
function scoreHoldTime(metrics: AnalysisMetrics): number {
  const pct = metrics.holdtimeUnder3ms;
  let score: number;

  if (pct >= 80) score = 100;
  else if (pct >= 60) score = 80;
  else if (pct >= 40) score = 60;
  else if (pct >= 20) score = 35;
  else score = 0;

  if (metrics.holdtimeBimodal) score = Math.min(100, score + 20);

  return score;
}

/**
 * Calculates the Hit Error suspicion score (0-100).
 *
 * Very low standard deviation of hit errors suggests machine-like precision.
 */
function scoreHitError(metrics: AnalysisMetrics): number {
  const std = metrics.hitErrorStd;
  // std = 0 means no hits to measure — don't penalize
  if (std === 0) return 0;
  if (std <= 5)  return 100;
  if (std <= 8)  return 85;
  if (std <= 10) return 65;
  if (std <= 15) return 30;
  return 0;
}

/**
 * OnCircleHitWindow score — NOTE: This is NOT a direct Relax indicator.
 * Relax hack only automates clicking; the player still aims manually.
 * A high OnCircle rate (cursor on hit area) is NORMAL for any player who hits notes.
 *
 * For CSV data from analyzer.osu.report: onCircleRate is calculated from the actual
 * cursor position vs circle position. We keep this score at 0 for most cases
 * since high accuracy is expected from a good player (with or without Relax).
 *
 * Only very low rates (<20%) are suspicious (suggests data quality / parsing issue).
 */
function scoreOnCircle(metrics: AnalysisMetrics): number {
  // OnCircle rate is not a reliable Relax indicator — always return 0 for scoring.
  // Keeping this at 0 prevents false positives for players with good aim.
  // The metric is shown for informational purposes in the indicator table.
  return 0;
}

/**
 * Calculates the Miss suspicion score (0-100).
 *
 * Zero misses (including slider breaks) on many notes is suspicious.
 * Relax hack auto-clicks at the perfect time, so the player never has
 * timing-based misses on circles. Slider breaks can still occur if the
 * cursor goes off the slider path.
 *
 * Thresholds scale with note count for fairness on short maps.
 */
function scoreCircleMiss(metrics: AnalysisMetrics): number {
  const { circleMissCount, circleCount } = metrics;
  if (circleMissCount > 0)                       return 0;   // has misses = human evidence
  if (circleCount <= 20)                         return 0;   // too few notes to judge
  if (circleCount <= 50)                         return 15;  // small map, 0 miss possible
  if (circleCount <= 100)                        return 35;
  if (circleCount <= 200)                        return 55;
  return 70;                                                 // 200+ notes, 0 miss = very suspicious
}

/**
 * Calculates all four component suspicion scores and the weighted final score.
 *
 * Weights (updated):
 *   HoldTime  = 50%  ← primary Relax indicator (key auto-clicks = very short holdtime)
 *   HitError  = 30%  ← secondary indicator (machine-like timing precision)
 *   OnCircle  =  0%  ← NOT a Relax indicator; kept for display only
 *   Miss      = 20%  ← supporting indicator (0 miss from many notes = suspicious)
 */
export function calculateScores(metrics: AnalysisMetrics): ScoreBreakdown {
  const holdtimeScore  = scoreHoldTime(metrics);
  const hitErrorScore  = scoreHitError(metrics);
  const onCircleScore  = scoreOnCircle(metrics);   // always 0, kept for API compat
  const circleMissScore = scoreCircleMiss(metrics);

  const finalScore =
    holdtimeScore  * 0.50 +
    hitErrorScore  * 0.30 +
    onCircleScore  * 0.00 +
    circleMissScore * 0.20;

  return {
    holdtimeScore,
    hitErrorScore,
    onCircleScore,
    circleMissScore,
    finalScore: Math.round(finalScore * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a final suspicion score into a human-readable verdict and the
 * corresponding UI colour token.
 *
 * Thresholds:
 *   ≥ 75 → "KEMUNGKINAN BESAR CHEAT"  (red)
 *   ≥ 50 → "MENCURIGAKAN"             (orange)
 *   ≥ 25 → "ABU-ABU"                  (yellow)
 *   < 25 → "KEMUNGKINAN BERSIH"       (green)
 */
export function generateVerdict(scores: ScoreBreakdown): {
  verdict: AnalysisResult['verdict'];
  verdictColor: AnalysisResult['verdictColor'];
} {
  const { finalScore } = scores;

  if (finalScore >= 75)
    return { verdict: 'KEMUNGKINAN BESAR CHEAT', verdictColor: 'red' };
  if (finalScore >= 50)
    return { verdict: 'MENCURIGAKAN', verdictColor: 'orange' };
  if (finalScore >= 25) return { verdict: 'ABU-ABU', verdictColor: 'yellow' };
  return { verdict: 'KEMUNGKINAN BERSIH', verdictColor: 'green' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point.  Parses a raw CSV string and returns the full
 * AnalysisResult (metrics + scores + verdict) along with any data-quality
 * warnings.
 *
 * @param csvContent  Raw file content as a UTF-8 string.
 * @param fileName    Original file name shown in the UI.
 */
export function analyzeReplay(
  csvContent: string,
  fileName: string
): { result: AnalysisResult; warnings: AnalysisWarning[] } {
  const { notes, warnings } = parseCSV(csvContent);

  if (notes.length === 0) {
    // Return a blank result; the caller should show the warnings instead.
    const emptyMetrics: AnalysisMetrics = {
      holdtimeMean: 0,
      holdtimeStd: 0,
      holdtimeUnder3ms: 0,
      holdtimeUnder10ms: 0,
      holdtimeGap11_100: 0,
      holdtimeBimodal: false,
      holdtimeDistribution: [],
      holdtimeHistogram: [],
      hitErrorMean: 0,
      hitErrorStd: 0,
      hitErrorSkew: 0,
      hitErrorHistogram: [],
      onCircleRate: 0,
      totalNotes: 0,
      circleCount: 0,
      sliderCount: 0,
      spinnerCount: 0,
      hitCount: 0,
      missCount: 0,
      circleMissCount: 0,
      hitRate: 0,
    };
    const emptyScores: ScoreBreakdown = {
      holdtimeScore: 0,
      hitErrorScore: 0,
      onCircleScore: 0,
      circleMissScore: 0,
      finalScore: 0,
    };
    return {
      result: {
        metrics: emptyMetrics,
        scores: emptyScores,
        verdict: 'KEMUNGKINAN BERSIH',
        verdictColor: 'green',
        fileName,
        noteCount: 0,
      },
      warnings,
    };
  }

  const metrics = calculateMetrics(notes);
  const scores = calculateScores(metrics);
  const { verdict, verdictColor } = generateVerdict(scores);

  return {
    result: {
      metrics,
      scores,
      verdict,
      verdictColor,
      fileName,
      noteCount: notes.length,
    },
    warnings,
  };
}
