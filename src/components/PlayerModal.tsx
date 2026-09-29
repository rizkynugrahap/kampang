import React, { useState } from 'react';
import { X, Trophy, Sparkles, Shield, User, ZoomIn, MousePointerClick } from 'lucide-react';
import { Player, Match } from '../types';
import { getPlayerTopHeroes, getPlayerHeroesByMedal, MedalType } from '../utils/stats';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { ImagePreviewModal } from './ImagePreviewModal';
import { getPlayerAvatarUrl } from '../constants/playerAvatars';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<MedalType | null>(null);

  if (!player) return null;

  const topHeroes = getPlayerTopHeroes(player.name, matches);
  const medalHeroes = selectedMedal ? getPlayerHeroesByMedal(player.name, selectedMedal, matches) : [];

  const total =
    player.medals.MVP +
      player.medals.Gold +
      player.medals.Silver +
      player.medals.Coklat || 1;

  return (
    <>
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
              <div
                id={`modal-avatar-preview-trigger-${player.id}`}
                onClick={() => setIsPreviewOpen(true)}
                className="relative group cursor-pointer"
                title="Klik untuk memperbesar foto profil"
              >
                <PlayerAvatar
                  name={player.name}
                  avatarUrl={player.avatar_url}
                  size="lg"
                  status={player.status}
                  showStatusDot
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[#E8B33D]">
                  <ZoomIn size={16} />
                </div>
              </div>
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

        {/* Medals overview (Clickable KPI) */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-bold text-[#9C948A] flex items-center gap-1">
              <MousePointerClick size={11} className="text-[#E8B33D]" />
              <span>KPI Medali (Klik untuk lihat hero)</span>
            </span>
            {selectedMedal && (
              <button
                type="button"
                onClick={() => setSelectedMedal(null)}
                className="text-[10px] text-[#E8B33D] hover:underline font-bold"
              >
                Tutup [x]
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              type="button"
              onClick={() => setSelectedMedal((prev) => (prev === 'MVP' ? null : 'MVP'))}
              className={`rounded-lg border p-2 transition-all cursor-pointer ${
                selectedMedal === 'MVP'
                  ? 'border-[#E8B33D] bg-[#2E2419] ring-2 ring-[#E8B33D] shadow-sm'
                  : 'border-[#332C25] bg-[#241F1B] hover:border-[#E8B33D]/60'
              }`}
            >
              <span className="block font-black text-base text-[#E8B33D]">
                {player.medals.MVP}
              </span>
              <span className="text-[10px] font-bold text-[#E8B33D] uppercase">
                MVP
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMedal((prev) => (prev === 'Gold' ? null : 'Gold'))}
              className={`rounded-lg border p-2 transition-all cursor-pointer ${
                selectedMedal === 'Gold'
                  ? 'border-[#D8A93A] bg-[#2C2114] ring-2 ring-[#D8A93A] shadow-sm'
                  : 'border-[#332C25] bg-[#241F1B] hover:border-[#D8A93A]/60'
              }`}
            >
              <span className="block font-black text-base text-[#D8A93A]">
                {player.medals.Gold}
              </span>
              <span className="text-[10px] font-bold text-[#D8A93A] uppercase">
                Gold
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMedal((prev) => (prev === 'Silver' ? null : 'Silver'))}
              className={`rounded-lg border p-2 transition-all cursor-pointer ${
                selectedMedal === 'Silver'
                  ? 'border-slate-300 bg-[#222428] ring-2 ring-slate-300 shadow-sm'
                  : 'border-[#332C25] bg-[#241F1B] hover:border-[#B9B2A8]/60'
              }`}
            >
              <span className="block font-black text-base text-[#B9B2A8]">
                {player.medals.Silver}
              </span>
              <span className="text-[10px] font-bold text-[#B9B2A8] uppercase">
                Silver
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMedal((prev) => (prev === 'Coklat' ? null : 'Coklat'))}
              className={`rounded-lg border p-2 transition-all cursor-pointer ${
                selectedMedal === 'Coklat'
                  ? 'border-amber-700 bg-[#2A1710] ring-2 ring-amber-700 shadow-sm'
                  : 'border-[#332C25] bg-[#241F1B] hover:border-[#6B4226]/60'
              }`}
            >
              <span className="block font-black text-base text-[#b8764a]">
                {player.medals.Coklat}
              </span>
              <span className="text-[10px] font-bold text-[#b8764a] uppercase">
                Coklat
              </span>
            </button>
          </div>
        </div>

        {/* Selected Medal Hero Breakdown List */}
        {selectedMedal && (
          <div className="my-3 rounded-xl border border-white/15 bg-black/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                <span>{selectedMedal === 'MVP' ? '👑' : selectedMedal === 'Gold' ? '🥇' : selectedMedal === 'Silver' ? '🥈' : '🍫'}</span>
                <span>Hero Peraih Medali {selectedMedal}:</span>
              </span>
              <span className="text-[10px] text-[#9C948A]">
                {medalHeroes.length} hero ditemukan
              </span>
            </div>

            {medalHeroes.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {medalHeroes.map((item) => (
                  <div
                    key={item.hero}
                    className="flex items-center justify-between rounded-lg bg-[#241F1B] p-2 border border-[#332C25]"
                  >
                    <div className="flex items-center gap-2">
                      <HeroAvatar heroName={item.hero} size="xs" shape="rounded" />
                      <div>
                        <span className="font-bold text-xs text-[#F2EDE4] block">
                          {item.hero}
                        </span>
                        <span className="text-[10px] text-[#9C948A]">
                          Dimainkan: {item.totalGames} Match
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block rounded bg-[#E8B33D]/20 border border-[#E8B33D]/40 px-1.5 py-0.5 text-[10px] font-black text-[#E8B33D]">
                        {item.medalCount}x {selectedMedal}
                      </span>
                      <span className="block text-[9px] text-[#9C948A] mt-0.5">
                        WR {item.winRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9C948A] text-center py-2">
                Tidak ada data hero dengan medali {selectedMedal}
              </p>
            )}
          </div>
        )}

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

    {/* Image Preview Modal */}
    {isPreviewOpen && (
      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={getPlayerAvatarUrl(player.name, player.avatar_url)}
        playerName={player.name}
        tier={player.tier}
        status={player.status}
      />
    )}
  </>
  );
};
