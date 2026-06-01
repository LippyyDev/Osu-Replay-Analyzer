'use client';

import { BeatmapInfo, OsrComputedStats, OsrReplayInfo, UserProfile, modNames } from '@/lib/types';
import {
  User, Music, Swords, Trophy, Star, BarChart2, Clock,
  Gamepad2, Hash, Layers, Activity, Timer, Zap, Target
} from 'lucide-react';
import { useState } from 'react';

interface GeneralInfoProps {
  replayInfo: OsrReplayInfo;
  beatmapInfo: BeatmapInfo;
  computed: OsrComputedStats;
  userProfile?: UserProfile | null;
}

// ─── Game mode name ────────────────────────────────────────────────────────────
const GAME_MODE_NAMES: Record<number, string> = {
  0: 'Standard', 1: 'Taiko', 2: 'Catch', 3: 'Mania',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatRow({
  label, value, icon, mono = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 text-white/35 text-xs min-w-0">
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`text-white/85 text-sm font-semibold truncate text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function StatChip({ label, value, color = 'default', icon }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'default' | 'pink' | 'yellow' | 'blue' | 'green' | 'red';
}) {
  const colorCls = {
    default: 'bg-white/[0.04] border-white/[0.06]',
    pink:    'bg-pink-500/10 border-pink-500/20',
    yellow:  'bg-yellow-500/10 border-yellow-500/20',
    blue:    'bg-blue-500/10 border-blue-500/20',
    green:   'bg-green-500/10 border-green-500/20',
    red:     'bg-red-500/10 border-red-500/20',
  }[color];
  const textCls = {
    default: 'text-white',
    pink:    'text-pink-300',
    yellow:  'text-yellow-300',
    blue:    'text-blue-300',
    green:   'text-green-300',
    red:     'text-red-300',
  }[color];
  const labelCls = {
    default: 'text-white/30',
    pink:    'text-pink-400/60',
    yellow:  'text-yellow-400/60',
    blue:    'text-blue-400/60',
    green:   'text-green-400/60',
    red:     'text-red-400/60',
  }[color];

  return (
    <div className={`flex flex-col gap-1.5 px-3.5 py-3 rounded-xl border ${colorCls}`}>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold ${labelCls}`}>
        {icon}
        {label}
      </div>
      <p className={`text-sm font-bold ${textCls}`}>{value}</p>
    </div>
  );
}

