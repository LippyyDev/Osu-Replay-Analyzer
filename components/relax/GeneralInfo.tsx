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
  0: 'STANDARD', 1: 'TAIKO', 2: 'CATCH', 3: 'MANIA',
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
    <div className="flex items-center justify-between gap-3 py-3 border-b-[3px] border-black last:border-0">
      <div className="flex items-center gap-2 text-black/70 text-xs min-w-0 font-bold uppercase">
        <div className="bg-[var(--color-neo-bg)] brutal-border p-1">
          <span className="shrink-0">{icon}</span>
        </div>
        <span>{label}</span>
      </div>
      <span className={`text-black text-sm font-black truncate text-right ${mono ? 'font-mono text-xs bg-[var(--color-neo-yellow)] px-2 brutal-border shadow-[2px_2px_0_0_#000]' : ''}`}>
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
    default: 'bg-white text-black',
    pink:    'bg-[var(--color-neo-pink)] text-white',
    yellow:  'bg-[var(--color-neo-yellow)] text-black',
    blue:    'bg-[var(--color-neo-blue)] text-white',
    green:   'bg-[var(--color-neo-green)] text-black',
    red:     'bg-[var(--color-neo-red)] text-white',
  }[color];

  return (
    <div className={`flex flex-col gap-2 p-3 brutal-border shadow-[4px_4px_0_0_#000] font-mono ${colorCls}`}>
      <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest`}>
        <div className="bg-white text-black brutal-border p-0.5">
          {icon}
        </div>
        [{label}]
      </div>
      <p className={`text-xl font-black`}>{value}</p>
    </div>
  );
}

function ModBadge({ mod }: { mod: string }) {
  return (
    <span className="px-2 py-0.5 text-xs font-bold font-mono brutal-border bg-[var(--color-neo-yellow)] text-black shadow-[2px_2px_0_0_#000]">
      +{mod}
    </span>
  );
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
    <div
      className="relative w-full overflow-hidden border-[3px] border-black border-b-0"
      style={{ height: 250, borderRadius: '0' }}
    >

      {/* Skeleton */}
      {!coverLoaded && (
        <div className="absolute inset-0 bg-[var(--color-neo-bg)]" />
      )}

      {/* Cover image */}
      {!coverError && (
        <img
          src={imgSrc}
          alt="Beatmap cover"
          onLoad={() => setCoverLoaded(true)}
          onError={handleImgError}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
            coverLoaded ? 'opacity-100 grayscale-[20%]' : 'opacity-0'
          }`}
          style={{ filter: 'brightness(0.8) contrast(1.2)' }}
        />
      )}

      {/* Brutalist overlay grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none mix-blend-overlay" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />

      {/* User info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6 flex items-end gap-6 font-mono">
        {/* Avatar */}
        {userProfile?.avatarUrl && !avatarError ? (
          <div className="shrink-0 w-20 h-20 bg-[var(--color-neo-pink)] brutal-border shadow-[4px_4px_0_0_#000] p-1">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.username}
              onError={() => setAvatarError(true)}
              className="w-full h-full object-cover grayscale-[30%] contrast-125"
            />
          </div>
        ) : (
          <div className="shrink-0 w-20 h-20 bg-[var(--color-neo-pink)] brutal-border shadow-[4px_4px_0_0_#000] flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-3 flex-wrap bg-white w-fit px-3 py-1 brutal-border shadow-[2px_2px_0_0_#000] mb-2">
            <h3 className="text-2xl font-black text-black leading-none uppercase tracking-tight">
              {replayInfo.playerName}
            </h3>
            {countryDisplay && (
              <span className="text-sm font-bold text-black/60 uppercase">
                [{countryDisplay}]
              </span>
            )}
          </div>

          {/* Stats */}
          {userProfile && (
            <div className="flex items-center gap-2 flex-wrap">
              {userProfile.globalRank != null && (
                <div className="bg-[var(--color-neo-yellow)] brutal-border px-2 py-0.5 shadow-[2px_2px_0_0_#000] text-xs font-bold text-black flex gap-1 items-center uppercase">
                  <span>GLB</span>
                  <span className="font-black">#{userProfile.globalRank.toLocaleString()}</span>
                </div>
              )}
              {userProfile.countryRank != null && countryDisplay && (
                <div className="bg-[var(--color-neo-bg)] brutal-border px-2 py-0.5 shadow-[2px_2px_0_0_#000] text-xs font-bold text-black flex gap-1 items-center uppercase">
                  <span>{countryDisplay}</span>
                  <span className="font-black">#{userProfile.countryRank.toLocaleString()}</span>
                </div>
              )}
              {userProfile.pp != null && (
                <div className="bg-[var(--color-neo-blue)] text-white brutal-border px-2 py-0.5 shadow-[2px_2px_0_0_#000] text-xs font-bold flex gap-1 items-center uppercase">
                  <span>PP</span>
                  <span className="font-black">{userProfile.pp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
  const gameMode   = GAME_MODE_NAMES[replayInfo.gameMode] ?? `MODE_${replayInfo.gameMode}`;
  // onlineScoreId can be bigint (live) or string (loaded from JSON/Supabase)
  const scoreIdNum = typeof replayInfo.onlineScoreId === 'bigint'
    ? replayInfo.onlineScoreId
    : BigInt(replayInfo.onlineScoreId ?? 0);
  const replayId   = scoreIdNum > 0n
    ? scoreIdNum.toString()
    : 'N/A (LOCAL)';
  const hasDTSpeed = (replayInfo.mods & (64 | 512)) !== 0;
  const hasHTSpeed = (replayInfo.mods & 256) !== 0;
  const speedLabel = hasDTSpeed ? ' (DT)' : hasHTSpeed ? ' (HT)' : '';
  const totalObjects = computed.beatmapCircles + computed.beatmapSliders + computed.beatmapSpinners;
  // timestamp can be a Date (live) or ISO string (loaded from JSON/Supabase)
  const timestampDate = replayInfo.timestamp instanceof Date
    ? replayInfo.timestamp
    : new Date(replayInfo.timestamp);

  return (
    <div className="brutal-card bg-white overflow-hidden font-mono">

      {/* ── Hero Banner (Cover + User) ── */}
      <HeroBanner
        beatmapSetId={beatmapInfo.beatmapSetId}
        userProfile={userProfile}
        replayInfo={replayInfo}
      />

      {/* ── Title header ── */}
      <div className="px-6 py-6 border-b-[3px] border-black flex items-start justify-between gap-4 bg-[var(--color-neo-bg)]">
        <div className="min-w-0">
          <p className="text-[10px] bg-black text-white px-2 py-0.5 w-fit font-bold uppercase tracking-widest mb-3">
            GENERAL INFORMATION
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-black leading-tight uppercase">
            {beatmapInfo.artist} <span className="text-[var(--color-neo-pink)]">—</span> {beatmapInfo.title}
          </h3>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-black font-bold bg-white brutal-border px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
              [{beatmapInfo.version}]
            </span>
            <span className="text-white bg-black brutal-border px-2 py-0.5 font-bold shadow-[2px_2px_0_0_#000]">
              {beatmapInfo.starRating.toFixed(2)}★
            </span>
            <span className="text-black font-bold uppercase bg-[var(--color-neo-yellow)] brutal-border px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
              {totalObjects} OBJ
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block bg-white brutal-border p-3 shadow-[4px_4px_0_0_#000]">
          <div className="text-black font-black text-3xl">{beatmapInfo.starRating.toFixed(2)}★</div>
          <div className="text-black/60 text-sm font-bold mt-1 uppercase">{beatmapInfo.bpm.toFixed(0)} BPM</div>
        </div>
      </div>

      {/* ── Player + mods bar ── */}
      <div className="px-6 py-4 border-b-[3px] border-black flex flex-wrap items-center gap-x-6 gap-y-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 brutal-border bg-[var(--color-neo-pink)] flex items-center justify-center shadow-[2px_2px_0_0_#000]">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-black font-black text-base uppercase">{replayInfo.playerName}</span>
        </div>

        <div className="h-6 w-[3px] bg-black hidden sm:block" />

        <div className="flex items-center gap-2 flex-wrap">
          {mods.map((m) => <ModBadge key={m} mod={m} />)}
          {mods.length === 0 && <span className="text-sm font-bold uppercase opacity-50">NOMOD</span>}
        </div>

        <div className="h-6 w-[3px] bg-black hidden sm:block" />

        <div className="flex items-center gap-2 text-black font-bold text-sm bg-[var(--color-neo-bg)] brutal-border px-3 py-1 shadow-[2px_2px_0_0_#000]">
          <Clock className="w-4 h-4" />
          {timestampDate.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </div>
      </div>

      {/* ── Score chips ── */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-[var(--color-neo-bg)] border-b-[3px] border-black">
        <StatChip
          label="SCORE"
          value={replayInfo.score.toLocaleString()}
          icon={<Trophy className="w-4 h-4" />}
          color="yellow"
        />
        <StatChip
          label="ACCURACY"
          value={`${accuracy.toFixed(2)}%`}
          icon={<BarChart2 className="w-4 h-4" />}
          color="blue"
        />
        <StatChip
          label="MAX COMBO"
          value={`${replayInfo.maxCombo}x`}
          icon={<Swords className="w-4 h-4" />}
          color="pink"
        />
        <StatChip
          label="UNSTABLE RATE"
          value={computed.ur > 0 ? computed.ur.toFixed(2) : 'N/A'}
          icon={<Activity className="w-4 h-4" />}
          color={computed.ur > 0 && computed.ur < 100 ? 'green' : computed.ur > 200 ? 'red' : 'default'}
        />
        <StatChip
          label={`ADJ UR${speedLabel}`}
          value={computed.adjUr > 0 ? computed.adjUr.toFixed(2) : 'N/A'}
          icon={<Zap className="w-4 h-4" />}
          color={computed.adjUr > 0 && computed.adjUr < 100 ? 'green' : computed.adjUr > 200 ? 'red' : 'default'}
        />
      </div>

      {/* ── Two-column detail grid ── */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white">

        {/* Replay info column */}
        <div className="brutal-border bg-[var(--color-neo-bg)] px-5 pt-4 pb-2 shadow-[4px_4px_0_0_#000]">
          <p className="text-xs bg-black text-white px-2 py-1 w-fit font-black uppercase tracking-widest mb-3">
            REPLAY METADATA
          </p>
          <StatRow
            label="CLIENT VERSION"
            value={replayInfo.gameVersion > 0 ? replayInfo.gameVersion.toString() : 'UNKNOWN'}
            icon={<Hash className="w-4 h-4" />}
          />
          <StatRow
            label="GAME MODE"
            value={gameMode}
            icon={<Gamepad2 className="w-4 h-4" />}
          />
          <StatRow
            label="REPLAY ID"
            value={replayId}
            icon={<Hash className="w-4 h-4" />}
            mono
          />
          <StatRow
            label="AVG FRAMETIME"
            value={computed.avgFrametime > 0 ? `${computed.avgFrametime.toFixed(2)} ms` : 'N/A'}
            icon={<Timer className="w-4 h-4" />}
          />
          <StatRow
            label="TOTAL FRAMES"
            value={computed.totalFrames.toLocaleString()}
            icon={<Layers className="w-4 h-4" />}
          />
        </div>

        {/* Beatmap + hits column */}
        <div className="brutal-border bg-[var(--color-neo-bg)] px-5 pt-4 pb-2 shadow-[4px_4px_0_0_#000]">
          <p className="text-xs bg-black text-white px-2 py-1 w-fit font-black uppercase tracking-widest mb-3">
            BEATMAP AND HITS
          </p>
          <StatRow
            label="OD / CS / AR"
            value={`${beatmapInfo.od} / ${beatmapInfo.cs} / ${beatmapInfo.ar}`}
            icon={<Target className="w-4 h-4" />}
          />
          <StatRow
            label="CIRCLES"
            value={computed.beatmapCircles.toLocaleString()}
            icon={<Star className="w-4 h-4" />}
          />
          <StatRow
            label="SLIDERS"
            value={computed.beatmapSliders.toLocaleString()}
            icon={<Layers className="w-4 h-4" />}
          />
          <StatRow
            label="SPINNERS"
            value={computed.beatmapSpinners.toLocaleString()}
            icon={<Activity className="w-4 h-4" />}
          />
          <StatRow
            label="300 / 100 / 50 / ✕"
            value={`${replayInfo.count300} / ${replayInfo.count100} / ${replayInfo.count50} / ${replayInfo.countMiss}`}
            icon={<Trophy className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* ── Hit breakdown bar ── */}
      <div className="px-6 pb-6 bg-white">
        {total > 0 && (
          <div className="brutal-border p-3 bg-[var(--color-neo-bg)] shadow-[4px_4px_0_0_#000]">
            <div className="flex h-6 brutal-border overflow-hidden">
              {replayInfo.count300 > 0 && (
                <div className="bg-[var(--color-neo-blue)] border-r-2 border-black last:border-0" style={{ flex: replayInfo.count300 }} />
              )}
              {replayInfo.count100 > 0 && (
                <div className="bg-[var(--color-neo-green)] border-r-2 border-black last:border-0" style={{ flex: replayInfo.count100 }} />
              )}
              {replayInfo.count50 > 0 && (
                <div className="bg-[var(--color-neo-yellow)] border-r-2 border-black last:border-0" style={{ flex: replayInfo.count50 }} />
              )}
              {replayInfo.countMiss > 0 && (
                <div className="bg-[var(--color-neo-red)]" style={{ flex: replayInfo.countMiss }} />
              )}
            </div>
            <div className="flex gap-4 mt-3 flex-wrap font-bold text-sm uppercase">
              {[
                { label: '300', count: replayInfo.count300, color: 'text-[var(--color-neo-blue)]' },
                { label: '100', count: replayInfo.count100, color: 'text-[var(--color-neo-green)]' },
                { label: '50',  count: replayInfo.count50,  color: 'text-black bg-[var(--color-neo-yellow)] px-1 brutal-border' },
                { label: 'MISS', count: replayInfo.countMiss, color: 'text-[var(--color-neo-red)]' },
              ].map(({ label, count, color }) => (
                <span key={label} className={`flex gap-1 items-center ${color}`}>
                  <span>{label}:</span>
                  <span className="font-black text-black text-base">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
