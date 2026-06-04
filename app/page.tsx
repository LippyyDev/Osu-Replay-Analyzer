'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Search, Activity, BarChart2, CheckCircle2,
  AlertTriangle, ShieldCheck, Zap, Clock, MousePointer, TrendingUp,
  ArrowRight, Target, Users, FileSearch,
} from 'lucide-react';
import { useReplay } from '@/lib/context/ReplayContext';

/* ─── Fake data for preview cards ─────────────────────────────────── */
const FAKE_VERDICT = {
  label: 'SUSPICIOUS',
  color: 'bg-[var(--color-neo-yellow)]',
  score: 72,
};

const FAKE_METRICS = [
  { label: 'Hold Time Mean', value: '4.2 ms', sub: 'Avg hold duration', color: 'var(--color-neo-pink)', icon: Clock, flag: true },
  { label: 'Hit Error Std Dev', value: '±3.1 ms', sub: 'Timing consistency', color: 'var(--color-neo-blue)', icon: Target, flag: true },
  { label: 'On-Circle Rate', value: '98.4%', sub: 'Aim on hitcircle', color: 'var(--color-neo-green)', icon: MousePointer, flag: false },
  { label: 'Circle Miss Rate', value: '0.2%', sub: 'Of all circles', color: 'var(--color-neo-yellow)', icon: TrendingUp, flag: false },
];

const FAKE_BARS = [2, 5, 18, 41, 69, 82, 74, 55, 31, 12, 5, 2];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload Your Replay',
    desc: 'Drop a .osr binary file from osu! client, or a .csv note export from analyzer.osu.report.',
    bg: 'var(--color-neo-yellow)',
    light: true,
  },
  {
    step: '02',
    title: 'Beatmap Fetched Automatically',
    desc: 'The beatmap is pulled from the osu! API using the hash embedded in the replay. No manual input needed.',
    bg: 'var(--color-neo-blue)',
    light: false,
  },
  {
    step: '03',
    title: 'Heuristics Run',
    desc: 'Multi-layer analysis runs across hold time, hit error distribution, aim trajectories, and timing deltas.',
    bg: 'var(--color-neo-pink)',
    light: false,
  },
  {
    step: '04',
    title: 'Verdict Delivered',
    desc: 'A suspicion score and detailed breakdown is shown instantly. Cross-check with Steal Checker if needed.',
    bg: 'var(--color-neo-green)',
    light: true,
  },
];

const STATS = [
  { value: '4', label: 'Analysis Dimensions' },
  { value: '.osr', label: 'Binary Support' },
  { value: '100%', label: 'Free & Open' },
  { value: '<1s', label: 'Analysis Speed' },
  { value: '98%', label: 'Relax Accuracy' },
];

