import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Sparkles,
  Search,
  Trophy,
  Flame,
  ChevronRight,
  Filter,
  Trash2,
} from 'lucide-react';
import { Match, LagaAmalSeasonData } from '../types';
import { HeroAvatar } from './HeroAvatar';
import { PlayerAvatar } from './PlayerAvatar';
import { ScoreBanner } from './ScoreBanner';
import { generateHeuristicMatchAnalysis } from '../utils/matchAnalysis';
import { getMatchDisplayNumber } from '../utils/matchSequence';
import { sortSeasonsDescending } from '../utils/seasonCalculations';

interface MatchHistoryViewProps {
  seasons: LagaAmalSeasonData[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  activeSeason: LagaAmalSeasonData;
  activeSeasonId?: string;
  onSetActiveSeason?: (seasonId: string) => void;
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onDeleteMatch?: (matchId: number) => void;
  isAdmin?: boolean;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  activeSeason,
  activeSeasonId,
  onSetActiveSeason,
  matches,
  onSelectMatch,
  onDeleteMatch,
  isAdmin = false,
}) => {
  const [winnerFilter, setWinnerFilter] = useState<'all' | 'Tim Pohon' | 'Tim Lobby'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Seasons sorted descending (highest season first)
  const sortedSeasons = useMemo(() => sortSeasonsDescending(seasons), [seasons]);

  // Filter matches belonging to the active season
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Winner filter
      if (winnerFilter !== 'all' && m.winner !== winnerFilter) {
        return false;
      }

      // Search query (player name or hero name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const allPlayers = [...m.pohon, ...m.lobby];
        const matchFound = allPlayers.some(
          (p) => p.player_name.toLowerCase().includes(q) || p.hero_name.toLowerCase().includes(q)
        );
        const matchIdFound = m.id.toString().includes(q);
        if (!matchFound && !matchIdFound) return false;
      }

      return true;
    });
  }, [matches, winnerFilter, searchQuery]);

  return (
    <div id="match-history-view-container" className="space-y-6">
      {/* Header Bar with Season Selector & Filter Controls */}
      <section
        id="match-history-header"
        className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-[#332C25]/60">
          {/* Left: Season dropdown & Active Season indicator/button */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-2.5 py-1.5 text-xs font-bold text-[#E8B33D]">
              <History size={14} className="text-[#E8B33D] shrink-0" />
              <span className="shrink-0 text-[11px] sm:text-xs">Season:</span>
              <select
                id="history-season-dropdown"
                value={selectedSeasonId}
                onChange={(e) => onSeasonChange(e.target.value)}
                className="bg-transparent font-black text-[#F2EDE4] focus:outline-none cursor-pointer pr-1 text-xs sm:text-sm max-w-[130px] sm:max-w-none truncate"
              >
                {sortedSeasons.map((s) => {
                  const isItemActive = s.id === activeSeasonId || (!activeSeasonId && s.isActive);
                  return (
                    <option key={s.id} value={s.id} className="bg-[#1D1916] text-[#F2EDE4]">
                      {s.title} {isItemActive ? '★ (Active Season)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Active Season Button / Badge */}
            {activeSeason.id === activeSeasonId || (!activeSeasonId && seasons[0]?.id === activeSeason.id) ? (
              <div
                id="history-badge-active-season"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-emerald-300 shadow-sm"
                title="Season ini saat ini berstatus Active Season (Season Utama)"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Active Season</span>
              </div>
            ) : (
              <button
                id="history-btn-set-active-season"
                type="button"
                onClick={() => onSetActiveSeason && onSetActiveSeason(activeSeason.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-amber-300 hover:text-amber-100 transition-all cursor-pointer shadow-sm active:scale-95"
                title={`Klik untuk mengaktifkan ${activeSeason.title} sebagai Active Season`}
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Aktifkan Season</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#9C948A] font-medium shrink-0">
              <Calendar size={13} className="text-[#E8B33D]" />
              <span>{activeSeason.dateStr}</span>
            </div>
          </div>

          {/* Right: Winner Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Winner Filter */}
            <div className="flex items-center gap-1 rounded-xl border border-[#332C25] bg-[#141210] p-1 text-xs">
              <button
                type="button"
                onClick={() => setWinnerFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  winnerFilter === 'all'
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                Semua Hasil
              </button>
              <button
                type="button"
                onClick={() => setWinnerFilter('Tim Pohon')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  winnerFilter === 'Tim Pohon'
                    ? 'bg-[#4F7942] text-white'
                    : 'text-[#9C948A] hover:text-[#4F7942]'
                }`}
              >
                Pohon Win
              </button>
              <button
                type="button"
                onClick={() => setWinnerFilter('Tim Lobby')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  winnerFilter === 'Tim Lobby'
                    ? 'bg-[#C97A3D] text-white'
                    : 'text-[#9C948A] hover:text-[#C97A3D]'
                }`}
              >
                Lobby Win
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C948A]"
              />
              <input
                type="text"
                placeholder="Cari pemain/hero..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-52 rounded-xl border border-[#332C25] bg-[#141210] pl-8 pr-3 py-1.5 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Title and summary counter */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F2EDE4]">
              Riwayat Pertandingan · {activeSeason.title}
            </h1>
            <p className="mt-0.5 text-xs text-[#9C948A]">
              Seluruh rekap pertandingan resmi lengkap dengan analisis tajam AI Gemini sebagai highlight.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#241F1B] border border-[#332C25] px-3 py-1 text-xs font-bold text-[#E8B33D]">
              {filteredMatches.length} Laga Ditampilkan
            </span>
          </div>
        </div>
      </section>

      {/* Pertandingan Kemenangan (ScoreBanner Tim Pohon vs Tim Lobby) — Intact as requested */}
      <section id="section-pertandingan-kemenangan">
        <ScoreBanner matches={matches} seasonTitle={activeSeason.title} />
      </section>

      {/* Match Cards List */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-12 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#241F1B] text-[#9C948A] mb-3">
            <Flame size={24} />
          </div>
          <h3 className="font-bold text-base text-[#F2EDE4]">Tidak Ada Riwayat Pertandingan</h3>
          <p className="mt-1 text-xs text-[#9C948A] max-w-md mx-auto">
            {matches.length === 0
              ? 'Belum ada pertandingan tercatat untuk season ini. Pertandingan yang diinput melalui tab Input Pertandingan akan muncul otomatis di sini.'
              : 'Tidak ada pertandingan yang cocok dengan filter pencarian.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredMatches.map((match, idx) => {
            const isPohon = match.winner === 'Tim Pohon';
            const allPlayers = [...match.pohon, ...match.lobby];
            const mvp = allPlayers.find((p) => p.medal === 'MVP');
            const coklat = allPlayers.find((p) => p.medal === 'Coklat');
            const analysisText = match.ai_analysis || generateHeuristicMatchAnalysis(match);

            return (
              <article
                key={`match-card-${match.id}-${idx}`}
                id={`match-history-card-${match.id}`}
                className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-xl transition-all hover:border-[#4A3F33] relative overflow-hidden space-y-4"
              >
                {/* Top bar of card: Match ID, Date, Winner Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C25]/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg bg-[#251F1B] border border-[#3D352E] px-2.5 py-1 text-xs font-black text-[#F2EDE4]">
                      Match #{getMatchDisplayNumber(match, matches)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#9C948A]">
                      <Calendar size={12} className="text-[#E8B33D]" />
                      {match.date}
                    </span>
                    <span className="rounded bg-[#241F1B] px-2 py-0.5 text-[11px] font-semibold text-[#9C948A]">
                      {match.season || activeSeason.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Winner Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tracking-wide ${
                        isPohon
                          ? 'bg-[#4F7942]/20 text-[#649455] border border-[#4F7942]/50'
                          : 'bg-[#C97A3D]/20 text-[#e08f51] border border-[#C97A3D]/50'
                      }`}
                    >
                      <Trophy size={13} />
                      <span>{match.winner} VICTORY</span>
                    </span>

                    {/* Admin Delete Action */}
                    {isAdmin && onDeleteMatch && (
                      <button
                        type="button"
                        onClick={() => onDeleteMatch(match.id)}
                        className="p-1.5 text-[#9C948A] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Hapus Pertandingan"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* HIGHLIGHT ANALISIS PERTANDINGAN (AI GEMINI) — PROMINENT AS REQUESTED */}
                <div
                  id={`match-analysis-highlight-${match.id}`}
                  className="rounded-xl border-2 border-[#E8B33D]/60 bg-gradient-to-r from-[#2B2014] via-[#241B13] to-[#1D1610] p-4 sm:p-5 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8B33D]/20 text-[#E8B33D]">
                        <Sparkles size={16} className="animate-pulse" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#E8B33D]">
                        Highlight Analisis Pertandingan (AI Gemini)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      {mvp && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[#E8B33D]/15 px-2 py-0.5 text-[#E8B33D] font-bold">
                          👑 MVP: {mvp.player_name}
                        </span>
                      )}
                      {coklat && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[#8B4513]/30 px-2 py-0.5 text-[#D97706] font-bold">
                          🍫 Coklat: {coklat.player_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#F2EDE4] leading-relaxed italic font-medium">
                    "{analysisText}"
                  </p>
                </div>

                {/* Team Rosters: Tim Pohon vs Tim Lobby */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                  {/* Tim Pohon Roster */}
                  <div
                    className={`rounded-xl border p-3.5 ${
                      isPohon
                        ? 'border-[#4F7942]/60 bg-[#172314]/40'
                        : 'border-[#332C25] bg-[#141210]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#4F7942]" />
                        <span className="text-xs font-bold text-[#F2EDE4]">Tim Pohon</span>
                      </div>
                      {isPohon && (
                        <span className="text-[10px] font-black uppercase text-[#649455]">
                          Pemenang
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {match.pohon.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex sm:flex-col items-center gap-2 sm:gap-1 p-2 rounded-lg bg-[#1D1916]/80 border border-[#332C25]/50 text-center"
                        >
                          <div className="relative shrink-0">
                            <HeroAvatar heroName={p.hero_name} size="sm" />
                            {p.medal === 'MVP' && (
                              <span className="absolute -top-1.5 -right-1.5 text-xs">👑</span>
                            )}
                            {p.medal === 'Coklat' && (
                              <span className="absolute -top-1.5 -right-1.5 text-xs">🍫</span>
                            )}
                          </div>
                          <div className="flex-1 sm:w-full overflow-hidden text-left sm:text-center">
                            <div className="truncate text-xs font-bold text-[#F2EDE4]">
                              {p.player_name}
                            </div>
                            <div className="truncate text-[10px] text-[#9C948A]">
                              {p.hero_name}
                            </div>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              p.medal === 'MVP'
                                ? 'bg-[#E8B33D]/20 text-[#E8B33D]'
                                : p.medal === 'Gold'
                                ? 'bg-amber-600/20 text-amber-400'
                                : p.medal === 'Silver'
                                ? 'bg-slate-500/20 text-slate-300'
                                : 'bg-orange-950/40 text-amber-600'
                            }`}
                          >
                            {p.medal} {typeof p.score === 'number' ? `(${p.score})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tim Lobby Roster */}
                  <div
                    className={`rounded-xl border p-3.5 ${
                      !isPohon
                        ? 'border-[#C97A3D]/60 bg-[#281A10]/40'
                        : 'border-[#332C25] bg-[#141210]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#C97A3D]" />
                        <span className="text-xs font-bold text-[#F2EDE4]">Tim Lobby</span>
                      </div>
                      {!isPohon && (
                        <span className="text-[10px] font-black uppercase text-[#e08f51]">
                          Pemenang
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {match.lobby.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex sm:flex-col items-center gap-2 sm:gap-1 p-2 rounded-lg bg-[#1D1916]/80 border border-[#332C25]/50 text-center"
                        >
                          <div className="relative shrink-0">
                            <HeroAvatar heroName={p.hero_name} size="sm" />
                            {p.medal === 'MVP' && (
                              <span className="absolute -top-1.5 -right-1.5 text-xs">👑</span>
                            )}
                            {p.medal === 'Coklat' && (
                              <span className="absolute -top-1.5 -right-1.5 text-xs">🍫</span>
                            )}
                          </div>
                          <div className="flex-1 sm:w-full overflow-hidden text-left sm:text-center">
                            <div className="truncate text-xs font-bold text-[#F2EDE4]">
                              {p.player_name}
                            </div>
                            <div className="truncate text-[10px] text-[#9C948A]">
                              {p.hero_name}
                            </div>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              p.medal === 'MVP'
                                ? 'bg-[#E8B33D]/20 text-[#E8B33D]'
                                : p.medal === 'Gold'
                                ? 'bg-amber-600/20 text-amber-400'
                                : p.medal === 'Silver'
                                ? 'bg-slate-500/20 text-slate-300'
                                : 'bg-orange-950/40 text-amber-600'
                            }`}
                          >
                            {p.medal} {typeof p.score === 'number' ? `(${p.score})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectMatch(match)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#E8B33D] hover:underline cursor-pointer"
                  >
                    <span>Lihat Detail Lengkap Pertandingan</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
