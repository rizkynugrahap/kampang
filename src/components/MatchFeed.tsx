import React from 'react';
import { Flame, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { Match } from '../types';

interface MatchFeedProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

export const MatchFeed: React.FC<MatchFeedProps> = ({
  matches,
  onSelectMatch,
}) => {
  return (
    <section id="section-match-feed" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F1B] text-[#C97A3D]">
            <Flame size={16} />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg">
              Riwayat Pertandingan
            </h2>
            <p className="text-xs text-[#9C948A]">
              Daftar match terbaru beserta analisis tajam AI Gemini
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#9C948A]">
          {matches.length} Laga
        </span>
      </div>

      <div className="space-y-2.5">
        {matches.map((match) => {
          const isPohon = match.winner === 'Tim Pohon';
          const borderColor = isPohon ? '#4F7942' : '#C97A3D';
          const allPlayers = [...match.pohon, ...match.lobby];
          const mvpPlayer = allPlayers.find((p) => p.medal === 'MVP');
          const coklatPlayer = allPlayers.find((p) => p.medal === 'Coklat');

          return (
            <button
              key={match.id}
              id={`match-feed-item-${match.id}`}
              onClick={() => onSelectMatch(match)}
              className="group block w-full rounded-xl border border-[#332C25] bg-[#1D1916] p-4 text-left transition-all hover:border-[#443b32] hover:bg-[#241F1B]"
              style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#F2EDE4]">
                    Match #{match.id}
                  </span>
                  <span className="text-xs text-[#9C948A]">· {match.date}</span>
                  <span className="rounded bg-[#241F1B] px-1.5 py-0.5 text-[10px] text-[#9C948A]">
                    {match.type}
                  </span>
                </div>
                <span
                  className="font-bold text-xs"
                  style={{ color: borderColor }}
                >
                  {match.winner} Menang
                </span>
              </div>

              {/* Quick highlights */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#9C948A]">
                {mvpPlayer && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#E8B33D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#E8B33D]">
                    ⭐ MVP: {mvpPlayer.player_name} ({mvpPlayer.hero_name})
                  </span>
                )}
                {coklatPlayer && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#6B4226]/20 px-2 py-0.5 text-[11px] font-medium text-[#b8764a]">
                    🍫 Coklat: {coklatPlayer.player_name} ({coklatPlayer.hero_name})
                  </span>
                )}
              </div>

              {/* Prompt to open AI analysis */}
              <div className="mt-2 flex items-center justify-between border-t border-[#332C25]/50 pt-2 text-[11px] text-[#9C948A]">
                <span className="flex items-center gap-1 text-[#9C948A] group-hover:text-[#E8B33D]">
                  <Sparkles size={12} className="text-[#E8B33D]" />
                  {match.ai_analysis
                    ? 'Analisis AI tersedia · Ketuk untuk membaca ulasan'
                    : 'Ketuk untuk melihat rincian & analisis'}
                </span>
                <ChevronRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1 group-hover:text-[#F2EDE4]"
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