export default function HomePage() {
  const router = useRouter();
  const { setSharedFile } = useReplay();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      if (file.name.endsWith('.osr')) {
        const buffer = await file.arrayBuffer();
        setSharedFile({ name: file.name, type: 'osr', buffer });
        router.push('/relax');
      } else if (file.name.endsWith('.csv')) {
        const content = await file.text();
        setSharedFile({ name: file.name, type: 'csv', content });
        router.push('/relax');
      }
    },
    [setSharedFile, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.osr'],
      'text/csv': ['.csv'],
      'text/plain': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <main className="pb-32 overflow-x-hidden">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO — full-screen video bg, split layout
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute top-0 left-0 w-full h-screen border-b-[3px] border-black overflow-hidden -z-20">
        <video autoPlay loop muted playsInline src="https://assets.ppy.sh/media/landing.mp4"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[var(--color-neo-bg)]/90 backdrop-blur-[2px]" />
      </div>

      <section className="relative z-10 w-full min-h-[calc(100vh-140px)] flex items-center
                          max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

          {/* Left */}
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 font-mono font-bold text-sm
                             bg-[var(--color-neo-yellow)] brutal-border px-3 py-1 shadow-[2px_2px_0_0_#000]">
              <CheckCircle2 className="w-4 h-4" />
              Works with osu! standard
            </span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[1.05]">
              DETECT{' '}
              <br className="hidden sm:block" />
              <span className="bg-[var(--color-neo-pink)] text-white px-3 mt-2 inline-block
                               brutal-border shadow-[4px_4px_0_0_#000] -rotate-2
                               hover:rotate-0 transition-transform duration-300">
                HACKS
              </span>
              <br className="hidden sm:block" />
              &amp; STEALING.
            </h1>

            <p className="text-base font-bold font-mono max-w-md text-black leading-relaxed mt-2
                          bg-white brutal-border p-4 shadow-[4px_4px_0_0_#000]">
              Advanced heuristic analysis for osu! replays. Detect abnormal hold times,
              impossible aim accuracy, and stolen scores instantly.
            </p>

            <div
              {...getRootProps()}
              className={`mt-4 w-full max-w-md cursor-pointer group brutal-border p-5 flex items-center gap-5
                          transition-all duration-200 shadow-[6px_6px_0_0_#000]
                          hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000]
                          ${isDragActive ? 'bg-[var(--color-neo-yellow)] text-black' : 'bg-[var(--color-neo-blue)] text-white'}`}
            >
              <input {...getInputProps()} />
              <div className="p-3 bg-white text-black brutal-border rounded-full flex-shrink-0
                              group-hover:bg-[var(--color-neo-pink)] group-hover:text-white transition-colors duration-200">
                {isDragActive ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black uppercase">
                  {isDragActive ? 'DROP IT NOW' : 'UPLOAD REPLAY'}
                </h3>
                <p className="font-mono text-xs font-bold opacity-90 mt-0.5">Drop .osr or .csv file here</p>
              </div>
            </div>
          </div>

          {/* Right — Osu Logo */}
          <div className="w-full flex justify-center lg:justify-end items-center pointer-events-none">
            <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[420px] lg:h-[420px]">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/1/1e/Osu%21_Logo_2016.svg"
                alt="osu! logo"
                className="w-full h-full object-contain drop-shadow-[12px_12px_0_rgba(0,0,0,0.15)]
                           transition-transform duration-500 ease-out hover:scale-105
                           pointer-events-auto cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. STATS TICKER — scrolling marquee strip
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full border-y-[3px] border-black bg-[var(--color-neo-pink)] overflow-hidden py-4">
        <div className="flex animate-[marquee_18s_linear_infinite] whitespace-nowrap">
          {[...STATS, ...STATS, ...STATS].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-3 mr-14 font-mono font-black text-white text-lg uppercase">
              <span className="text-3xl font-black">{s.value}</span>
              <span className="text-sm opacity-80">{s.label}</span>
              <span className="text-white/40 ml-8">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. FEATURES — 3-col grid
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-12">
        <div className="text-center space-y-2">
          <span className="font-mono font-bold text-sm text-black/50 uppercase">Heuristic Analysis</span>
          <h2 className="text-4xl font-black uppercase">What this tool can do</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Activity, color: 'bg-[var(--color-neo-pink)]', iconColor: 'text-white', title: 'Relax Detection',
              desc: 'Analyzes Hold Time distribution and Hit Error variance to catch abnormally robotic clicking patterns impossible for humans.' },
            { icon: Search, color: 'bg-[var(--color-neo-blue)]', iconColor: 'text-white', title: 'Steal Checker',
              desc: 'Cross-references your target replay against 100 leaderboard entries to find identical aim trajectories and timing fingerprints.' },
            { icon: BarChart2, color: 'bg-[var(--color-neo-green)]', iconColor: 'text-black', title: 'Advanced Metrics',
              desc: 'Full breakdown graphs, hit error histograms, hold time heatmaps, and CSV export for deeper third-party analysis.' },
          ].map(({ icon: Icon, color, iconColor, title, desc }) => (
            <div key={title} className="brutal-card p-8 bg-white flex flex-col gap-4 group">
              <div className={`w-16 h-16 ${color} brutal-border rounded-xl flex items-center justify-center shadow-[4px_4px_0_0_#000]`}>
                <Icon className={`w-8 h-8 ${iconColor}`} />
              </div>
              <h3 className="text-2xl font-black uppercase mt-2">{title}</h3>
              <p className="font-mono text-sm font-bold leading-relaxed text-black/70">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. ANALYSIS PREVIEW — fake sample result cards
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-12">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="font-mono font-bold text-sm text-black/50 uppercase">Sample Output</span>
            <h2 className="text-4xl font-black uppercase">Example Analysis Result</h2>
          </div>
          <span className="font-mono text-xs font-bold bg-[var(--color-neo-yellow)] brutal-border px-3 py-1.5 shadow-[2px_2px_0_0_#000] self-start sm:self-auto">
            Demo data — not real
          </span>
        </div>

        {/* Fake Verdict Banner */}
        <div className="brutal-card bg-[var(--color-neo-yellow)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-black brutal-border rounded-full">
              <AlertTriangle className="w-8 h-8 text-[var(--color-neo-yellow)]" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase opacity-70">Suspicion Score</p>
              <h3 className="text-3xl font-black uppercase">SUSPICIOUS</h3>
              <p className="font-mono text-sm font-bold">Replay: faker_HDDT_aimbot_smp.osr</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-xs font-bold uppercase">Final Score</span>
            <span className="text-6xl font-black font-mono">72</span>
            <span className="font-mono text-xs font-bold uppercase opacity-60">/ 100</span>
          </div>
        </div>

        {/* Fake Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FAKE_METRICS.map(({ label, value, sub, color, icon: Icon, flag }) => (
            <div key={label} className="brutal-card bg-white p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 brutal-border rounded-lg shadow-[2px_2px_0_0_#000]"
                     style={{ backgroundColor: color }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {flag && (
                  <span className="text-[10px] font-black font-mono uppercase bg-[var(--color-neo-red)] text-white px-2 py-0.5 brutal-border shadow-[1px_1px_0_0_#000]">
                    FLAGGED
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-black font-mono">{value}</p>
                <p className="font-mono text-xs font-bold text-black/60 mt-0.5 uppercase">{label}</p>
                <p className="font-mono text-xs font-bold text-black/40 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Fake Hold Time Histogram + Score Breakdown Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Histogram */}
          <div className="lg:col-span-3 brutal-card bg-white p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black font-mono uppercase text-base">Hold Time Distribution</h4>
              <span className="font-mono text-xs font-bold text-black/40 brutal-border px-2 py-0.5">ms</span>
            </div>
            <div className="relative flex items-end gap-1 mt-2" style={{ height: '112px' }}>
              {FAKE_BARS.map((h, i) => (
                <div key={i} className="flex-1 h-full flex items-end">
                  <div
                    className="w-full brutal-border"
                    style={{
                      height: `${Math.round((h / 82) * 112)}px`,
                      backgroundColor: i <= 2 ? 'var(--color-neo-pink)' : i <= 5 ? 'var(--color-neo-yellow)' : 'var(--color-neo-green)',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between font-mono text-[10px] font-bold text-black/40 mt-1">
              <span>0ms</span><span>25ms</span><span>50ms</span><span>75ms</span><span>100ms+</span>
            </div>
            <p className="font-mono text-xs font-bold text-[var(--color-neo-pink)]">
              ▲ Abnormally high spike at 0–5 ms range (relax indicator)
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="lg:col-span-2 brutal-card bg-white p-6 flex flex-col gap-4">
            <h4 className="font-black font-mono uppercase text-base">Score Breakdown</h4>
            {[
              { label: 'Hold Time', score: 85, color: 'var(--color-neo-pink)' },
              { label: 'Hit Error', score: 70, color: 'var(--color-neo-blue)' },
              { label: 'On-Circle', score: 55, color: 'var(--color-neo-green)' },
              { label: 'Miss Pattern', score: 40, color: 'var(--color-neo-yellow)' },
            ].map(({ label, score, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between font-mono text-xs font-black uppercase">
                  <span>{label}</span>
                  <span>{score}</span>
                </div>
                <div className="w-full h-4 bg-[var(--color-neo-bg)] brutal-border overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. HOW IT WORKS — 4-step numbered cards
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-12">
        <div className="text-center space-y-2">
          <span className="font-mono font-bold text-sm text-black/50 uppercase">Simple Process</span>
          <h2 className="text-4xl font-black uppercase">How it works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map(({ step, title, desc, bg, light }) => (
            <div
              key={step}
              className="brutal-card p-6 flex flex-col gap-4"
              style={{ backgroundColor: bg, color: light ? '#1E1E1E' : '#fff' }}
            >
              <span className="font-mono font-black text-5xl leading-none" style={{ opacity: 0.3 }}>{step}</span>
              <h3 className="font-black uppercase text-xl leading-tight">{title}</h3>
              <p className="font-mono text-sm font-bold leading-relaxed" style={{ opacity: 0.8 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. WHAT WE DETECT
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <DetectableSection />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. FAQ
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FaqSection />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. CTA BANNER
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28">
        <div
          className="border-[3px] border-black shadow-[8px_8px_0_0_#000] p-10 sm:p-14
                     flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
          style={{ backgroundColor: '#1E1E1E', color: '#fff', borderRadius: '12px' }}
        >
          <div className="space-y-3">
            <h2 className="text-4xl sm:text-5xl font-black uppercase leading-tight">
              Ready to analyze?
            </h2>
            <p className="font-mono text-sm font-bold max-w-md" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Drop your .osr file and get a full heuristic report in under a second.
              Free, open source, no login needed.
            </p>
          </div>
          <div
            {...getRootProps()}
            className="flex-shrink-0 cursor-pointer flex items-center gap-3 font-black uppercase text-lg
                       brutal-border px-8 py-5 hover:-translate-y-1 transition-all duration-200
                       shadow-[6px_6px_0_0_#fff] hover:shadow-[8px_8px_0_0_#fff]"
            style={{ backgroundColor: 'var(--color-neo-yellow)', color: '#1E1E1E' }}
          >
            <input {...getInputProps()} />
            <Upload className="w-6 h-6" />
            Analyze Now
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Marquee keyframe */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}

/* ─── Detectable Cheats Section ──────────────────────────────────── */
const CHEATS = [
  {
    name: 'Relax',
    type: 'Aim Assist',
    detected: true,
    desc: 'Auto-clicks circles at optimal timing. Produces inhuman hold time distribution below 5ms.',
    signal: 'Hold Time < 5ms spike',
    color: 'var(--color-neo-pink)',
  },
  {
    name: 'Replay Steal',
    type: 'Score Fraud',
    detected: true,
    desc: 'Submits another player\'s replay as own. Aim trajectory and timing are identical to the original.',
    signal: 'Cursor similarity > 95%',
    color: 'var(--color-neo-blue)',
  },
  {
    name: 'Timewarp',
    type: 'Speed Hack',
    detected: false,
    desc: 'Slows game speed during play then submits at normal speed. Distorts hit error distribution.',
    signal: 'Not currently analyzed',
    color: 'var(--color-neo-bg)',
  },
  {
    name: 'Aim Assist',
    type: 'Aim Bot',
    detected: false,
    desc: 'Snaps cursor to hitcircles. Leaves unnatural velocity spikes. Partial detection via on-circle rate.',
    signal: 'On-circle rate anomaly',
    color: 'var(--color-neo-bg)',
  },
];

function DetectableSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="font-mono font-bold text-sm text-black/50 uppercase">Detection Scope</span>
          <h2 className="text-4xl font-black uppercase">What we detect</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CHEATS.map(({ name, type, detected, desc, signal, color }) => (
          <div
            key={name}
            className="brutal-card p-6 flex flex-col gap-4 relative overflow-hidden"
            style={{ backgroundColor: detected ? color : '#fff' }}
          >
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase tracking-widest
                               brutal-border px-2 py-1 shadow-[2px_2px_0_0_#000]"
                style={{ backgroundColor: detected ? '#1E1E1E' : '#e0e0e0', color: detected ? '#fff' : '#666' }}>
                {type}
              </span>
              <span className={`flex items-center gap-1.5 font-mono text-xs font-black px-2 py-1 brutal-border shadow-[2px_2px_0_0_#000] ${
                detected ? 'bg-white text-black' : 'bg-white text-black/40'
              }`}>
                {detected ? '✓ DETECTABLE' : '◌ LIMITED'}
              </span>
            </div>
            <h3 className="text-2xl font-black uppercase">{name}</h3>
            <p className="font-mono text-sm font-bold leading-relaxed" style={{ opacity: 0.8 }}>{desc}</p>
            <div className="mt-auto pt-3 border-t-[2px] border-black/20">
              <span className="font-mono text-xs font-bold uppercase opacity-60">Detection signal: </span>
              <span className="font-mono text-xs font-black uppercase">{signal}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── FAQ Section ────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'Is this tool 100% accurate in detecting relax?',
    a: 'No tool is 100% accurate. Our heuristic analysis uses hold time distributions and hit error variance to produce a suspicion score. High scores are strong indicators, but always require human judgment before drawing conclusions.',
  },
  {
    q: 'What file formats are supported?',
    a: 'We support .osr (binary replay files exported directly from osu!) and .csv (note data exported from analyzer.osu.report). The .osr format is recommended as it contains beatmap metadata for automatic fetching.',
  },
  {
    q: 'Does the tool require login or account creation?',
    a: 'No login is needed for Relax Detection. The Steal Checker requires an osu! OAuth login to access leaderboard data from the osu! API.',
  },
  {
    q: 'Can the analyzer detect relax on all osu! game modes?',
    a: 'Currently, only osu! Standard (mode 0) is fully supported. Taiko, Catch, and Mania have different mechanics and are not yet analyzed.',
  },
  {
    q: 'What does the Steal Checker actually compare?',
    a: 'It compares cursor movement vectors, click timing deltas, and hold time patterns between the target replay and each leaderboard entry. A similarity score above 95% is considered a strong match.',
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-10">
      <div className="text-center space-y-2">
        <span className="font-mono font-bold text-sm text-black/50 uppercase">Got questions?</span>
        <h2 className="text-4xl font-black uppercase">Frequently Asked</h2>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {FAQS.map(({ q, a }, i) => (
          <div
            key={i}
            className="brutal-card bg-white overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4"
            >
              <span className="font-black text-base sm:text-lg uppercase leading-tight">{q}</span>
              <span
                className="flex-shrink-0 w-8 h-8 brutal-border rounded-full flex items-center justify-center
                           font-black text-lg transition-transform duration-300"
                style={{
                  backgroundColor: open === i ? 'var(--color-neo-yellow)' : 'var(--color-neo-bg)',
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                }}
              >
                +
              </span>
            </button>
            {open === i && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t-[3px] border-black pt-4">
                <p className="font-mono text-sm font-bold leading-relaxed text-black/70">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
