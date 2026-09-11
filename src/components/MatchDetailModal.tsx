import React, { useState } from 'react';
import { X, Sparkles, Trophy, Calendar, RefreshCw, Bot } from 'lucide-react';
import { Match, Medal } from '../types';
import { HeroAvatar } from './HeroAvatar';
import { PlayerAvatar } from './PlayerAvatar';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
  onReanalyze?: (matchId: number) => Promise<void>;
}

const MEDAL_BADGES: Record<Medal, { bg: string; text: string; label: string }> = {
  MVP: { bg: 'bg-[#E8B33D]', text: 'text-[#161311]', label: 'MVP' },
  Gold: { bg: 'bg-[#D8A93A]', text: 'text-[#161311]', label: 'Gold' },
  Silver: { bg: 'bg-[#B9B2A8]', text: 'text-[#161311]', label: 'Silver' },
  Coklat: { bg: 'bg-[#6B4226]', text: 'text-[#F2EDE4]', label: 'Coklat' },
};

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  onClose,
  onReanalyze,
}) => {
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  if (!match) return null;

  const isPohonWinner = match.winner === 'Tim Pohon';

  const handleReanalyze = async () => {
    if (!onReanalyze) return;
    setIsReanalyzing(true);
    try {
      await onReanalyze(match.id);
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div
      id="match-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        id="match-detail-modal-card"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#332C25] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#241F1B] px-2 py-0.5 font-bold text-xs text-[#E8B33D]">
                Match #{match.id}
              </span>
              <span className="text-xs text-[#9C948A]">{match.type}</span>
              <span className="text-xs text-[#9C948A]">· {match.season}</span>
            </div>
            <h3 className="mt-1 flex items-center gap-2 font-bold text-lg text-[#F2EDE4]">
              <span>Pemenang:</span>
              <span
                className={
                  isPohonWinner ? 'text-[#4F7942]' : 'text-[#C97A3D]'
                }
              >
                {match.winner}
              </span>
            </h3>
            <p className="flex items-center gap-1 text-xs text-[#9C948A]">
              <Calendar size={12} /> {match.date}
            </p>
          </div>
          <button
            id="close-match-detail-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4]"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rosters comparison */}
        <div className="my-4 space-y-4">
          {/* Tim Pohon */}
          <div
            className={`rounded-xl border p-3.5 ${
              isPohonWinner
                ? 'border-[#4F7942]/60 bg-[#4F7942]/10'
                : 'border-[#332C25] bg-[#241F1B]/60'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-xs text-[#4F7942] uppercase tracking-wider">
                Tim Pohon {isPohonWinner && '👑 Menang'}
              </span>
              <span className="text-[11px] text-[#9C948A]">
                {match.pohon.length} Pemain
              </span>
            </div>
            <div className="space-y-2">
              {match.pohon.map((p, idx) => {
                const badge = MEDAL_BADGES[p.medal] || MEDAL_BADGES.Silver;
                return (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between rounded-lg bg-[#191513]/80 px-3 py-2 text-xs border border-[#2A231D]"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={p.player_name} size="sm" team="Pohon" />
                      <div>
                        <span className="font-semibold text-[#F2EDE4] block">
                          {p.player_name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <HeroAvatar heroName={p.hero_name} size="xs" shape="circle" />
                          <span className="text-[11px] text-[#9C948A]">{p.hero_name}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 font-bold text-[10px] tracking-wide uppercase ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tim Lobby */}
          <div
            className={`rounded-xl border p-3.5 ${
              !isPohonWinner
                ? 'border-[#C97A3D]/60 bg-[#C97A3D]/10'
                : 'border-[#332C25] bg-[#241F1B]/60'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-xs text-[#C97A3D] uppercase tracking-wider">
                Tim Lobby {!isPohonWinner && '👑 Menang'}
              </span>
              <span className="text-[11px] text-[#9C948A]">
                {match.lobby.length} Pemain
              </span>
            </div>
            <div className="space-y-2">
              {match.lobby.map((p, idx) => {
                const badge = MEDAL_BADGES[p.medal] || MEDAL_BADGES.Silver;
                return (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between rounded-lg bg-[#191513]/80 px-3 py-2 text-xs border border-[#2A231D]"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={p.player_name} size="sm" team="Lobby" />
                      <div>
                        <span className="font-semibold text-[#F2EDE4] block">
                          {p.player_name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <HeroAvatar heroName={p.hero_name} size="xs" shape="circle" />
                          <span className="text-[11px] text-[#9C948A]">{p.hero_name}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 font-bold text-[10px] tracking-wide uppercase ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Analysis section */}
        <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E8B33D]/20 text-[#E8B33D]">
                <Bot size={14} />
              </div>
              <h4 className="font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                Analisis Pertandingan AI (Gemini)
              </h4>
            </div>
            {onReanalyze && (
              <button
                id="reanalyze-match-btn"
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#9C948A] hover:bg-[#332C25] hover:text-[#F2EDE4] disabled:opacity-50"
                title="Generate ulang analisis"
              >
                <RefreshCw
                  size={12}
                  className={isReanalyzing ? 'animate-spin' : ''}
                />
                <span>{isReanalyzing ? 'Menganalisis...' : 'Analisis Ulang'}</span>
              </button>
            )}
          </div>

          <div className="text-xs leading-relaxed text-[#F2EDE4] whitespace-pre-line">
            {match.ai_analysis ? (
              match.ai_analysis
            ) : match.is_generating_analysis ? (
              <div className="flex items-center gap-2 py-3 text-[#9C948A]">
                <RefreshCw size={14} className="animate-spin text-[#E8B33D]" />
                <span>AI sedang menganalisis jalannya pertandingan...</span>
              </div>
            ) : (
              <span className="italic text-[#9C948A]">
                Belum ada analisis untuk pertandingan ini.
              </span>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-4 flex justify-end">
          <button
            id="close-match-detail-footer-btn"
            onClick={onClose}
            className="rounded-lg border border-[#332C25] bg-[#241F1B] px-5 py-2 font-semibold text-xs text-[#F2EDE4] hover:bg-[#2e2722]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
