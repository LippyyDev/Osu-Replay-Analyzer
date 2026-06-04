/**
 * reportGenerator.ts
 *
 * Generates a professional, detailed Markdown report from osu! replay analysis data.
 * Includes per-note tap timing, hold time, hit error, key used, type, and position.
 */

import Papa from 'papaparse';
import {
  AnalysisResult,
  AnalysisWarning,
  OsrReplayInfo,
  BeatmapInfo,
  OsrComputedStats,
} from './types';
import { modNames } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pad(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function signedMs(n: number | null): string {
  if (n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} ms`;
}

function verdict_emoji(verdict: string): string {
  switch (verdict) {
    case 'KEMUNGKINAN BESAR CHEAT': return '🔴';
    case 'MENCURIGAKAN':            return '🟠';
    case 'ABU-ABU':                 return '🟡';
    default:                        return '🟢';
  }
}

function score_bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty  = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${score.toFixed(1)}/100`;
}

function holdtime_label(ht: number): string {
  if (ht <= 3)   return 'SANGAT PENDEK ⚠️';
  if (ht <= 10)  return 'Pendek';
  if (ht <= 100) return 'Normal';
  return 'Panjang';
}

function note_type(onCircle: boolean): string {
  return onCircle ? 'Circle' : 'Slider/Spinner';
}

function hit_status(isHit: boolean, hitError: string | null): string {
  if (!isHit) return '❌ MISS';
  return `✅ Hit`;
}

function get_judgment(
  isHit: boolean,
  hitError: number | null,
  od: number
): string {
  if (!isHit || hitError === null) return '❌ Miss';
  const abs = Math.abs(hitError);
  const w300 = 80 - 6 * od;
  const w100 = 140 - 8 * od;
  if (abs <= w300) return '🔵 300';
  if (abs <= w100) return '🟢 100';
  return '🟡 50';
}

// ─────────────────────────────────────────────────────────────────────────────
// Row parser from CSV content
// ─────────────────────────────────────────────────────────────────────────────

interface NoteRow {
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
  od?: number;
}

function parseNotesFromCSV(csv: string): NoteRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return parsed.data.map((row) => {
    const get = (key: string): string => {
      const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
      return found ? (row[found] ?? '').trim() : '';
    };
    const hitErrorRaw = get('HitError');
    return {
      startTime:          parseFloat(get('StartTime'))         || 0,
      endTime:            parseFloat(get('EndTime'))           || 0,
      holdTime:           parseFloat(get('HoldTime'))          || 0,
      holdTimeNormalized: parseFloat(get('HoldTimeNormalized'))|| 0,
      key:                get('Key') || 'K1',
      onCircleHitWindow:  get('OnCircleHitWindow').toLowerCase() === 'true',
      isHit:              get('IsHit').toLowerCase() === 'true',
      hitError:           hitErrorRaw === '' ? null : parseFloat(hitErrorRaw),
      posX:               parseFloat(get('PosX')) || 0,
      posY:               parseFloat(get('PosY')) || 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────────────────────────────────────

function buildHeader(
  result: AnalysisResult,
  replayInfo: OsrReplayInfo | undefined,
  beatmapInfo: BeatmapInfo | undefined,
  generatedAt: string
): string {
  const player  = replayInfo?.playerName ?? 'CSV Upload';
  const mapLine = beatmapInfo
    ? `${beatmapInfo.artist} — ${beatmapInfo.title} [${beatmapInfo.version}]`
    : result.fileName;

  return [
    `# 🎮 osu! Replay Analysis Report`,
    ``,
    `> **Generated:** ${generatedAt}  `,
    `> **Analyzer:** osu! Cheat Detector — Relax Hack Analysis System  `,
    `> **File:** \`${result.fileName}\``,
    ``,
    `---`,
    ``,
    `## 👤 Player & Beatmap`,
    ``,
    `| Field            | Value |`,
    `|------------------|-------|`,
    `| **Player**       | ${player} |`,
    `| **Beatmap**      | ${mapLine} |`,
    ...(beatmapInfo ? [
      `| **Beatmap ID**   | ${beatmapInfo.beatmapId} |`,
      `| **Star Rating**  | ${pad(beatmapInfo.starRating, 2)} ★ |`,
      `| **BPM**          | ${beatmapInfo.bpm} |`,
      `| **OD / CS / AR** | ${beatmapInfo.od} / ${beatmapInfo.cs} / ${beatmapInfo.ar} |`,
    ] : []),
    ...(replayInfo ? [
      `| **Mods**         | ${modNames(replayInfo.mods).join(', ')} |`,
      `| **Score**        | ${replayInfo.score.toLocaleString()} |`,
      `| **Max Combo**    | ${replayInfo.maxCombo}x |`,
      `| **Perfect FC**   | ${replayInfo.perfectCombo ? 'Yes ✅' : 'No'} |`,
      `| **Timestamp**    | ${(replayInfo.timestamp instanceof Date ? replayInfo.timestamp : new Date(replayInfo.timestamp as unknown as string)).toISOString().replace('T', ' ').slice(0, 19)} UTC |`,
    ] : []),
    ``,
  ].join('\n');
}

function buildHitStats(replayInfo: OsrReplayInfo | undefined): string {
  if (!replayInfo) return '';
  const total = replayInfo.count300 + replayInfo.count100 + replayInfo.count50 + replayInfo.countMiss;
  const acc = total > 0
    ? ((replayInfo.count300 + replayInfo.count100 * (1/3) + replayInfo.count50 * (1/6)) / total * 100)
    : 0;

  return [
    `## 🏆 Hit Statistics`,
    ``,
    `| Judgement  | Count  | Share |`,
    `|------------|--------|-------|`,
    `| **300 (Great)** | ${replayInfo.count300} | ${total > 0 ? pct(replayInfo.count300/total*100) : '—'} |`,
    `| **100 (Ok)**    | ${replayInfo.count100} | ${total > 0 ? pct(replayInfo.count100/total*100) : '—'} |`,
    `| **50 (Meh)**    | ${replayInfo.count50}  | ${total > 0 ? pct(replayInfo.count50/total*100) : '—'}  |`,
    `| **Miss (X)**    | ${replayInfo.countMiss} | ${total > 0 ? pct(replayInfo.countMiss/total*100) : '—'} |`,
    `| **Total Notes** | ${total} | 100% |`,
    ``,
    `**Accuracy (approx.):** ${pct(acc)}`,
    ``,
  ].join('\n');
}

function buildVerdict(result: AnalysisResult): string {
  const emoji = verdict_emoji(result.verdict);
  const score = result.scores.finalScore;
  return [
    `## ${emoji} Verdict`,
    ``,
    `\`\`\``,
    ` Final Score : ${score_bar(score)}`,
    ` Verdict     : ${result.verdict}`,
    `\`\`\``,
    ``,
    `| Suspicion Level         | Score Range |`,
    `|-------------------------|-------------|`,
    `| 🔴 Kemungkinan Besar Cheat | ≥ 75       |`,
    `| 🟠 Mencurigakan            | 50 – 74    |`,
    `| 🟡 Abu-abu                 | 25 – 49    |`,
    `| 🟢 Kemungkinan Bersih      | < 25       |`,
    ``,
  ].join('\n');
}

function buildScoreBreakdown(result: AnalysisResult): string {
  const { scores, metrics } = result;
  return [
    `## 📊 Score Breakdown`,
    ``,
    `### HoldTime Score — Weight: 50%`,
    ``,
    `\`\`\``,
    ` ${score_bar(scores.holdtimeScore)}`,
    `\`\`\``,
    ``,
    `| Metric                     | Value |`,
    `|----------------------------|-------|`,
    `| HoldTime ≤ 3ms (circles)   | ${pct(metrics.holdtimeUnder3ms)} |`,
    `| HoldTime ≤ 10ms (circles)  | ${pct(metrics.holdtimeUnder10ms)} |`,
    `| Mean HoldTime              | ${pad(metrics.holdtimeMean, 2)} ms |`,
    `| Std Dev HoldTime           | ${pad(metrics.holdtimeStd, 2)} ms |`,
    `| Bimodal Distribution       | ${metrics.holdtimeBimodal ? 'Yes ⚠️' : 'No'} |`,
    `| Notes in 11–100ms gap      | ${metrics.holdtimeGap11_100} |`,
    ``,
    `> A very high ≤3ms percentage is the primary Relax hack indicator.`,
    `> Relax auto-click cannot hold a key for a realistic duration.`,
    ``,
    `---`,
    ``,
    `### Hit Error Score — Weight: 30%`,
    ``,
    `\`\`\``,
    ` ${score_bar(scores.hitErrorScore)}`,
    `\`\`\``,
    ``,
    `| Metric           | Value |`,
    `|------------------|-------|`,
    `| Mean Hit Error   | ${signedMs(metrics.hitErrorMean)} |`,
    `| Std Dev (σ)      | ±${pad(metrics.hitErrorStd, 2)} ms |`,
    `| Skewness         | ${pad(metrics.hitErrorSkew, 3)} |`,
    ``,
    `> Human players typically have σ > 10ms. A σ < 5ms is machine-like precision.`,
    ``,
    `---`,
    ``,
    `### Miss Score — Weight: 20%`,
    ``,
    `\`\`\``,
    ` ${score_bar(scores.circleMissScore)}`,
    `\`\`\``,
    ``,
    `| Metric                | Value |`,
    `|-----------------------|-------|`,
    `| Circle Miss Count     | ${metrics.circleMissCount} |`,
    `| Circle Note Count     | ${metrics.circleCount} |`,
    `| Miss Rate             | ${metrics.circleCount > 0 ? pct(metrics.circleMissCount / metrics.circleCount * 100) : '—'} |`,
    ``,
    `> Zero misses on 100+ circle notes is highly suspicious for human play.`,
    ``,
    `---`,
    ``,
    `### OnCircle Score — Info Only (Weight: 0%)`,
    ``,
    `| Metric            | Value |`,
    `|-------------------|-------|`,
    `| Circle Ratio      | ${pct(metrics.onCircleRate)} |`,
    `| Total Notes       | ${metrics.totalNotes} |`,
    `| Circle Notes      | ${metrics.circleCount} |`,
    `| Slider/Spinner    | ${metrics.sliderCount + metrics.spinnerCount} |`,
    `| Hit Rate          | ${pct(metrics.hitRate)} |`,
    ``,
  ].join('\n');
}

function buildComputedStats(computed: OsrComputedStats | undefined): string {
  if (!computed) return '';
  return [
    `## 📡 Computed Replay Stats`,
    ``,
    `| Metric              | Value |`,
    `|---------------------|-------|`,
    `| **Unstable Rate**   | ${pad(computed.ur, 2)} |`,
    `| **Adjusted UR**     | ${pad(computed.adjUr, 2)} |`,
    `| **Avg Frame Time**  | ${pad(computed.avgFrametime, 2)} ms |`,
    `| **Total Frames**    | ${computed.totalFrames.toLocaleString()} |`,
    `| **Map Circles**     | ${computed.beatmapCircles} |`,
    `| **Map Sliders**     | ${computed.beatmapSliders} |`,
    `| **Map Spinners**    | ${computed.beatmapSpinners} |`,
    ``,
    `> **UR (Unstable Rate):** Lower = more consistent timing.`,
    `> Standard UR for a skilled human: 70–130. Relax users often show very low UR (< 60).`,
    ``,
  ].join('\n');
}

function buildHoldtimeDistribution(result: AnalysisResult): string {
  const dist = result.metrics.holdtimeDistribution;
  if (!dist || dist.length === 0) return '';

  const maxCount = Math.max(...dist.map((d) => d.count), 1);
  const barWidth = 30;

  const rows = dist.map((d) => {
    const bar  = '█'.repeat(Math.round((d.count / maxCount) * barWidth));
    const flag = d.range === '1ms' || d.range === '2ms' || d.range === '3ms' ? ' ⚠️' : '';
    return `| \`${d.range.padEnd(8)}\` | ${d.count.toString().padStart(5)} | ${bar}${flag} |`;
  });

  return [
    `## ⏱️ HoldTime Distribution (Circle Notes)`,
    ``,
    `| Range    | Count | Bar |`,
    `|----------|-------|-----|`,
    ...rows,
    ``,
    `> ⚠️ = Suspicious range (≤ 3ms). Human players rarely release keys this fast.`,
    ``,
  ].join('\n');
}

function buildHitErrorHistogram(result: AnalysisResult): string {
  const hist = result.metrics.hitErrorHistogram;
  if (!hist || hist.length === 0) return '';

  const maxCount = Math.max(...hist.map((h) => h.count), 1);
  const barWidth = 25;

  // Only show bins with count > 0, up to 40 rows to keep report manageable
  const nonEmpty = hist.filter((h) => h.count > 0);
  const sampled = nonEmpty.length > 60
    ? nonEmpty.filter((_, i) => i % Math.ceil(nonEmpty.length / 60) === 0)
    : nonEmpty;

  const rows = sampled.map((h) => {
    const bar    = '█'.repeat(Math.round((h.count / maxCount) * barWidth));
    const label  = `${h.bin >= 0 ? '+' : ''}${h.bin} ms`;
    const ideal  = Math.abs(h.bin) <= 5 ? ' ◀ ideal' : '';
    return `| \`${label.padStart(7)}\` | ${h.count.toString().padStart(5)} | ${bar}${ideal} |`;
  });

  return [
    `## 🎯 Hit Error Histogram`,
    ``,
    `| Bin (ms) | Count | Distribution |`,
    `|----------|-------|--------------|`,
    ...rows,
    ``,
    `> ◀ ideal = within ±5ms window. A very tight cluster around 0 is suspicious.`,
    ``,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Column explanations section
// ─────────────────────────────────────────────────────────────────────────────

function buildColumnExplanations(): string {
  return [
    `## 📖 Penjelasan Kolom Full Note Log`,
    ``,
    `| Kolom | Penjelasan |`,
    `|-------|------------|`,
    `| **#** | Nomor urut note dalam replay |`,
    `| **Time (ms)** | Waktu saat tombol ditekan, diukur dalam milidetik (ms) dari awal lagu |`,
    `| **End (ms)** | Waktu saat tombol dilepas (ms dari awal lagu). Untuk miss: sama dengan Time. |`,
    `| **Hold (ms)** | Durasi tombol ditekan = End − Time (ms). Circle normal: 10–200ms. ≤3ms = mencurigakan (Relax hack). |`,
    `| **Hold% Beat** | Hold time sebagai persentase dari panjang 1 beat pada BPM saat itu. 100% = 1 ketukan penuh. |`,
    `| **Key** | Tombol yang ditekan: K1/K2 = keyboard, M1/M2 = mouse button. |`,
    `| **Type** | Tipe hit object: Circle = note bulat (ditekan 1x), Slider/Spinner = note panjang. |`,
    `| **Status** | Hit (✅) = tombol ditekan dalam hit window, Miss (❌) = tidak ada klik yang cocok. |`,
    `| **Hit Error** | Selisih waktu klik vs waktu ideal note (ms). Negatif = early (terlalu cepat), Positif = late (terlambat), 0 = sempurna. |`,
    `| **Pos X** | Posisi kursor horizontal saat tombol ditekan (0–512 osu!pixels, kiri→kanan). |`,
    `| **Pos Y** | Posisi kursor vertikal saat tombol ditekan (0–384 osu!pixels, atas→bawah). |`,
    ``,
    `### Hit Window Reference`,
    ``,
    `Judgment ditentukan dari **|Hit Error|** vs hit window OD:`,
    ``,
    `\`\`\``,
    `🔵 300 : |hitError| ≤ (80  - 6×OD) ms`,
    `🟢 100 : |hitError| ≤ (140 - 8×OD) ms`,
    `🟡 50  : |hitError| ≤ (200 - 10×OD) ms`,
    `❌ Miss : di luar window 50, atau tidak ada klik`,
    `\`\`\``,
    ``,
    `> Dengan DT/NC: window dibagi 1.5 (lebih ketat). Dengan HT: window dibagi 0.75 (lebih longgar).`,
    ``,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-note data table
// ─────────────────────────────────────────────────────────────────────────────

function buildNoteTable(csvContent: string, od: number = 8): string {
  const notes = parseNotesFromCSV(csvContent);
  if (notes.length === 0) return '';

  const lines: string[] = [
    `## 📋 Per-Note Timing Data`,
    ``,
    `Total notes: **${notes.length}**  `,
    `Circle notes: **${notes.filter((n) => n.onCircleHitWindow).length}**  `,
    `Slider/Spinner: **${notes.filter((n) => !n.onCircleHitWindow).length}**  `,
    `Hits: **${notes.filter((n) => n.isHit).length}** | Misses: **${notes.filter((n) => !n.isHit).length}**`,
    ``,
  ];

  // Summary stats by type
  const circles = notes.filter((n) => n.onCircleHitWindow && n.isHit);
  const sliders  = notes.filter((n) => !n.onCircleHitWindow && n.isHit);

  if (circles.length > 0) {
    const htValues = circles.map((n) => n.holdTime);
    const htMean   = htValues.reduce((s, v) => s + v, 0) / htValues.length;
    const htMin    = Math.min(...htValues);
    const htMax    = Math.max(...htValues);
    const under3   = htValues.filter((h) => h <= 3).length;

    lines.push(
      `### Circle Note Summary`,
      ``,
      `| Stat         | Value |`,
      `|--------------|-------|`,
      `| Mean HoldTime | ${pad(htMean, 2)} ms |`,
      `| Min HoldTime  | ${htMin} ms |`,
      `| Max HoldTime  | ${htMax} ms |`,
      `| ≤ 3ms count   | ${under3} / ${circles.length} (${pct(under3/circles.length*100)}) |`,
      ``,
    );
  }

  if (sliders.length > 0) {
    const htValues = sliders.map((n) => n.holdTime);
    const htMean   = htValues.reduce((s, v) => s + v, 0) / htValues.length;
    lines.push(
      `### Slider/Spinner Note Summary`,
      ``,
      `| Stat            | Value |`,
      `|-----------------|-------|`,
      `| Mean HoldTime   | ${pad(htMean, 2)} ms |`,
      `| Count           | ${sliders.length} |`,
      ``,
    );
  }

  // Full per-note table
  lines.push(
    `### Full Note Log`,
    ``,
    `| # | Time (ms) | End (ms) | Hold (ms) | Hold% Beat | Key | Type | Status | Hit Error | Pos X | Pos Y |`,
    `|---|-----------|----------|-----------|------------|-----|------|--------|-----------|-------|-------|`,
  );

  notes.forEach((n, i) => {
    const htFlag  = n.isHit && n.onCircleHitWindow && n.holdTime <= 3 ? ' ⚠️' : '';
    const status  = n.isHit ? `✅ Hit` : `❌ Miss`;
    const errStr  = n.hitError !== null ? signedMs(n.hitError) : '—';
    const htStr   = n.isHit ? `${n.holdTime}${htFlag}` : '—';
    const htNorm  = n.isHit ? `${n.holdTimeNormalized}%` : '—';

    lines.push(
      `| ${(i + 1).toString().padStart(4)} | ${n.startTime.toFixed(0).padStart(8)} | ${n.endTime.toFixed(0).padStart(8)} | ${htStr.toString().padStart(9)} | ${htNorm.padStart(10)} | ${n.key.padEnd(2)} | ${note_type(n.onCircleHitWindow).padEnd(14)} | ${status} | ${errStr.padStart(9)} | ${n.posX.toFixed(1)} | ${n.posY.toFixed(1)} |`
    );
  });

  lines.push(``, `> ⚠️ = HoldTime ≤ 3ms (suspicious for circle notes)`, ``);
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Miss-only table
// ─────────────────────────────────────────────────────────────────────────────

function buildMissTable(csvContent: string): string {
  const notes = parseNotesFromCSV(csvContent);
  const misses = notes
    .map((n, i) => ({ ...n, index: i + 1 }))
    .filter((n) => !n.isHit);

  if (misses.length === 0) {
    return [
      `## ❌ Miss Log`,
      ``,
      `✅ No misses detected in this replay.`,
      ``,
    ].join('\n');
  }

  const rows = misses.map((n) =>
    `| ${n.index.toString().padStart(4)} | ${n.startTime.toFixed(0)} | ${note_type(n.onCircleHitWindow)} | ${n.posX.toFixed(1)} | ${n.posY.toFixed(1)} |`
  );

  return [
    `## ❌ Miss Log`,
    ``,
    `Total misses: **${misses.length}**`,
    ``,
    `| Note # | Time (ms) | Type | Pos X | Pos Y |`,
    `|--------|-----------|------|-------|-------|`,
    ...rows,
    ``,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretation & footer
// ─────────────────────────────────────────────────────────────────────────────

function buildInterpretation(result: AnalysisResult): string {
  const { metrics, scores, verdict } = result;
  const parts: string[] = [];

  if (verdict === 'KEMUNGKINAN BESAR CHEAT') {
    parts.push('Berdasarkan analisis, replay ini menunjukkan pola yang **sangat konsisten** dengan penggunaan Relax hack.');
  } else if (verdict === 'MENCURIGAKAN') {
    parts.push('Replay ini memiliki beberapa indikator yang mencurigakan, namun belum cukup konklusif untuk memastikan penggunaan cheat.');
  } else if (verdict === 'ABU-ABU') {
    parts.push('Data replay berada di area abu-abu — beberapa indikator sedikit di luar rentang normal namun tidak ada pola yang dominan.');
  } else {
    parts.push('Tidak ditemukan pola yang signifikan mengindikasikan penggunaan Relax hack pada replay ini.');
  }

  if (scores.holdtimeScore >= 60) {
    parts.push(
      `HoldTime sangat pendek (${pct(metrics.holdtimeUnder3ms)} ketukan circle di bawah 3ms) — ini adalah tanda utama Relax hack karena klik otomatis tidak dapat menahan tombol secara wajar.`
    );
  } else if (scores.holdtimeScore >= 35) {
    parts.push(
      `HoldTime cukup pendek untuk ${pct(metrics.holdtimeUnder3ms)} ketukan, namun masih bisa dijelaskan dengan gaya bermain tertentu.`
    );
  } else {
    parts.push(
      `HoldTime terlihat wajar (${pct(metrics.holdtimeUnder3ms)} ketukan circle di bawah 3ms).`
    );
  }

  if (metrics.holdtimeBimodal) {
    parts.push(
      'Distribusi HoldTime bersifat **bimodal** (hanya ada nilai sangat pendek dan sangat panjang, tidak ada di tengah) — ini pola klasik Relax hack.'
    );
  }

  if (scores.hitErrorScore >= 65) {
    parts.push(
      `Standar deviasi hit error yang sangat rendah (±${pad(metrics.hitErrorStd, 2)} ms) menunjukkan konsistensi mekanik yang melampaui kemampuan manusia normal.`
    );
  } else {
    parts.push(
      `Standar deviasi hit error (±${pad(metrics.hitErrorStd, 2)} ms) berada dalam rentang yang wajar untuk manusia.`
    );
  }

  if (scores.circleMissScore >= 70) {
    parts.push(
      `Nihil miss pada ${metrics.circleCount} circle notes — tidak menemukan satu pun kesalahan dalam jumlah note sebanyak itu sangat tidak wajar untuk pemain manusia.`
    );
  } else if (metrics.circleMissCount > 0) {
    parts.push(
      `Adanya **${metrics.circleMissCount} miss** pada circle notes merupakan indikasi ketidaksempurnaan yang lebih konsisten dengan pemain manusia.`
    );
  }

  return [
    `## 💬 Interpretation`,
    ``,
    parts.map((p) => `- ${p}`).join('\n'),
    ``,
    `---`,
    ``,
    `> **⚠️ Disclaimer:** Hasil analisis ini bukan keputusan final tentang status akun.`,
    `> Ini adalah alat bantu analisis berdasarkan pola statistik, bukan bukti konklusif.`,
    `> Konteks permainan, hardware, dan gaya bermain individu harus selalu dipertimbangkan.`,
    ``,
  ].join('\n');
}

function buildFooter(generatedAt: string): string {
  return [
    `---`,
    ``,
    `*Report generated by **osu! Cheat Detector** on ${generatedAt}*  `,
    `*Powered by osu! API · Support .osr & CSV from analyzer.osu.report*  `,
    `*This report is for educational purposes only.*`,
    ``,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportOptions {
  result: AnalysisResult;
  warnings: AnalysisWarning[];
  replayInfo?: OsrReplayInfo;
  beatmapInfo?: BeatmapInfo;
  computed?: OsrComputedStats;
  csvContent?: string;
}

/**
 * Generates a detailed, professional Markdown report from analysis data.
 * Includes per-note timing, hold times, hit errors, miss log, and distribution charts.
 */
export function generateMarkdownReport(opts: ReportOptions): string {
  const {
    result, warnings, replayInfo, beatmapInfo, computed, csvContent,
  } = opts;

  const generatedAt = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' WIB';

  const sections: string[] = [];

  sections.push(buildHeader(result, replayInfo, beatmapInfo, generatedAt));

  if (replayInfo) {
    sections.push(buildHitStats(replayInfo));
  }

  if (warnings.length > 0) {
    sections.push(
      `## ⚠️ Warnings\n`,
      ...warnings.map((w) => `- **[${w.type}]** ${w.message}`),
      ``,
    );
  }

  sections.push(buildVerdict(result));
  sections.push(buildScoreBreakdown(result));

  if (computed) {
    sections.push(buildComputedStats(computed));
  }

  sections.push(buildHoldtimeDistribution(result));
  sections.push(buildHitErrorHistogram(result));

  if (csvContent) {
    sections.push(buildColumnExplanations());
    sections.push(buildMissTable(csvContent));
    sections.push(buildNoteTable(csvContent, beatmapInfo?.od ?? 8));
  }

  sections.push(buildInterpretation(result));
  sections.push(buildFooter(generatedAt));

  return sections.join('\n');
}

/**
 * Triggers a browser download of the generated Markdown report.
 */
export function downloadMarkdownReport(opts: ReportOptions, filename?: string): void {
  const md      = generateMarkdownReport(opts);
  const blob    = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  const name    = filename
    ?? opts.result.fileName.replace(/\.(osr|csv)$/i, '') + '_analysis_report.md';

  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
