import React from 'react';
import { X, Trophy, Sparkles, Shield, User } from 'lucide-react';
import { Player, Match } from '../types';
import { getPlayerTopHeroes } from '../utils/stats';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';

interface PlayerModalProps {
  player: Player | null;
  matches: Match[];
  onClose: () => void;
  onViewProfile?: (playerId: number | string) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  matches,
  onClose,
  onViewProfile,
}) => {
  if (!player) return null;

  const topHeroes = getPlayerTopHeroes(player.name, matches);

  const total =
    player.medals.MVP +
      player.medals.Gold +
      player.medals.Silver +
      player.medals.Coklat || 1;

  return (
    <div
      id="player-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        id="player-modal-card"
        className="w-full max-w-md rounded-t-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#332C25] pb-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar
              name={player.name}
              avatarUrl={player.avatar_url}
              size="lg"
              status={player.status}
              showStatusDot
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-[#F2EDE4]">{player.name}</h3>
                <span className="rounded bg-[#241F1B] px-2 py-0.5 text-xs text-[#9C948A]">
                  {player.status}
                </span>
              </div>
              <p className="text-xs text-[#9C948A]">
                Tier: <span className="text-[#F2EDE4]">{player.tier}</span> · Total {player.total_match} Pertandingan
              </p>
            </div>
          </div>
          <button
            id="close-player-modal-button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4]"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Medals overview */}
        <div className="my-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg border border-[#332C25] bg-[#241F1B] p-2">
            <span className="block font-black text-base text-[#E8B33D]">
              {player.medals.MVP}
            </span>
            <span className="text-[10px] font-semibold text-[#9C948A] uppercase">
              MVP
            </span>
          </div>
          <div className="rounded-lg border border-[#332C25] bg-[#241F1B] p-2">
            <span className="block font-black text-base text-[#D8A93A]">
              {player.medals.Gold}
            </span>
            <span className="text-[10px] font-semibold text-[#9C948A] uppercase">
              Gold
            </span>
          </div>
          <div className="rounded-lg border border-[#332C25] bg-[#241F1B] p-2">
            <span className="block font-black text-base text-[#B9B2A8]">
              {player.medals.Silver}
            </span>
            <span className="text-[10px] font-semibold text-[#9C948A] uppercase">
              Silver
            </span>
          </div>
          <div className="rounded-lg border border-[#332C25] bg-[#241F1B] p-2">
            <span className="block font-black text-base text-[#b8764a]">
              {player.medals.Coklat}
            </span>
            <span className="text-[10px] font-semibold text-[#9C948A] uppercase">
              Coklat
            </span>
          </div>
        </div>

        {/* Top 3 Hero andalan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-semibold text-xs text-[#E8B33D] uppercase tracking-wider">
              <Sparkles size={14} /> Top 3 Hero Andalan
            </h4>
            <span className="text-[11px] text-[#9C948A]">MVP Rate</span>
          </div>

          <div className="space-y-2">
            {topHeroes.map((heroStat, i) => (
              <div
                key={heroStat.hero}
                className="rounded-lg border border-[#332C25] bg-[#241F1B] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1D1916] font-bold text-xs text-[#9C948A]">
                      {i + 1}
                    </span>
                    <HeroAvatar heroName={heroStat.hero} size="sm" shape="rounded" />
                    <span className="font-semibold text-sm text-[#F2EDE4]">
                      {heroStat.hero}
                    </span>
                  </div>
                  <span className="text-xs text-[#9C948A]">
                    {heroStat.games} match ·{' '}
                    <span className="font-bold text-[#E8B33D]">
                      {heroStat.mvpRate}% MVP
                    </span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#191513]">
                  <div
                    className="h-full rounded-full bg-[#E8B33D] transition-all"
                    style={{ width: `${Math.max(5, heroStat.mvpRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex gap-2">
          {onViewProfile && (
            <button
              id="view-full-profile-btn"
              onClick={() => {
                onViewProfile(player.id);
                onClose();
              }}
              className="flex-1 rounded-lg border border-[#E8B33D]/40 bg-[#E8B33D]/10 py-2.5 font-semibold text-xs text-[#E8B33D] hover:bg-[#E8B33D]/20"
            >
              Buka Profil Lengkap & Grafik
            </button>
          )}
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#332C25] bg-[#241F1B] py-2.5 font-semibold text-xs text-[#F2EDE4] hover:bg-[#2b2520]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
