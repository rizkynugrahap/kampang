import React from 'react';
import { Match } from '../types';

interface ScoreBannerProps {
  matches: Match[];
}

export const ScoreBanner: React.FC<ScoreBannerProps> = ({ matches }) => {
  const pohonWins = matches.filter((m) => m.winner === 'Tim Pohon').length;
  const lobbyWins = matches.filter((m) => m.winner === 'Tim Lobby').length;
  const total = matches.length;

  return (
    <div
      id="score-banner-container"
      className="relative overflow-hidden rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-xl"
    >
      {/* Top bar header */}
      <div className="flex items-center justify-between border-b border-[#332C25] bg-[#191513] px-4 py-2 text-xs font-semibold tracking-wider text-[#9C948A] uppercase">
        <span className="flex items-center gap-1.5 text-[#4F7942]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#4F7942]" />
          Tim Pohon
        </span>
        <span className="font-mono text-[11px] text-[#9C948A]">
          Musim 1 · {total} Pertandingan
        </span>
        <span className="flex items-center gap-1.5 text-[#C97A3D]">
          Tim Lobby
          <span className="inline-block h-2 w-2 rounded-full bg-[#C97A3D]" />
        </span>
      </div>

      {/* Diagonal split score banner */}
      <div className="relative grid grid-cols-2">
        {/* Tim Pohon Left Wing */}
        <div
          id="banner-team-pohon"
          className="relative flex flex-col items-start justify-center py-8 pl-5 pr-8 sm:py-10 sm:pl-8 sm:pr-12"
          style={{
            background: 'linear-gradient(135deg, #4F7942 0%, #35532c 100%)',
            clipPath: 'polygon(0 0, 100% 0, 84% 100%, 0% 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col">
            <span className="text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Pohon
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-5xl tracking-tight text-white sm:text-6xl md:text-7xl">
                {pohonWins}
              </span>
              <span className="text-sm font-semibold text-white/80">Kemenangan</span>
            </div>
            <span className="mt-1 text-[11px] font-medium text-emerald-100/70">
              {total > 0 ? Math.round((pohonWins / total) * 100) : 0}% Winrate
            </span>
          </div>
        </div>

        {/* Tim Lobby Right Wing */}
        <div
          id="banner-team-lobby"
          className="relative flex flex-col items-end justify-center py-8 pr-5 pl-8 text-right sm:py-10 sm:pr-8 sm:pl-12"
          style={{
            background: 'linear-gradient(315deg, #C97A3D 0%, #8c4e20 100%)',
            clipPath: 'polygon(16% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col items-end">
            <span className="text-xs font-bold tracking-wider text-white/80 uppercase">
              Tim Lobby
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-white/80">Kemenangan</span>
              <span className="font-black text-5xl tracking-tight text-white sm:text-6xl md:text-7xl">
                {lobbyWins}
              </span>
            </div>
            <span className="mt-1 text-[11px] font-medium text-amber-100/70">
              {total > 0 ? Math.round((lobbyWins / total) * 100) : 0}% Winrate
            </span>
          </div>
        </div>

        {/* Center VS pill badge */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border-2 border-[#161311] bg-[#241F1B] px-3 py-1 font-black text-xs tracking-widest text-[#E8B33D] shadow-md">
            VS
          </div>
        </div>
      </div>

      {/* Sub-banner footer caption */}
      <div className="flex items-center justify-between border-t border-[#332C25] bg-[#1D1916] px-4 py-2 text-[11px] text-[#9C948A]">
        <span>Sistem penilaian berbasis Medali (MVP/Gold/Silver/Coklat)</span>
        <span className="italic text-[#E8B33D]/90">Kompetisi Laga Santai</span>
      </div>
    </div>
  );
};
