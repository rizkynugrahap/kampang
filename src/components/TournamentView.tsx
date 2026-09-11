import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Shield,
  Award,
  Calendar,
  Sparkles,
  Flame,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Crown,
  Users,
  CheckCircle2,
  Clock,
  Swords,
  PlusCircle,
  Sliders,
  Edit3,
} from 'lucide-react';
import { Match, Player, TournamentData } from '../types';
import { INITIAL_TOURNAMENTS } from '../data/tournamentSeed';
import {
  calculateTournamentPlayerStandings,
  getTournamentSummaryStats,
} from '../utils/tournamentStats';
import { TournamentInputModal } from './TournamentInputModal';

interface TournamentViewProps {
  matches: Match[];
  players: Player[];
  onSelectMatch?: (match: Match) => void;
  onSelectPlayer?: (player: Player) => void;
  tournaments?: TournamentData[];
  onTournamentsReload?: () => void;
}

type TournamentSubTab = 'klasemen' | 'pemain' | 'jadwal' | 'analisis';

export const TournamentView: React.FC<TournamentViewProps> = ({
  matches,
  players,
  onSelectMatch,
  onSelectPlayer,
  tournaments: externalTournaments,
  onTournamentsReload,
}) => {
  const [tournaments, setTournaments] = useState<TournamentData[]>(
    externalTournaments || INITIAL_TOURNAMENTS
  );
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    (externalTournaments && externalTournaments[0]?.id) || INITIAL_TOURNAMENTS[0].id
  );
  const [subTab, setSubTab] = useState<TournamentSubTab>('klasemen');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Tournament input modal state
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'fixture' | 'create' | 'standings' | 'team'>('fixture');

  const loadTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTournaments(data);
        }
      }
    } catch (err) {
      console.warn('Using cached tournament data:', err);
    }
  };

  useEffect(() => {
    if (externalTournaments && externalTournaments.length > 0) {
      setTournaments(externalTournaments);
    } else {
      loadTournaments();
    }
  }, [externalTournaments]);

  const handleTournamentUpdated = () => {
    loadTournaments();
    if (onTournamentsReload) {
      onTournamentsReload();
    }
  };

  const currentTournament =
    tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0];

  const playerStandings = calculateTournamentPlayerStandings(players, matches);
  const summaryStats = getTournamentSummaryStats(currentTournament);

  // Request fresh AI tournament recap from Gemini
  const handleGenerateAiRecap = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/tournaments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentName: currentTournament.name,
          standings: currentTournament.standings,
          topPlayers: playerStandings,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === currentTournament.id
              ? { ...t, ai_recap: data.analysis }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Error generating tournament recap:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div id="tournament-container" className="space-y-6">
      {/* Tournament Selection & Header Banner */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#332C25] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8B33D]/30 bg-[#241F1B] text-[#E8B33D]">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-[#F2EDE4] sm:text-xl tracking-tight">
                  Turnamen Klasemen Pantos
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    currentTournament.status === 'Sedang Berjalan'
                      ? 'border border-[#4F7942]/60 bg-[#4F7942]/20 text-emerald-300'
                      : 'border border-[#332C25] bg-[#241F1B] text-[#9C948A]'
                  }`}
                >
                  {currentTournament.status}
                </span>
              </div>
              <p className="text-xs text-[#9C948A]">
                {currentTournament.format}
              </p>
            </div>
          </div>

          {/* Tournament Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#9C948A] font-medium hidden sm:inline">
                Pilih:
              </label>
              <select
                id="select-tournament-edition"
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 font-semibold text-xs text-[#F2EDE4] focus:outline-hidden"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-open-modal-input-laga"
              type="button"
              onClick={() => {
                setModalMode('fixture');
                setIsInputModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#E8B33D] px-3 py-1.5 font-bold text-xs text-[#161311] hover:bg-[#e0a82b] transition-colors shadow-xs"
            >
              <PlusCircle size={14} />
              <span>Input Skor Laga</span>
            </button>

            <button
              id="btn-open-modal-add-team-header"
              type="button"
              onClick={() => {
                setModalMode('team');
                setIsInputModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-1.5 font-semibold text-xs text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors"
            >
              <Shield size={14} />
              <span>+ Tim Baru</span>
            </button>

            <button
              id="btn-open-modal-create-tourney"
              type="button"
              onClick={() => {
                setModalMode('create');
                setIsInputModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 font-semibold text-xs text-[#F2EDE4] hover:bg-[#2d2621] transition-colors"
            >
              <Trophy size={14} className="text-[#E8B33D]" />
              <span className="hidden sm:inline">+ Turnamen Baru</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3">
            <span className="block text-[10px] font-bold text-[#9C948A] uppercase tracking-wider">
              Pemimpin Klasemen
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: summaryStats.topTeam?.color || '#4F7942' }}
              />
              <span className="font-bold text-sm text-[#F2EDE4] truncate">
                {summaryStats.topTeam?.name.split(' ')[0]} {summaryStats.topTeam?.name.split(' ')[1]}
              </span>
            </div>
            <span className="text-[11px] text-[#E8B33D] font-medium">
              {summaryStats.topTeam?.points} Poin ({summaryStats.topTeam?.won}W - {summaryStats.topTeam?.lost}L)
            </span>
          </div>

          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3">
            <span className="block text-[10px] font-bold text-[#9C948A] uppercase tracking-wider">
              Top MVP Turnamen
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <Crown size={14} className="text-[#E8B33D]" />
              <span className="font-bold text-sm text-[#F2EDE4] truncate">
                {playerStandings[0]?.playerName || '-'}
              </span>
            </div>
            <span className="text-[11px] text-[#9C948A]">
              {playerStandings[0]?.mvp}x MVP ({playerStandings[0]?.points} Poin)
            </span>
          </div>

          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3">
            <span className="block text-[10px] font-bold text-[#9C948A] uppercase tracking-wider">
              Progres Laga
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-[#4F7942]" />
              <span className="font-bold text-sm text-[#F2EDE4]">
                {summaryStats.completedMatches} / {summaryStats.totalMatches} Selesai
              </span>
            </div>
            <span className="text-[11px] text-[#9C948A]">
              {summaryStats.totalMatches - summaryStats.completedMatches} Laga Mendatang
            </span>
          </div>

          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3">
            <span className="block text-[10px] font-bold text-[#9C948A] uppercase tracking-wider">
              Hadiah & Gengsi
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <Award size={14} className="text-[#E8B33D]" />
              <span className="font-bold text-xs text-[#F2EDE4] truncate">
                {currentTournament.prizePool}
              </span>
            </div>
            <span className="text-[10px] text-[#9C948A]">
              Bebas Hukuman Semen
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tabs inside Turnamen */}
      <div className="flex border-b border-[#332C25] gap-2">
        <button
          id="tab-klasemen-tim"
          onClick={() => setSubTab('klasemen')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition-colors ${
            subTab === 'klasemen'
              ? 'border-[#E8B33D] text-[#E8B33D]'
              : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
          }`}
        >
          <Trophy size={14} />
          <span>Klasemen Tim</span>
        </button>

        <button
          id="tab-klasemen-pemain"
          onClick={() => setSubTab('pemain')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition-colors ${
            subTab === 'pemain'
              ? 'border-[#E8B33D] text-[#E8B33D]'
              : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
          }`}
        >
          <Crown size={14} />
          <span>Peringkat Pemain (MVP Race)</span>
        </button>

        <button
          id="tab-jadwal-hasil"
          onClick={() => setSubTab('jadwal')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition-colors ${
            subTab === 'jadwal'
              ? 'border-[#E8B33D] text-[#E8B33D]'
              : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
          }`}
        >
          <Calendar size={14} />
          <span>Jadwal & Hasil Laga ({currentTournament.fixtures.length})</span>
        </button>

        <button
          id="tab-analisis-turnamen"
          onClick={() => setSubTab('analisis')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition-colors ${
            subTab === 'analisis'
              ? 'border-[#E8B33D] text-[#E8B33D]'
              : 'border-transparent text-[#9C948A] hover:text-[#F2EDE4]'
          }`}
        >
          <Sparkles size={14} />
          <span>Tinjauan AI Gemini</span>
        </button>
      </div>

      {/* SUB-TAB 1: KLASEMEN TIM TURNAMEN */}
      {subTab === 'klasemen' && (
        <div id="subtab-klasemen-content" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#F2EDE4] sm:text-base">
                Tabel Klasemen Tim - {currentTournament.name}
              </h3>
              <p className="text-xs text-[#9C948A]">
                Sistem Poin: Menang = +3 Poin, Kalah = 0 Poin · Tie-breaker: Game Diff & Total MVP
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-open-modal-add-team-standings"
                type="button"
                onClick={() => {
                  setModalMode('team');
                  setIsInputModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-2.5 py-1 text-xs font-semibold text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors"
              >
                <Shield size={12} />
                <span>+ Daftarkan Tim</span>
              </button>
              <button
                id="btn-open-modal-standings"
                type="button"
                onClick={() => {
                  setModalMode('standings');
                  setIsInputModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2d2621] transition-colors"
              >
                <Sliders size={12} className="text-[#E8B33D]" />
                <span>Koreksi Klasemen</span>
              </button>
              <span className="rounded bg-[#241F1B] px-2.5 py-1 text-xs font-semibold text-[#E8B33D]">
                Format: Liga Round-Robin
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#332C25] bg-[#241F1B] text-[11px] font-bold text-[#9C948A] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-4 pr-2 text-center w-12">#</th>
                  <th className="py-3.5 px-3">Tim Peserta</th>
                  <th className="py-3.5 px-2 text-center">MP</th>
                  <th className="py-3.5 px-2 text-center text-emerald-400">W</th>
                  <th className="py-3.5 px-2 text-center text-red-400">L</th>
                  <th className="py-3.5 px-2 text-center">Game W-L</th>
                  <th className="py-3.5 px-2 text-center">WR %</th>
                  <th className="py-3.5 px-3 text-center hidden md:table-cell">Medali (MVP/Coklat)</th>
                  <th className="py-3.5 px-3 text-center">Form (5 Terakhir)</th>
                  <th className="py-3.5 px-3 text-center text-[#E8B33D]">Poin</th>
                  <th className="py-3.5 pr-4 pl-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#332C25]/60">
                {currentTournament.standings.map((team, index) => {
                  const winRate =
                    team.played > 0 ? Math.round((team.won / team.played) * 100) : 0;
                  const gameDiff = team.gameWins - team.gameLosses;
                  const isLeader = index === 0;
                  const isPlayoffs = index < 2;

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-[#241F1B]/70 transition-colors"
                      style={{
                        borderLeft: `3px solid ${team.color}`,
                      }}
                    >
                      {/* Rank */}
                      <td className="py-3.5 pl-4 pr-2 text-center font-black">
                        {index === 0 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8B33D] font-black text-xs text-[#161311]">
                            1
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#B9B2A8] font-black text-xs text-[#161311]">
                            2
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C97A3D] font-black text-xs text-[#161311]">
                            3
                          </span>
                        ) : (
                          <span className="text-[#9C948A]">{index + 1}</span>
                        )}
                      </td>

                      {/* Team Name */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: team.color }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#F2EDE4]">
                                {team.name}
                              </span>
                              <span className="rounded bg-[#241F1B] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#E8B33D] border border-[#332C25]">
                                {team.shortName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#9C948A]">
                              <span>
                                Streak: <span className="font-semibold text-[#F2EDE4]">{team.streak}</span>
                              </span>
                              {team.members && team.members.length > 0 && (
                                <span className="hidden sm:inline text-[#B9B2A8]">
                                  · {team.members.length} Pemain ({team.members.slice(0, 3).join(', ')}{team.members.length > 3 ? '...' : ''})
                                </span>
                              )}
                              {team.slogan && (
                                <span className="hidden md:inline italic text-[#9C948A]/80">
                                  "{team.slogan}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* MP */}
                      <td className="py-3.5 px-2 text-center font-medium text-[#F2EDE4]">
                        {team.played}
                      </td>

                      {/* W */}
                      <td className="py-3.5 px-2 text-center font-bold text-emerald-400">
                        {team.won}
                      </td>

                      {/* L */}
                      <td className="py-3.5 px-2 text-center font-medium text-red-400">
                        {team.lost}
                      </td>

                      {/* Game W-L */}
                      <td className="py-3.5 px-2 text-center text-[#9C948A]">
                        {team.gameWins}-{team.gameLosses}{' '}
                        <span
                          className={`text-[10px] font-bold ${
                            gameDiff > 0
                              ? 'text-emerald-400'
                              : gameDiff < 0
                              ? 'text-red-400'
                              : 'text-[#9C948A]'
                          }`}
                        >
                          ({gameDiff > 0 ? `+${gameDiff}` : gameDiff})
                        </span>
                      </td>

                      {/* WR */}
                      <td className="py-3.5 px-2 text-center font-semibold text-[#F2EDE4]">
                        {winRate}%
                      </td>

                      {/* Medals */}
                      <td className="py-3.5 px-3 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-0.5 text-[#E8B33D] font-bold">
                            ⭐ {team.mvpCount}
                          </span>
                          <span className="text-[#332C25]">|</span>
                          <span className="inline-flex items-center gap-0.5 text-[#b8764a] font-medium">
                            🍫 {team.coklatCount}
                          </span>
                        </div>
                      </td>

                      {/* Form */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {team.form.slice(-5).map((f, i) => (
                            <span
                              key={i}
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                                f === 'W'
                                  ? 'bg-[#4F7942] text-white'
                                  : 'bg-[#6B4226] text-amber-200'
                              }`}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-3 text-center font-black text-base text-[#E8B33D]">
                        {team.points}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 pr-4 pl-2 text-right">
                        {isLeader ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#E8B33D]/40 bg-[#E8B33D]/15 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D]">
                            👑 Pemuncak
                          </span>
                        ) : isPlayoffs ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#4F7942]/40 bg-[#4F7942]/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            ✓ Lolos Final
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#332C25] bg-[#241F1B] px-2 py-0.5 text-[10px] font-medium text-[#9C948A]">
                            Playoffs
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#6B4226]/40 bg-[#6B4226]/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            Zona Semen
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual point race progress */}
          <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4">
            <h4 className="font-bold text-xs text-[#9C948A] uppercase tracking-wider mb-3">
              Perbandingan Poin Klasemen Tim
            </h4>
            <div className="space-y-3">
              {currentTournament.standings.map((t) => {
                const maxPoints = Math.max(
                  ...currentTournament.standings.map((x) => x.points),
                  1
                );
                const pct = Math.round((t.points / maxPoints) * 100);
                return (
                  <div key={t.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F2EDE4]">{t.name}</span>
                      <span className="font-bold text-[#E8B33D]">{t.points} Poin</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#241F1B]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(12, pct)}%`,
                          backgroundColor: t.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: KLASEMEN PEMAIN & MVP RACE */}
      {subTab === 'pemain' && (
        <div id="subtab-pemain-content" className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#F2EDE4] sm:text-base">
                Peringkat Individu & MVP Race Turnamen
              </h3>
              <p className="text-xs text-[#9C948A]">
                Poin Individu: MVP = 3 Poin, Gold = 2 Poin, Silver = 1 Poin, Coklat = 0 Poin
              </p>
            </div>
            <span className="text-xs text-[#9C948A]">
              {playerStandings.length} Pemain Aktif
            </span>
          </div>

          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {playerStandings.slice(0, 3).map((p, idx) => {
              const borderColors = ['#E8B33D', '#B9B2A8', '#C97A3D'];
              const medalsLabels = ['Juara 1 (Kandidat MVP)', 'Juara 2', 'Juara 3'];
              return (
                <div
                  key={p.playerName}
                  className="relative rounded-2xl border bg-[#1D1916] p-4 text-center shadow-md transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: borderColors[idx] }}
                >
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-black text-[#161311]"
                    style={{ backgroundColor: borderColors[idx] }}
                  >
                    #{idx + 1}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-black text-lg text-[#F2EDE4]">
                      {p.playerName}
                    </h4>
                    <span className="text-[11px] text-[#9C948A]">
                      Tim {p.team} · {p.tier}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="rounded-lg bg-[#241F1B] px-2.5 py-1 text-xs font-black text-[#E8B33D]">
                      ⭐ {p.mvp}x MVP
                    </span>
                    <span className="rounded-lg bg-[#241F1B] px-2.5 py-1 text-xs font-bold text-[#F2EDE4]">
                      {p.points} Poin
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-[#9C948A] font-medium">
                    {medalsLabels[idx]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Player Standings Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#332C25] bg-[#241F1B] text-[11px] font-bold text-[#9C948A] uppercase tracking-wider">
                <tr>
                  <th className="py-3 pl-4 pr-2 text-center w-12">Rank</th>
                  <th className="py-3 px-3">Nama Pemain</th>
                  <th className="py-3 px-2 text-center">Tim</th>
                  <th className="py-3 px-2 text-center">Match</th>
                  <th className="py-3 px-2 text-center text-[#E8B33D]">MVP</th>
                  <th className="py-3 px-2 text-center text-[#D8A93A]">Gold</th>
                  <th className="py-3 px-2 text-center text-[#B9B2A8]">Silver</th>
                  <th className="py-3 px-2 text-center text-[#b8764a]">Coklat</th>
                  <th className="py-3 px-3 text-center text-[#E8B33D]">Poin Performa</th>
                  <th className="py-3 pr-4 pl-2 text-right">Penghargaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#332C25]/60">
                {playerStandings.map((p, idx) => {
                  const isTopMvp = idx === 0;
                  const isRajaCoklat =
                    p.coklat === Math.max(...playerStandings.map((x) => x.coklat)) &&
                    p.coklat > 3;

                  return (
                    <tr
                      key={p.playerName}
                      className="hover:bg-[#241F1B]/70 transition-colors"
                    >
                      <td className="py-3 pl-4 pr-2 text-center font-bold text-[#9C948A]">
                        #{idx + 1}
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            const found = players.find((x) => x.name === p.playerName);
                            if (found && onSelectPlayer) onSelectPlayer(found);
                          }}
                          className="font-bold text-sm text-[#F2EDE4] hover:text-[#E8B33D] text-left transition-colors"
                        >
                          {p.playerName}
                          <span className="ml-2 text-[10px] font-normal text-[#9C948A]">
                            ({p.tier})
                          </span>
                        </button>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.team === 'Pohon'
                              ? 'bg-[#4F7942]/20 text-[#4F7942]'
                              : 'bg-[#C97A3D]/20 text-[#C97A3D]'
                          }`}
                        >
                          {p.team}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center font-medium text-[#F2EDE4]">
                        {p.played}
                      </td>

                      <td className="py-3 px-2 text-center font-black text-[#E8B33D]">
                        {p.mvp}
                      </td>

                      <td className="py-3 px-2 text-center font-semibold text-[#D8A93A]">
                        {p.gold}
                      </td>

                      <td className="py-3 px-2 text-center font-medium text-[#B9B2A8]">
                        {p.silver}
                      </td>

                      <td className="py-3 px-2 text-center font-bold text-[#b8764a]">
                        {p.coklat}
                      </td>

                      <td className="py-3 px-3 text-center font-black text-sm text-[#E8B33D]">
                        {p.points}
                      </td>

                      <td className="py-3 pr-4 pl-2 text-right">
                        {isTopMvp ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#E8B33D]/15 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D]">
                            👑 Calon MVP Final
                          </span>
                        ) : isRajaCoklat ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#6B4226]/25 px-2 py-0.5 text-[10px] font-medium text-[#b8764a]">
                            🍫 Langganan Semen
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#9C948A]">
                            Kontributor
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: JADWAL & HASIL PERTANDINGAN (FIXTURES) */}
      {subTab === 'jadwal' && (
        <div id="subtab-jadwal-content" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#F2EDE4] sm:text-base">
                Jadwal & Hasil Pertandingan Turnamen
              </h3>
              <p className="text-xs text-[#9C948A]">
                Riwayat matchday reguler hingga babak Playoff BO3 dan Grand Final BO5
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-add-fixture-from-schedule"
                type="button"
                onClick={() => {
                  setModalMode('fixture');
                  setIsInputModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[#E8B33D] px-3 py-1 font-bold text-xs text-[#161311] hover:bg-[#e0a82b] transition-colors"
              >
                <PlusCircle size={13} />
                <span>+ Catat Hasil Laga</span>
              </button>
              <span className="rounded bg-[#241F1B] px-2.5 py-1 text-xs text-[#9C948A]">
                {currentTournament.fixtures.length} Total Pertandingan
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {currentTournament.fixtures.map((fix) => {
              const isFinished = fix.status === 'Selesai';
              const isTeamAWinner = isFinished && fix.winner === fix.teamA;
              const isTeamBWinner = isFinished && fix.winner === fix.teamB;

              return (
                <div
                  key={fix.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isFinished
                      ? 'border-[#332C25] bg-[#1D1916]'
                      : 'border-[#4F7942]/40 bg-[#1D1916]/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#9C948A] border-b border-[#332C25]/60 pb-2">
                    <span className="font-semibold text-[#E8B33D]">
                      {fix.round}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isFinished ? (
                        <span className="flex items-center gap-1 text-[#4F7942] font-semibold">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#E8B33D] font-semibold">
                          <Clock size={12} /> Mendatang
                        </span>
                      )}
                      <span>· {fix.date}</span>
                    </div>
                  </div>

                  {/* Matchup scores */}
                  <div className="mt-3 space-y-2">
                    {/* Team A */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            fix.teamA.includes('Pohon')
                              ? 'bg-[#4F7942]'
                              : fix.teamA.includes('Lobby')
                              ? 'bg-[#C97A3D]'
                              : 'bg-[#E8B33D]'
                          }`}
                        />
                        <span
                          className={`font-bold text-sm ${
                            isTeamAWinner
                              ? 'text-[#F2EDE4]'
                              : isFinished
                              ? 'text-[#9C948A]'
                              : 'text-[#F2EDE4]'
                          }`}
                        >
                          {fix.teamA}
                        </span>
                        {isTeamAWinner && (
                          <span className="rounded bg-[#4F7942]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#4F7942]">
                            MENANG
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-black text-base ${
                          isTeamAWinner ? 'text-[#E8B33D]' : 'text-[#9C948A]'
                        }`}
                      >
                        {isFinished ? fix.scoreA : '-'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            fix.teamB.includes('Pohon')
                              ? 'bg-[#4F7942]'
                              : fix.teamB.includes('Lobby')
                              ? 'bg-[#C97A3D]'
                              : 'bg-[#8A7A6E]'
                          }`}
                        />
                        <span
                          className={`font-bold text-sm ${
                            isTeamBWinner
                              ? 'text-[#F2EDE4]'
                              : isFinished
                              ? 'text-[#9C948A]'
                              : 'text-[#F2EDE4]'
                          }`}
                        >
                          {fix.teamB}
                        </span>
                        {isTeamBWinner && (
                          <span className="rounded bg-[#4F7942]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#4F7942]">
                            MENANG
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-black text-base ${
                          isTeamBWinner ? 'text-[#E8B33D]' : 'text-[#9C948A]'
                        }`}
                      >
                        {isFinished ? fix.scoreB : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-3 pt-2.5 border-t border-[#332C25]/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setModalMode('fixture');
                        setIsInputModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#9C948A] hover:text-[#E8B33D] transition-colors"
                    >
                      <Edit3 size={11} />
                      <span>{isFinished ? 'Edit Skor' : 'Catat Skor'}</span>
                    </button>

                    {fix.matchId && onSelectMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = matches.find((x) => x.id === fix.matchId);
                          if (m) onSelectMatch(m);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#E8B33D] hover:underline"
                      >
                        <span>Roster & Analisis</span>
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: TINJAUAN AI GEMINI UNTUK KLASEMEN TURNAMEN */}
      {subTab === 'analisis' && (
        <div id="subtab-analisis-content" className="space-y-4">
          <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C25] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#F2EDE4]">
                    Ulasan Analis AI Gemini · Klasemen Turnamen
                  </h3>
                  <p className="text-xs text-[#9C948A]">
                    Evaluasi dinamika perolehan poin tim, performa kunci, dan proyeksi juara
                  </p>
                </div>
              </div>

              <button
                id="btn-refresh-tournament-ai"
                type="button"
                onClick={handleGenerateAiRecap}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-xs font-bold text-[#E8B33D] hover:bg-[#2e2722] disabled:opacity-50"
              >
                <RefreshCw size={13} className={isGeneratingAi ? 'animate-spin' : ''} />
                <span>{isGeneratingAi ? 'Menganalisis Klasemen...' : 'Update Analisis AI'}</span>
              </button>
            </div>

            {/* AI Analysis Text Block */}
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#D8D0C5]">
              {currentTournament.ai_recap ? (
                currentTournament.ai_recap
                  .split('\n\n')
                  .map((paragraph, i) => (
                    <p key={i} className="rounded-lg bg-[#241F1B]/60 p-3.5 border border-[#332C25]/40">
                      {paragraph}
                    </p>
                  ))
              ) : (
                <div className="py-6 text-center text-[#9C948A]">
                  Belum ada analisis turnamen. Klik tombol di atas untuk membuat analisis baru dengan model Gemini.
                </div>
              )}
            </div>

            {/* AI Notes Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-[#332C25]/60 pt-3 text-[11px] text-[#9C948A]">
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-[#4F7942]" />
                Didukung model Gemini 3.8 Flash · Perspektif Analis E-sport Pantos
              </span>
              <span>Klasemen per Matchday 3</span>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Input Modal */}
      <TournamentInputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        tournaments={tournaments}
        players={players}
        selectedTournamentId={selectedTournamentId}
        onTournamentUpdated={handleTournamentUpdated}
        initialMode={modalMode}
      />
    </div>
  );
};
