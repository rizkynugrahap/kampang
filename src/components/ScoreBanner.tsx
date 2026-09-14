import React from 'react';
import { Match } from '../types';

interface ScoreBannerProps {
  matches: Match[];
  seasonTitle?: string;
}

export const ScoreBanner: React.FC<ScoreBannerProps> = ({ matches, seasonTitle = 'Season 41' }) => {
  const pohonWins = matches.filter((m) => m.winner === 'Tim Pohon').length;
  const lobbyWins = matches.filter((m) => m.winner === 'Tim Lobby').length;
  const total = matches.length;

  // Proportional split: the side with more wins gets a wider bar.
  // e.g. Pohon 4 vs Lobby 2 -> Pohon ~66.7%, Lobby ~33.3%.
  // Falls back to an even 50/50 split when there's no data yet.
  const pohonPct = total > 0 ? (pohonWins / total) * 100 : 50;
  const lobbyPct = total > 0 ? 100 - pohonPct : 50;

  // Keep each side from collapsing to nothing so its label stays readable
  // even at a lopsided score (e.g. 6-0).
  const MIN_PCT = 18;
  const pohonWidth = total > 0 ? Math.max(MIN_PCT, Math.min(100 - MIN_PCT, pohonPct)) : 50;
  const lobbyWidth = 100 - pohonWidth;

  return (
    <div
      id="score-banner-container"
      className="relative overflow-hidden rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-xl"
    >
      {/* Top bar header */}
      <div className="flex items-center justify-between border-b border-[#332C25] bg-[#191513] px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold tracking-wider text-[#9C948A] uppercase">
        <span className="flex items-center gap-1 sm:gap-1.5 text-[#4F7942] font-bold">
          <span className="inline-block h-2 w-2 rounded-full bg-[#4F7942]" />
          Tim Pohon
        </span>
        <span className="font-mono text-[9px] sm:text-[11px] text-[#9C948A] truncate px-1">
          {seasonTitle} · {total} Match
        </span>
        <span className="flex items-center gap-1 sm:gap-1.5 text-[#C97A3D] font-bold">
          Tim Lobby
          <span className="inline-block h-2 w-2 rounded-full bg-[#C97A3D]" />
        </span>
      </div>

      {/* Diagonal split score banner — bar width tracks each team's win share */}
      <div className="relative flex overflow-hidden">
        {/* Tim Pohon Left Wing */}
        <div
          id="banner-team-pohon"
          className="relative flex flex-col items-start justify-center py-5 pl-4 pr-7 transition-[width] duration-700 ease-out sm:py-10 sm:pl-8 sm:pr-12"
          style={{
            width: `${pohonWidth}%`,
            background: 'linear-gradient(135deg, #4F7942 0%, #35532c 100%)',
            clipPath: 'polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0% 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Pohon
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="font-black text-3xl sm:text-5xl md:text-7xl tracking-tight text-white leading-none">
                {pohonWins}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white/80">Win</span>
            </div>
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-100/80">
              {total > 0 ? Math.round((pohonWins / total) * 100) : 0}% WR
            </span>
          </div>
        </div>

        {/* Tim Lobby Right Wing */}
        <div
          id="banner-team-lobby"
          className="relative flex flex-col items-end justify-center py-5 pr-4 pl-7 text-right transition-[width] duration-700 ease-out sm:py-10 sm:pr-8 sm:pl-12"
          style={{
            width: `${lobbyWidth}%`,
            background: 'linear-gradient(315deg, #C97A3D 0%, #8c4e20 100%)',
            clipPath: 'polygon(24px 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col items-end">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Lobby
            </span>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold text-white/80">Win</span>
              <span className="font-black text-3xl sm:text-5xl md:text-7xl tracking-tight text-white leading-none">
                {lobbyWins}
              </span>
            </div>
            <span className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-orange-100/80">
              {total > 0 ? Math.round((lobbyWins / total) * 100) : 0}% WR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