function ModBadge({ mod }: { mod: string }) {
  const cls: Record<string, string> = {
    NF: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    EZ: 'bg-green-500/20 text-green-300 border-green-500/30',
    HD: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    HR: 'bg-red-500/20 text-red-300 border-red-500/30',
    DT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    HT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    FL: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    RX: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    AP: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    NoMod: 'bg-white/5 text-white/40 border-white/10',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${cls[mod] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
      {mod}
    </span>
  );
}

// ─── Country code → flag emoji ────────────────────────────────────────────────

function countryToFlag(code: string): string {
  // Regional Indicator Symbol letters: A = U+1F1E6, offset from 'A' (65) = 127397
  return code
    .toUpperCase()
    .split('')
    .map((ch) => String.fromCodePoint(ch.charCodeAt(0) + 127397))
    .join('');
}

// ─── Hero Banner ───────────────────────────────────────────────────────────────────────────

function HeroBanner({
  beatmapSetId,
  userProfile,
  replayInfo,
}: {
  beatmapSetId: number;
  userProfile?: UserProfile | null;
  replayInfo: OsrReplayInfo;
}) {
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // osu! CDN cover.jpg = 900×250 — matches the requested 900×250 size
  const cover2x = `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/cover@2x.jpg`;
  const cover1x = `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/cover.jpg`;

  const [triedCover2x, setTriedCover2x] = useState(false);
  const imgSrc = !triedCover2x ? cover2x : cover1x;

  function handleImgError() {
    if (!triedCover2x) { setTriedCover2x(true); return; }
    setCoverError(true);
  }

  const countryDisplay = userProfile?.countryName || userProfile?.countryCode || null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 250 }}>

      {/* Skeleton */}
      {!coverLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1a1025] to-[#0d1a2e]" />
      )}

      {/* Cover image — 900×250, fills container edge-to-edge */}
      {!coverError && (
        <img
          src={imgSrc}
          alt="Beatmap cover"
          onLoad={() => setCoverLoaded(true)}
          onError={handleImgError}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
            coverLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ filter: 'brightness(0.65)' }}
        />
      )}

      {/* Left gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent pointer-events-none" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#13131a]/85 to-transparent pointer-events-none" />

      {/* User info — bottom-left */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-4 flex items-end gap-4">

        {/* Avatar */}
        {userProfile?.avatarUrl && !avatarError ? (
          <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/25 shadow-2xl">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.username}
              onError={() => setAvatarError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="shrink-0 w-14 h-14 rounded-xl bg-white/10 border-2 border-white/15 flex items-center justify-center">
            <User className="w-6 h-6 text-white/60" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + country full name */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-black text-white drop-shadow-lg leading-none">
              {replayInfo.playerName}
            </h3>
            {countryDisplay && (
              <span className="text-xs font-semibold text-white/60 drop-shadow">
                {countryDisplay}
              </span>
            )}
          </div>

          {/* Stats */}
          {userProfile && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {userProfile.globalRank != null && (
                <div className="flex items-center gap-1">
                  <span className="text-white/45 text-[10px]">Global</span>
                  <span className="text-yellow-300 text-xs font-bold drop-shadow">#{userProfile.globalRank.toLocaleString()}</span>
                </div>
              )}
              {userProfile.countryRank != null && countryDisplay && (
                <div className="flex items-center gap-1">
                  <span className="text-white/45 text-[10px]">{countryDisplay}</span>
                  <span className="text-pink-300 text-xs font-bold drop-shadow">#{userProfile.countryRank.toLocaleString()}</span>
                </div>
              )}
              {userProfile.pp != null && (
                <div className="flex items-center gap-1">
                  <span className="text-white/45 text-[10px]">pp</span>
                  <span className="text-blue-300 text-xs font-bold drop-shadow">
                    {userProfile.pp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {userProfile.accuracy != null && (
                <div className="flex items-center gap-1">
                  <span className="text-white/45 text-[10px]">Acc</span>
                  <span className="text-green-300 text-xs font-bold drop-shadow">{userProfile.accuracy.toFixed(2)}%</span>
                </div>
              )}
              {userProfile.level != null && (
                <div className="flex items-center gap-1">
                  <span className="text-white/45 text-[10px]">Lv</span>
                  <span className="text-purple-300 text-xs font-bold drop-shadow">{userProfile.level}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function GeneralInfo({ replayInfo, beatmapInfo, computed, userProfile }: GeneralInfoProps) {
  const total =
    replayInfo.count300 + replayInfo.count100 + replayInfo.count50 + replayInfo.countMiss;
  const accuracy =
    total > 0
      ? ((replayInfo.count300 * 300 + replayInfo.count100 * 100 + replayInfo.count50 * 50) /
          (total * 300)) *
        100
      : 0;

  const mods       = modNames(replayInfo.mods);
  const gameMode   = GAME_MODE_NAMES[replayInfo.gameMode] ?? `Mode ${replayInfo.gameMode}`;
  const replayId   = replayInfo.onlineScoreId > 0n
    ? replayInfo.onlineScoreId.toString()
    : 'N/A (local)';
  const hasDTSpeed = (replayInfo.mods & (64 | 512)) !== 0;
  const hasHTSpeed = (replayInfo.mods & 256) !== 0;
  const speedLabel = hasDTSpeed ? ' (DT÷1.5)' : hasHTSpeed ? ' (HT÷0.75)' : '';
  const totalObjects = computed.beatmapCircles + computed.beatmapSliders + computed.beatmapSpinners;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#13131a] overflow-hidden">

      {/* ── Hero Banner (Cover + User) ── */}
      <HeroBanner
        beatmapSetId={beatmapInfo.beatmapSetId}
        userProfile={userProfile}
        replayInfo={replayInfo}
      />

      {/* ── Title header ── */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] text-pink-400/70 font-semibold uppercase tracking-widest mb-1.5">
            General Information
          </p>
          <h3 className="text-xl font-black text-white leading-tight truncate">
            {beatmapInfo.artist} — {beatmapInfo.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-white/40 text-sm">[{beatmapInfo.version}]</span>
            <span className="text-white/20">·</span>
            <span className="text-yellow-400 text-sm font-bold">{beatmapInfo.starRating.toFixed(2)}★</span>
            <span className="text-white/20">·</span>
            <span className="text-white/30 text-sm">{totalObjects} objects</span>
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <div className="text-yellow-400 font-black text-2xl">{beatmapInfo.starRating.toFixed(2)}★</div>
          <div className="text-white/25 text-xs mt-0.5">{beatmapInfo.bpm.toFixed(0)} BPM</div>
        </div>
      </div>

      {/* ── Player + mods bar ── */}
      <div className="px-6 py-3.5 border-b border-white/[0.04] flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <span className="text-white font-semibold text-sm">{replayInfo.playerName}</span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {mods.map((m) => <ModBadge key={m} mod={m} />)}
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1.5 text-white/30 text-xs">
          <Clock className="w-3 h-3" />
          {replayInfo.timestamp.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </div>
      </div>

      {/* ── Score chips ── */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatChip
          label="Score"
          value={replayInfo.score.toLocaleString()}
          icon={<Trophy className="w-3 h-3" />}
          color="yellow"
        />
        <StatChip
          label="Accuracy"
          value={`${accuracy.toFixed(2)}%`}
          icon={<BarChart2 className="w-3 h-3" />}
          color="blue"
        />
        <StatChip
          label="Max Combo"
          value={`${replayInfo.maxCombo}x`}
          icon={<Swords className="w-3 h-3" />}
          color="pink"
        />
        <StatChip
          label="Unstable Rate"
          value={computed.ur > 0 ? computed.ur.toFixed(2) : 'N/A'}
          icon={<Activity className="w-3 h-3" />}
          color={computed.ur > 0 && computed.ur < 100 ? 'green' : computed.ur > 200 ? 'red' : 'default'}
        />
        <StatChip
          label={`Adj. UR${speedLabel}`}
          value={computed.adjUr > 0 ? computed.adjUr.toFixed(2) : 'N/A'}
          icon={<Zap className="w-3 h-3" />}
          color={computed.adjUr > 0 && computed.adjUr < 100 ? 'green' : computed.adjUr > 200 ? 'red' : 'default'}
        />
      </div>

      {/* ── Two-column detail grid ── */}
      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Replay info column */}
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 pt-3 pb-1">
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-1">Replay</p>
          <StatRow
            label="Game Version"
            value={replayInfo.gameVersion > 0 ? replayInfo.gameVersion.toString() : 'Unknown'}
            icon={<Hash className="w-3 h-3" />}
          />
          <StatRow
            label="Game Mode"
            value={gameMode}
            icon={<Gamepad2 className="w-3 h-3" />}
          />
          <StatRow
            label="Replay ID"
            value={replayId}
            icon={<Hash className="w-3 h-3" />}
            mono
          />
          <StatRow
            label="Avg Frametime"
            value={computed.avgFrametime > 0 ? `${computed.avgFrametime.toFixed(2)} ms` : 'N/A'}
            icon={<Timer className="w-3 h-3" />}
          />
          <StatRow
            label="Total Frames"
            value={computed.totalFrames.toLocaleString()}
            icon={<Layers className="w-3 h-3" />}
          />
        </div>

        {/* Beatmap + hits column */}
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 pt-3 pb-1">
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-1">Beatmap &amp; Hits</p>
          <StatRow
            label="OD / CS / AR"
            value={`${beatmapInfo.od} / ${beatmapInfo.cs} / ${beatmapInfo.ar}`}
            icon={<Target className="w-3 h-3" />}
          />
          <StatRow
            label="Circles"
            value={computed.beatmapCircles.toLocaleString()}
            icon={<Star className="w-3 h-3" />}
          />
          <StatRow
            label="Sliders"
            value={computed.beatmapSliders.toLocaleString()}
            icon={<Layers className="w-3 h-3" />}
          />
          <StatRow
            label="Spinners"
            value={computed.beatmapSpinners.toLocaleString()}
            icon={<Activity className="w-3 h-3" />}
          />
          <StatRow
            label="300 / 100 / 50 / ✕"
            value={`${replayInfo.count300} / ${replayInfo.count100} / ${replayInfo.count50} / ${replayInfo.countMiss}`}
            icon={<Trophy className="w-3 h-3" />}
          />
        </div>
      </div>

      {/* ── Hit breakdown bar ── */}
      <div className="px-5 pb-5">
        {total > 0 && (
          <>
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              {replayInfo.count300 > 0 && (
                <div className="bg-blue-400" style={{ flex: replayInfo.count300 }} />
              )}
              {replayInfo.count100 > 0 && (
                <div className="bg-green-400" style={{ flex: replayInfo.count100 }} />
              )}
              {replayInfo.count50 > 0 && (
                <div className="bg-yellow-400" style={{ flex: replayInfo.count50 }} />
              )}
              {replayInfo.countMiss > 0 && (
                <div className="bg-red-500" style={{ flex: replayInfo.countMiss }} />
              )}
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: '300', count: replayInfo.count300, color: 'text-blue-400' },
                { label: '100', count: replayInfo.count100, color: 'text-green-400' },
                { label: '50',  count: replayInfo.count50,  color: 'text-yellow-400' },
                { label: 'Miss', count: replayInfo.countMiss, color: 'text-red-400' },
              ].map(({ label, count, color }) => (
                <span key={label} className={`text-xs font-medium ${color}`}>
                  {label}: {count}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
