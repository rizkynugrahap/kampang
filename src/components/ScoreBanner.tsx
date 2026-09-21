import React from 'react';
import { Match } from '../types';

interface ScoreBannerProps {
  matches: Match[];
  seasonTitle?: string;
}

const BALANCED_MIN_PCT = 18;
const SLIVER_PCT = 8;
const BAR_TRANSITION = 'width 800ms cubic-bezier(0.22, 1, 0.36, 1)';

export const ScoreBanner: React.FC<ScoreBannerProps> = ({ matches, seasonTitle = 'Season 41' }) => {
  const pohonWins = matches.filter((m) => m.winner === 'Tim Pohon').length;
  const lobbyWins = matches.filter((m) => m.winner === 'Tim Lobby').length;
  const total = matches.length;

  let pohonWidth = 50;
  if (total > 0) {
    if (pohonWins === 0 && lobbyWins > 0) {
      // Kanan menang semua: hijau tersisa sedikit supaya oranye hampir penuh.
      pohonWidth = SLIVER_PCT;
    } else if (lobbyWins === 0 && pohonWins > 0) {
      // Kiri menang semua: hijau hampir penuh, oranye masih kelihatan sedikit.
      pohonWidth = 100 - SLIVER_PCT;
    } else {
      const pohonPct = (pohonWins / total) * 100;
      pohonWidth = Math.max(BALANCED_MIN_PCT, Math.min(100 - BALANCED_MIN_PCT, pohonPct));
    }
  }
  const lobbyWidth = 100 - pohonWidth;

  return (
    <div
      id="score-banner-container"
      className="relative overflow-hidden rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[#332C25] bg-[#191513] px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold tracking-wider text-[#9C948A] uppercase">
        <span className="flex items-center gap-1 sm:gap-1.5 text-[#4F7942] font-bold">
          <span className="inline-block h-2 w-2 rounded-full bg-[#4F7942]" />
          Tim Kiri
        </span>
        <span className="font-mono text-[9px] sm:text-[11px] text-[#9C948A] truncate px-1">
          {seasonTitle} · {total} Match
        </span>
        <span className="flex items-center gap-1 sm:gap-1.5 text-[#C97A3D] font-bold">
          Tim Kanan
          <span className="inline-block h-2 w-2 rounded-full bg-[#C97A3D]" />
        </span>
      </div>

      <div className="relative flex overflow-hidden">
        <div
          id="banner-team-pohon"
          className="relative flex flex-col items-start justify-center overflow-hidden py-5 pl-4 pr-7 sm:py-10 sm:pl-8 sm:pr-12"
          style={{
            flex: `0 0 ${pohonWidth}%`,
            width: `${pohonWidth}%`,
            minWidth: 0,
            background: 'linear-gradient(135deg, #4F7942 0%, #35532c 100%)',
            clipPath: 'polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0% 100%)',
            transition: BAR_TRANSITION,
            willChange: 'flex-basis, width',
          }}
        >
          <div
            className={`relative z-10 flex flex-col overflow-hidden transition-opacity duration-500 ${
              pohonWidth < 16 ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Kiri
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

        <div
          id="banner-team-lobby"
          className="relative flex flex-col items-end justify-center overflow-hidden py-5 pr-4 pl-7 text-right sm:py-10 sm:pr-8 sm:pl-12"
          style={{
            flex: `0 0 ${lobbyWidth}%`,
            width: `${lobbyWidth}%`,
            minWidth: 0,
            background: 'linear-gradient(315deg, #C97A3D 0%, #8c4e20 100%)',
            clipPath: 'polygon(24px 0, 100% 0, 100% 100%, 0% 100%)',
            transition: BAR_TRANSITION,
            willChange: 'flex-basis, width',
          }}
        >
          <div
            className={`relative z-10 flex flex-col items-end overflow-hidden transition-opacity duration-500 ${
              lobbyWidth < 16 ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Kanan
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
