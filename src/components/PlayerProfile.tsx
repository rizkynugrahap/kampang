import React, { useState, useEffect } from 'react';
import {
  UserRound,
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Trophy,
  Award,
  Shield,
  Zap,
  ChevronRight,
  Camera,
  Calendar,
  Settings2,
  ChevronDown,
  Check,
  ZoomIn,
  Search,
  Filter,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { Player, Match, LagaAmalSeasonData, MLBB_TIER_OPTIONS } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { getPlayerTopHeroes, getPlayerPerformanceTrend } from '../utils/stats';
import { UpdateAvatarModal } from './UpdateAvatarModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { getPlayerAvatarUrl } from '../constants/playerAvatars';
import { usePlayerAuth } from '../contexts/PlayerAuthContext';

interface PlayerProfileProps {
  players: Player[];
  selectedPlayerId?: number | string;
  onSelectPlayer?: (id: number | string) => void;
  activeSeason?: LagaAmalSeasonData;
  seasons?: LagaAmalSeasonData[];
  selectedSeasonId?: string;
  onSelectSeason?: (seasonId: string) => void;
  matches?: Match[];
  isAdmin?: boolean;
  onUpdatePlayerAvatar?: (playerId: number | string, newAvatarUrl: string) => Promise<boolean> | boolean;
  onUpdatePlayerDetails?: (playerId: number | string, updates: Partial<Player>) => Promise<boolean> | boolean;
  onGenerateJulukan?: (playerId: number | string) => Promise<string | null>;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  activeSeason,
  seasons = [],
  selectedSeasonId,
  onSelectSeason,
  matches = [],
  isAdmin = false,
  onUpdatePlayerAvatar,
  onUpdatePlayerDetails,
  onGenerateJulukan,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<number | string>(
    selectedPlayerId || (players[0] ? players[0].id : 1)
  );
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState<boolean>(false);
  const [isEditBadgesOpen, setIsEditBadgesOpen] = useState<boolean>(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Selector filters
  const [selectorFilterTab, setSelectorFilterTab] = useState<'all' | 'cabutan'>('all');
  const [selectorSearch, setSelectorSearch] = useState<string>('');

  const activeId = selectedPlayerId !== undefined ? selectedPlayerId : internalSelectedId;

  // 1. Filter eligible players for the selected season:
  // ATURAN: Jika ada pemain cabutan dan pemain cabutan itu TIDAK bermain di season tersebut (0 match),
  // maka pemain cabutan tersebut TIDAK AKAN dimunculkan di data season yang dipilih.
  // Pemain cabutan HANYA akan muncul jika sudah ada kontribusi bermain minimal 1 match pada season tersebut.
  // Pemain tetap/aktif tetap disimpan di roster.
  const visiblePlayers = React.useMemo(() => {
    return players.filter((p) => {
      const pNameLower = p.name.trim().toLowerCase();
      const seasonStat = activeSeason?.players?.find(
        (sp) => sp.nickname.trim().toLowerCase() === pNameLower
      );
      const isCabutan = p.status === 'Cabutan' || seasonStat?.status === 'Cabutan';
      const seasonMatchesCount = seasonStat ? Number(seasonStat.matches) || 0 : 0;

      if (isCabutan && seasonMatchesCount < 1) {
        return false;
      }
      return true;
    });
  }, [players, activeSeason]);

  // 2. Rank in active season:
  // Standings are ordered strictly and sequentially by the official tournament rules:
  // (1) Total score desc, (2) MVP desc, (3) Antam desc, (4) Lowest Coklat asc, (5) Win rate desc, (6) AVG score desc, (7) Nickname asc
  // Cabutan dengan 0 match TIDAK masuk ke data season.
  // Hanya pemain dengan minimal 1 match yang memperoleh nomor urut peringkat resmi season.
  const rankedSeasonPlayers = React.useMemo(() => {
    if (!activeSeason?.players || activeSeason.players.length === 0) return [];

    const eligibleRoster = activeSeason.players.filter((p) => {
      const pNameLower = p.nickname.trim().toLowerCase();
      const meta = players.find((pl) => pl.name.trim().toLowerCase() === pNameLower);
      const isCabutan = p.status === 'Cabutan' || meta?.status === 'Cabutan';
      const matchesCount = Number(p.matches) || 0;

      if (isCabutan && matchesCount < 1) return false;
      return matchesCount > 0;
    });

    return [...eligibleRoster].sort((a, b) => {
      const scoreA = Number(a.score) || 0;
      const scoreB = Number(b.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const mvpA = Number(a.mvp) || 0;
      const mvpB = Number(b.mvp) || 0;
      if (mvpB !== mvpA) return mvpB - mvpA;

      const antamA = Number(a.antam) || 0;
      const antamB = Number(b.antam) || 0;
      if (antamB !== antamA) return antamB - antamA;

      const coklatA = Number(a.coklat) || 0;
      const coklatB = Number(b.coklat) || 0;
      if (coklatA !== coklatB) return coklatA - coklatB;

      const wrA = Number(b.winRate) || 0;
      const wrB = Number(a.winRate) || 0;
      if (wrA !== wrB) return wrA - wrB;

      const avgA = Number(b.avgScore) || 0;
      const avgB = Number(a.avgScore) || 0;
      if (avgA !== avgB) return avgA - avgB;

      return (a.nickname || '').localeCompare(b.nickname || '');
    });
  }, [activeSeason, players]);

  // Lookup map untuk nomor urut rank (1-indexed, berurutan: #1, #2, #3, ...)
  const playerRankMap = React.useMemo(() => {
    const map = new Map<string, number>();
    rankedSeasonPlayers.forEach((sp, idx) => {
      map.set(sp.nickname.trim().toLowerCase(), idx + 1);
    });
    return map;
  }, [rankedSeasonPlayers]);

  // 3. Urutan rank disesuaikan agar berurutan (#1, #2, #3, ...) dan enak dilihat:
  // Pemain yang memiliki rank di season ini diurutkan dari peringkat 1 ke bawah secara berurutan,
  // lalu diikuti pemain yang belum bertanding di season ini.
  const sortedVisiblePlayers = React.useMemo(() => {
    return [...visiblePlayers].sort((a, b) => {
      const aName = a.name.trim().toLowerCase();
      const bName = b.name.trim().toLowerCase();
      const rankA = playerRankMap.get(aName);
      const rankB = playerRankMap.get(bName);

      if (rankA !== undefined && rankB !== undefined) {
        return rankA - rankB; // Berurutan: #1, #2, #3, ...
      }
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [visiblePlayers, playerRankMap]);

  // Active player selection: jika pemain cabutan yang dipilih sebelumnya tidak bermain di season ini,
  // secara otomatis dialihkan ke pemain peringkat #1 di season yang dipilih.
  const player = React.useMemo(() => {
    const found = sortedVisiblePlayers.find(
      (p) => String(p.id) === String(activeId) || p.name.trim().toLowerCase() === String(activeId).trim().toLowerCase()
    );
    if (found) return found;
    return sortedVisiblePlayers[0] || players[0];
  }, [sortedVisiblePlayers, activeId, players]);

  // Sinkronisasi id pemain saat berpindah season jika pemain sebelumnya tidak ada di season ini
  React.useEffect(() => {
    if (sortedVisiblePlayers.length > 0) {
      const isCurrentVisible = sortedVisiblePlayers.some(
        (p) => String(p.id) === String(activeId) || p.name.trim().toLowerCase() === String(activeId).trim().toLowerCase()
      );
      if (!isCurrentVisible && sortedVisiblePlayers[0]) {
        const topPlayer = sortedVisiblePlayers[0];
        setInternalSelectedId(topPlayer.id);
        if (onSelectPlayer) {
          onSelectPlayer(topPlayer.id);
        }
      }
    }
  }, [sortedVisiblePlayers, activeId, onSelectPlayer]);

  const { session, isLoggedIn, openLogin } = usePlayerAuth();
  const isOwnProfile = Boolean(
    isLoggedIn && player && session?.playerName.trim().toLowerCase() === player.name.trim().toLowerCase()
  );
  // Foto & data pribadi hanya boleh diubah oleh admin, atau oleh pemain
  // yang bersangkutan setelah login ke akun pemainnya sendiri.
  const canEditOwnData = isAdmin || isOwnProfile;

  const handleSelect = (id: number | string) => {
    setInternalSelectedId(id);
    if (onSelectPlayer) {
      onSelectPlayer(id);
    }
  };

  if (!player) {
    return (
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-8 text-center text-[#9C948A]">
        Belum ada data pemain. Silakan input pertandingan atau data pemain terlebih dahulu.
      </div>
    );
  }

  // 1. Season-specific player statistics from activeSeason
  const seasonPlayerStat = activeSeason?.players?.find(
    (p) => p.nickname.trim().toLowerCase() === player.name.trim().toLowerCase()
  );

  const seasonPlayerIndex = rankedSeasonPlayers.findIndex(
    (p) => p.nickname.trim().toLowerCase() === player.name.trim().toLowerCase()
  );
  const seasonRank = seasonPlayerIndex >= 0 ? seasonPlayerIndex + 1 : 0;
  const hasSeasonMatches = seasonPlayerStat ? (seasonPlayerStat.matches || 0) > 0 : false;

  // Medals and metrics: follow the active season
  // If player played in the season, use season data.
  // If player hasn't played in this season, show 0 for the active season so ranking & stats are per-season.
  const isSeasonSelected = Boolean(activeSeason && activeSeason.id);
  const mvpCount = isSeasonSelected ? (seasonPlayerStat?.mvp ?? 0) : player.medals.MVP;
  const goldCount = isSeasonSelected ? (seasonPlayerStat?.antam ?? 0) : player.medals.Gold;
  const silverCount = isSeasonSelected ? (seasonPlayerStat?.silver ?? 0) : player.medals.Silver;
  const coklatCount = isSeasonSelected ? (seasonPlayerStat?.coklat ?? 0) : player.medals.Coklat;
  const totalMatches = isSeasonSelected ? (seasonPlayerStat?.matches ?? 0) : player.total_match;
  const totalScore = isSeasonSelected ? (seasonPlayerStat?.score ?? 0) : (player.score || 0);
  const avgScore = isSeasonSelected ? (seasonPlayerStat?.avgScore ?? 0) : (player.avgScore || 0);
  const winRate = isSeasonSelected ? (seasonPlayerStat?.winRate ?? 0) : (player.winRate || 0);

  const totalMedals = mvpCount + goldCount + silverCount + coklatCount;

  // Pie chart data
  const pieData = [
    { name: 'MVP', value: mvpCount, color: '#E8B33D' },
    { name: 'Antam (Gold)', value: goldCount, color: '#D97706' },
    { name: 'Silver', value: silverCount, color: '#B9B2A8' },
    { name: 'Coklat', value: coklatCount, color: '#6B4226' },
  ].filter((d) => d.value > 0);

  // Top heroes
  const topHeroes = getPlayerTopHeroes(player.name, matches, activeSeason);

  // Daily Trend score & performa calculation
  const dailyTrendData = getPlayerPerformanceTrend(player.name, matches, activeSeason);

  // Dynamic status title (prefer saved julukan, fallback to heuristic)
  const getPlayerTitle = () => {
    if (player.julukan) return player.julukan;
    if (seasonRank === 1) return 'Pemuncak Klasemen Laga Amal (Raja Pantos)';
    if (mvpCount >= 8) return 'Sang Penggendong Sejati (Tulang Punggung)';
    if (coklatCount >= 5) return 'Warga Kehormatan Kelas Semen';
    if (goldCount >= 6) return 'Kolektor Antam Konsisten (Anti Beban)';
    if (silverCount >= 7) return 'Spesialis Runner-up (Cukup Rapi)';
    return 'Peserta Aktif Laga Amal Pantos';
  };

  // Admin manual generate julukan
  const handleManualGenerateTitle = async () => {
    if (!player || !onGenerateJulukan || isGeneratingTitle) return;
    try {
      setIsGeneratingTitle(true);
      setStatusFeedback('Membuat julukan baru dengan AI...');
      const newTitle = await onGenerateJulukan(player.id);
      if (newTitle) {
        setStatusFeedback(`Julukan baru diperbarui: "${newTitle}"`);
      } else {
        setStatusFeedback('Julukan berhasil diperbarui');
      }
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusFeedback('Gagal membuat julukan AI');
      setTimeout(() => setStatusFeedback(null), 3000);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Admin update status (Cabutan vs Aktif)
  const handleToggleStatus = async (newStatus: 'Aktif' | 'Cabutan') => {
    if (!player || !onUpdatePlayerDetails) return;
    try {
      await onUpdatePlayerDetails(player.id, { status: newStatus });
      setStatusFeedback(`Status diubah menjadi: ${newStatus}`);
      setTimeout(() => setStatusFeedback(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin update tier (Warrior, Epic, Legend, Mythic)
  const handleSelectTier = async (newTier: string) => {
    if (!player || !onUpdatePlayerDetails) return;
    try {
      await onUpdatePlayerDetails(player.id, { tier: newTier });
      setStatusFeedback(`Tier diubah menjadi: ${newTier}`);
      setTimeout(() => setStatusFeedback(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const getTierBadgeStyle = (tierName: string = '') => {
    const t = tierName.toLowerCase();
    if (t.includes('immortal')) return 'bg-amber-950/80 text-amber-200 border-amber-400/80 shadow-[0_0_12px_rgba(232,179,61,0.3)]';
    if (t.includes('glory')) return 'bg-red-950/60 text-red-300 border-red-500/60';
    if (t.includes('honor')) return 'bg-purple-950/60 text-purple-300 border-purple-500/60';
    if (t.includes('mythic') || t.includes('myth')) return 'bg-rose-950/50 text-rose-300 border-rose-500/50';
    if (t.includes('legend')) return 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/40';
    if (t.includes('epic')) return 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50';
    if (t.includes('grandma') || t.includes('grand')) return 'bg-cyan-950/50 text-cyan-300 border-cyan-500/50';
    if (t.includes('master')) return 'bg-amber-950/40 text-amber-300 border-amber-500/40';
    if (t.includes('elite')) return 'bg-slate-800 text-slate-200 border-slate-600';
    if (t.includes('warrior')) return 'bg-stone-900 text-stone-300 border-stone-600';
    return 'bg-[#241F1B] text-[#F2EDE4] border-[#332C25]';
  };

  const getStatusBadgeStyle = (statusName: string = '') => {
    if (statusName === 'Cabutan') {
      return 'bg-purple-950/40 text-purple-300 border-purple-500/40';
    }
    return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40';
  };

  return (
    <div id="player-profile-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#332C25] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D] border border-[#332C25]">
            <UserRound size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg">
                Profil & Statistik Pemain
              </h2>
              {seasons && seasons.length > 0 && onSelectSeason ? (
                <div className="flex items-center gap-1.5 bg-[#241F1B] px-2 py-0.5 rounded-lg border border-[#E8B33D]/30">
                  <span className="text-[10px] text-[#9C948A] font-medium">Season:</span>
                  <select
                    value={selectedSeasonId || activeSeason?.id}
                    onChange={(e) => onSelectSeason(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#E8B33D] focus:outline-none cursor-pointer"
                    title="Pilih season untuk melihat peringkat klasemen dan statistik season tersebut"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#1D1916] text-[#F2EDE4]">
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                activeSeason && (
                  <span className="rounded-full bg-[#E8B33D]/15 border border-[#E8B33D]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8B33D]">
                    {activeSeason.title}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-[#9C948A]">
              Peringkat &amp; statistik mengikuti perolehan skor season yang aktif (bukan global)
            </p>
          </div>
        </div>

        {/* Season Ranking Banner */}
        <div className="flex items-center gap-2.5 rounded-xl border border-[#332C25] bg-[#1D1916] px-3.5 py-2 self-start sm:self-auto shadow-sm">
          <Trophy size={16} className={hasSeasonMatches ? 'text-[#E8B33D]' : 'text-[#6E655C]'} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#9C948A]">
                Klasemen {activeSeason?.title || 'Season'}:
              </span>
              {hasSeasonMatches && seasonRank > 0 ? (
                <span className="font-black text-sm text-[#E8B33D]">
                  #{seasonRank}{' '}
                  <span className="text-[10px] font-normal text-[#9C948A]">
                    / {rankedSeasonPlayers.length} Pemain
                  </span>
                </span>
              ) : (
                <span className="text-xs font-medium text-[#9C948A] italic">
                  Belum Ada Match
                </span>
              )}
            </div>
            <span className="text-[9px] text-[#6E655C]">
              *Mengikuti peringkat resmi season yang dipilih
            </span>
          </div>
        </div>
      </div>

      {/* Player selector toolbar & chips */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F2EDE4] flex items-center gap-1.5">
              <Trophy size={13} className="text-[#E8B33D]" />
              <span>Urutan Klasemen Pemain:</span>
            </span>
            <span className="text-[11px] text-[#9C948A]">
              {rankedSeasonPlayers.length > 0
                ? `Berurutan #1 s/d #${rankedSeasonPlayers.length}`
                : 'Belum ada match'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center rounded-lg bg-[#241F1B] border border-[#332C25] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectorFilterTab('all')}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  selectorFilterTab === 'all'
                    ? 'bg-[#E8B33D] text-[#161311] shadow-sm'
                    : 'text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                Semua ({sortedVisiblePlayers.length})
              </button>
              {sortedVisiblePlayers.some((p) => {
                const pNameLower = p.name.trim().toLowerCase();
                const seasonStat = activeSeason?.players?.find(
                  (sp) => sp.nickname.trim().toLowerCase() === pNameLower
                );
                return p.status === 'Cabutan' || seasonStat?.status === 'Cabutan';
              }) && (
                <button
                  type="button"
                  onClick={() => setSelectorFilterTab('cabutan')}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    selectorFilterTab === 'cabutan'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-purple-300 hover:text-purple-200'
                  }`}
                  title="Pemain cabutan yang memiliki kontribusi minimal 1 match di season ini"
                >
                  Cabutan ({sortedVisiblePlayers.filter((p) => {
                    const pNameLower = p.name.trim().toLowerCase();
                    const seasonStat = activeSeason?.players?.find(
                      (sp) => sp.nickname.trim().toLowerCase() === pNameLower
                    );
                    return p.status === 'Cabutan' || seasonStat?.status === 'Cabutan';
                  }).length})
                </button>
              )}
            </div>

            {/* Quick search */}
            {sortedVisiblePlayers.length > 8 && (
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
                <input
                  type="text"
                  value={selectorSearch}
                  onChange={(e) => setSelectorSearch(e.target.value)}
                  placeholder="Cari..."
                  className="rounded-lg border border-[#332C25] bg-[#241F1B] pl-7 pr-2.5 py-0.5 text-[11px] text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none w-24 sm:w-28"
                />
              </div>
            )}
          </div>
        </div>

        {/* Chips list */}
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 pb-1">
          {sortedVisiblePlayers
            .filter((p) => {
              const pNameLower = p.name.trim().toLowerCase();
              const seasonStat = activeSeason?.players?.find(
                (sp) => sp.nickname.trim().toLowerCase() === pNameLower
              );
              const isCabutan = p.status === 'Cabutan' || seasonStat?.status === 'Cabutan';

              if (selectorFilterTab === 'cabutan' && !isCabutan) return false;

              if (selectorSearch.trim()) {
                const query = selectorSearch.trim().toLowerCase();
                return pNameLower.includes(query);
              }
              return true;
            })
            .map((p, idx) => {
              const isCurrent = String(p.id) === String(player.id) || p.name === player.name;
              const pNameLower = p.name.trim().toLowerCase();
              const rank = playerRankMap.get(pNameLower);
              const seasonStat = activeSeason?.players?.find(
                (sp) => sp.nickname.trim().toLowerCase() === pNameLower
              );
              const isCabutan = p.status === 'Cabutan' || seasonStat?.status === 'Cabutan';

              return (
                <button
                  key={`profile-player-btn-${p.id ?? p.name}-${idx}`}
                  id={`profile-selector-${p.id}`}
                  onClick={() => handleSelect(p.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1 text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? 'border border-[#E8B33D] bg-[#E8B33D] text-[#161311] shadow-md font-bold ring-2 ring-[#E8B33D]/30'
                      : 'border border-[#332C25] bg-[#1D1916] text-[#F2EDE4] hover:border-[#E8B33D]/50 hover:bg-[#241F1B]'
                  }`}
                >
                  {/* Rank badge */}
                  {rank !== undefined ? (
                    rank === 1 ? (
                      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isCurrent ? 'bg-black text-[#E8B33D]' : 'bg-[#E8B33D] text-[#161311]'
                      }`}>
                        👑 #1
                      </span>
                    ) : rank === 2 ? (
                      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isCurrent ? 'bg-black text-slate-200' : 'bg-slate-300 text-slate-900'
                      }`}>
                        🥈 #2
                      </span>
                    ) : rank === 3 ? (
                      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isCurrent ? 'bg-black text-amber-300' : 'bg-amber-700 text-amber-100'
                      }`}>
                        🥉 #3
                      </span>
                    ) : (
                      <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isCurrent ? 'bg-black/20 text-[#161311]' : 'bg-[#2A241E] text-[#E8B33D] border border-[#332C25]'
                      }`}>
                        #{rank}
                      </span>
                    )
                  ) : (
                    <span className={`text-[10px] px-1 italic ${isCurrent ? 'text-black/60' : 'text-[#9C948A]'}`}>
                      -
                    </span>
                  )}

                  <PlayerAvatar name={p.name} avatarUrl={p.avatar_url} size="xs" />
                  <span className="font-semibold">{p.name}</span>

                  {/* Cabutan indicator */}
                  {isCabutan && (
                    <span className={`rounded px-1 text-[9px] font-bold ${
                      isCurrent
                        ? 'bg-purple-900 text-purple-100'
                        : 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                    }`}>
                      Cabutan
                    </span>
                  )}

                  {/* Season score pill */}
                  {seasonStat && (seasonStat.matches || 0) > 0 && (
                    <span className={`text-[10px] font-bold ${
                      isCurrent ? 'text-black/80' : 'text-[#E8B33D]/90'
                    }`}>
                      {seasonStat.score}p
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Status feedback toast if updated */}
      {statusFeedback && (
        <div className="rounded-lg bg-[#E8B33D]/10 border border-[#E8B33D]/40 px-3.5 py-2 text-xs font-semibold text-[#E8B33D] flex items-center gap-2 animate-fadeIn">
          <Check size={14} />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Player overview card */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 sm:p-6 shadow-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#332C25] pb-5">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                id={`player-avatar-preview-btn-${player.id}`}
                onClick={() => setIsImagePreviewOpen(true)}
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title="Klik untuk memperbesar foto profil"
              >
                <PlayerAvatar
                  name={player.name}
                  avatarUrl={player.avatar_url}
                  size="xl"
                  status={player.status}
                  showStatusDot
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[#E8B33D] cursor-pointer">
                  <ZoomIn size={20} />
                  <span className="text-[9px] font-bold mt-0.5 text-[#F2EDE4]">Perbesar</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-2xl text-[#F2EDE4] tracking-tight">
                  {player.name}
                </h3>

                {/* Status Badge (Cabutan / Aktif) */}
                <span
                  onClick={() => isAdmin && handleToggleStatus(player.status === 'Cabutan' ? 'Aktif' : 'Cabutan')}
                  className={`rounded px-2.5 py-0.5 text-xs font-semibold border transition-all select-none ${getStatusBadgeStyle(
                    player.status
                  )} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-[#E8B33D]/50' : ''}`}
                  title={isAdmin ? `Klik untuk ubah ke ${player.status === 'Cabutan' ? 'Aktif' : 'Cabutan'}` : player.status}
                >
                  {player.status}
                  {isAdmin && <span className="text-[9px] opacity-70 ml-1">⇄</span>}
                </span>

                {/* Tier Badge (Warrior / Epic / Legend / Mythic) */}
                <span
                  onClick={() => isAdmin && setIsEditBadgesOpen(true)}
                  className={`rounded px-2.5 py-0.5 text-xs font-semibold border transition-all select-none ${getTierBadgeStyle(
                    player.tier
                  )} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-[#E8B33D]/50' : ''}`}
                  title={isAdmin ? 'Klik untuk ubah Tier' : `Tier ${player.tier}`}
                >
                  {player.tier}
                  {isAdmin && <ChevronDown size={10} className="inline ml-1 opacity-70" />}
                </span>

                {/* Admin Quick Action for Status and Tier */}
                {isAdmin && (
                  <button
                    onClick={() => setIsEditBadgesOpen(!isEditBadgesOpen)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#241F1B] hover:bg-[#2A241E] hover:border-[#E8B33D]/50 px-2.5 py-1 text-[11px] font-bold text-[#E8B33D] transition-colors cursor-pointer"
                    title="Ubah Badge Cabutan dan Tier"
                  >
                    <Settings2 size={12} />
                    <span>Ubah Badge & Tier</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (canEditOwnData) {
                      setIsAvatarModalOpen(true);
                    } else {
                      openLogin(player.name);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#241F1B] hover:bg-[#2A241E] hover:border-[#E8B33D]/50 px-2.5 py-1 text-[11px] font-bold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                  title={
                    canEditOwnData
                      ? 'Update foto profil'
                      : `Login sebagai ${player.name} untuk mengubah foto profil ini`
                  }
                >
                  <Camera size={12} />
                  <span>{canEditOwnData ? 'Update Foto' : 'Login untuk Ubah Foto'}</span>
                </button>
              </div>

              {/* Julukan Pantos (AI Generated) */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <p className="text-xs text-[#9C948A]">
                  Julukan Pantos:{' '}
                  <span className="text-[#F2EDE4] font-medium italic">
                    "{getPlayerTitle()}"
                  </span>
                </p>

                {canEditOwnData && (
                  <button
                    id="btn-generate-julukan"
                    onClick={handleManualGenerateTitle}
                    disabled={isGeneratingTitle}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#E8B33D]/40 bg-[#E8B33D]/10 hover:bg-[#E8B33D]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#E8B33D] transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    title="Buat julukan baru dengan AI Gemini"
                  >
                    <Sparkles size={11} className={isGeneratingTitle ? 'animate-spin text-[#E8B33D]' : 'text-[#E8B33D]'} />
                    <span>{isGeneratingTitle ? 'Membuat AI...' : 'Generate Julukan'}</span>
                  </button>
                )}
              </div>

              {player.julukan_updated_at && (
                <p className="text-[10px] text-[#9C948A]/70 mt-0.5">
                  Update mingguan: {new Date(player.julukan_updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics from Laga Amal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-[#F2EDE4]">
                {totalMatches}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Match</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-[#E8B33D]">
                {totalScore}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Total Skor</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-emerald-400">
                {winRate}%
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">Win Rate</span>
            </div>
            <div className="rounded-xl border border-[#332C25] bg-[#241F1B] px-3.5 py-2 text-center min-w-[75px]">
              <span className="block font-black text-lg text-amber-300">
                {avgScore}
              </span>
              <span className="text-[10px] text-[#9C948A] uppercase font-semibold">AVG Skor</span>
            </div>
          </div>
        </div>

        {/* Inline Admin Editor for Status (Cabutan) & Tier */}
        {isAdmin && isEditBadgesOpen && (
          <div className="rounded-xl border border-[#E8B33D]/30 bg-[#241F1B] p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E8B33D] flex items-center gap-1.5 uppercase tracking-wider">
                <Settings2 size={14} /> Pengaturan Badge Cabutan & Tier Pemain (Admin)
              </span>
              <button
                onClick={() => setIsEditBadgesOpen(false)}
                className="text-[11px] text-[#9C948A] hover:text-[#F2EDE4] font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Badge Cabutan / Aktif */}
              <div>
                <label className="text-[11px] font-semibold text-[#9C948A] block mb-1.5">
                  Badge Status Pemain:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus('Aktif')}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      player.status === 'Aktif'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/80 shadow'
                        : 'bg-[#1D1916] text-[#9C948A] border-[#332C25] hover:border-emerald-500/40'
                    }`}
                  >
                    Aktif (Member Tetap)
                  </button>
                  <button
                    onClick={() => handleToggleStatus('Cabutan')}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      player.status === 'Cabutan'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-500/80 shadow'
                        : 'bg-[#1D1916] text-[#9C948A] border-[#332C25] hover:border-purple-500/40'
                    }`}
                  >
                    Cabutan (Tamu)
                  </button>
                </div>
              </div>

              {/* Tier Selection Dropdown */}
              <div>
                <label className="text-[11px] font-semibold text-[#9C948A] block mb-1.5">
                  Tier Pemain:
                </label>
                <div className="relative">
                  <select
                    id="select-player-tier"
                    value={player.tier}
                    onChange={(e) => handleSelectTier(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#332C25] bg-[#161311] px-3.5 py-2 pr-9 text-xs font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer transition-colors shadow-sm"
                  >
                    {MLBB_TIER_OPTIONS.map((t) => (
                      <option key={t} value={t} className="bg-[#1D1916] text-[#F2EDE4]">
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#E8B33D]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 Medals Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E8B33D]/30 bg-[#2A2218] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#E8B33D] uppercase tracking-wider">👑 MVP</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{mvpCount}</span>
            <span className="text-[10px] text-[#9C948A]">Gelar MVP</span>
          </div>
          <div className="rounded-xl border border-[#D8A93A]/30 bg-[#251E17] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#D8A93A] uppercase tracking-wider">🥇 Antam (Gold)</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{goldCount}</span>
            <span className="text-[10px] text-[#9C948A]">Medali Gold</span>
          </div>
          <div className="rounded-xl border border-[#B9B2A8]/30 bg-[#211E1B] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#B9B2A8] uppercase tracking-wider">🥈 Silver</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{silverCount}</span>
            <span className="text-[10px] text-[#9C948A]">Medali Silver</span>
          </div>
          <div className="rounded-xl border border-[#6B4226]/40 bg-[#2A1D15] p-3 text-center">
            <span className="block text-[10px] font-bold text-[#b8764a] uppercase tracking-wider">🍫 Coklat (Semen)</span>
            <span className="text-2xl font-black text-[#F2EDE4] mt-0.5 block">{coklatCount}</span>
            <span className="text-[10px] text-[#b8764a]">Medali Coklat</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pie Chart: Distribusi Medali */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                <PieIcon size={14} /> Distribusi Medali Laga Amal
              </span>
              <span className="text-[11px] text-[#9C948A]">
                Total {totalMedals} Medali
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={entry.color}
                        stroke="#1D1916"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1D1916',
                      borderColor: '#332C25',
                      color: '#F2EDE4',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend pills */}
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E8B33D]" />
                MVP: {mvpCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D8A93A]" />
                Antam: {goldCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B9B2A8]" />
                Silver: {silverCount}
              </span>
              <span className="flex items-center gap-1.5 text-[#F2EDE4]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6B4226]" />
                Coklat: {coklatCount}
              </span>
            </div>
          </div>

          {/* Line Chart: Tren Rating Skor (10 Match Terakhir) */}
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4 flex flex-col justify-between">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
                  <TrendingUp size={14} /> Tren Rating Skor (10 Match Terakhir)
                </span>
                <span className="text-[11px] text-[#9C948A] block">
                  Fluktuasi skor performa pada 10 pertandingan resmi Laga Amal terakhir
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#1D1916] px-2.5 py-1 text-[11px] font-bold text-[#E8B33D]">
                <Zap size={12} className="text-[#E8B33D]" />
                <span>Skala Rating (0 - 12)</span>
              </div>
            </div>

            {dailyTrendData.length > 0 ? (
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrendData}>
                    <XAxis
                      dataKey="label"
                      stroke="#9C948A"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#332C25' }}
                    />
                    <YAxis
                      domain={[0, 12]}
                      ticks={[0, 3, 6, 8, 10, 12]}
                      stroke="#9C948A"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1D1916',
                        borderColor: '#332C25',
                        color: '#F2EDE4',
                        borderRadius: '10px',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any, _name: any, item: any) => {
                        const payload = item.payload;
                        return [
                          <div key="tooltip-rating" className="space-y-1">
                            <p className="font-bold text-[#E8B33D] text-sm">{val}</p>
                            <p className="text-[11px] text-[#9C948A]">
                              {payload.fullLabel || payload.label} &bull; {payload.date}
                            </p>
                            {payload.detail && (
                              <p className="text-[11px] text-[#F2EDE4] font-medium">{payload.detail}</p>
                            )}
                          </div>,
                          'Rating Skor',
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      connectNulls={true}
                      stroke="#E8B33D"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#E8B33D', stroke: '#1D1916', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#F2EDE4' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 w-full rounded-xl border border-dashed border-[#332C25] bg-[#241F1B]/40 p-4 text-center my-2">
                <TrendingUp size={24} className="text-[#9C948A]/40 mb-1.5" />
                <p className="text-xs font-bold text-[#F2EDE4]">Belum Ada Pertandingan Tercatat</p>
                <p className="text-[11px] text-[#9C948A] max-w-sm mt-1">
                  Rating skor dihitung otomatis dari 10 pertandingan terakhir yang dimainkan oleh {player.name} di Laga Amal.
                </p>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-[#9C948A] border-t border-[#332C25]/50 pt-2 gap-2">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[#E8B33D]" />
                <span>
                  {dailyTrendData.length > 0
                    ? `Menampilkan ${dailyTrendData.length} pertandingan terakhir`
                    : 'Belum ada data riwayat pertandingan'}
                </span>
              </span>
              {dailyTrendData.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-[#9C948A]">
                    Rata-rata: <strong className="text-[#E8B33D]">
                      {(
                        dailyTrendData.reduce((acc, cur) => acc + (cur.rating || 0), 0) /
                        dailyTrendData.length
                      ).toFixed(2)}
                    </strong>
                  </span>
                  <span className="text-[#9C948A]">
                    Tertinggi: <strong className="text-emerald-400">
                      {Math.max(...dailyTrendData.map((d) => d.rating || 0))}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 3 Hero andalan */}
        <div className="border-t border-[#332C25] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-bold text-xs text-[#E8B33D] uppercase tracking-wider">
              <Sparkles size={14} /> Top Hero Pilihan {player.name}
            </h4>
            <span className="text-xs text-[#9C948A]">
              Berdasarkan rasio pick & medali di Laga Amal
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {topHeroes.length > 0 ? (
              topHeroes.map((h, i) => (
                <div
                  key={h.hero}
                  className="rounded-xl border border-[#332C25] bg-[#241F1B] p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-[#161311] font-bold text-xs text-[#E8B33D]">
                        #{i + 1}
                      </span>
                      <HeroAvatar heroName={h.hero} size="sm" shape="rounded" />
                      <span className="font-bold text-sm text-[#F2EDE4]">
                        {h.hero}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-[#E8B33D]">
                      {h.mvpRate}% MVP
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#9C948A]">
                    <span>{h.games} Pertandingan</span>
                    <span>{h.mvpCount} Kali MVP</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#161311]">
                    <div
                      className="h-full rounded-full bg-[#E8B33D]"
                      style={{ width: `${Math.max(8, h.mvpRate)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-[#332C25] bg-[#241F1B]/40 p-6 text-center">
                <Shield size={22} className="mx-auto text-[#9C948A]/40 mb-1.5" />
                <p className="font-semibold text-xs text-[#F2EDE4]">Belum Ada Riwayat Pertandingan Hero</p>
                <p className="text-[11px] text-[#9C948A] mt-1 max-w-md mx-auto">
                  Hero andalan {player.name} akan tercatat dan tersinkronisasi otomatis saat pertandingan baru disimpan di Laga Amal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Avatar Modal */}
      {isAvatarModalOpen && (
        <UpdateAvatarModal
          isOpen={isAvatarModalOpen}
          player={player}
          onClose={() => setIsAvatarModalOpen(false)}
          onSave={async (playerId, newAvatarUrl) => {
            if (onUpdatePlayerAvatar) {
              const res = await onUpdatePlayerAvatar(playerId, newAvatarUrl);
              return Boolean(res);
            }
            return true;
          }}
        />
      )}

      {/* Image Preview Modal */}
      {isImagePreviewOpen && (
        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={getPlayerAvatarUrl(player.name, player.avatar_url)}
          playerName={player.name}
          tier={player.tier}
          status={player.status}
          julukan={getPlayerTitle()}
          isAdmin={canEditOwnData}
          onEditPhoto={() => setIsAvatarModalOpen(true)}
        />
      )}
    </div>
  );
};
