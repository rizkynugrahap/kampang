import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Users,
  Calendar,
  Flame,
  Search,
  Upload,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  BarChart3,
  ChevronRight,
  Filter,
  Layers,
  Plus,
  X,
  History,
  Trash2,
  LayoutGrid,
  Table,
} from 'lucide-react';
import {
  LagaAmalSeasonData,
  LagaAmalPlayerStat,
  HeroPickByUser,
  HeroPoolItem,
  LagaAmalMatchLog,
} from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { recalculateSeasonStats, EMPTY_SEASON } from '../utils/seasonCalculations';
import { syncLagaAmalToFirestore } from '../services/firestoreSync';

type SubTab = 'standings' | 'heroPicks' | 'heroPool' | 'matchLogs';
type SortField = 'score' | 'mvp' | 'antam' | 'silver' | 'coklat' | 'matches' | 'winRate' | 'avgScore';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Turns two <input type="date"> values into a friendly Indonesian range, e.g. "12 Sep - 20 Okt 2026". */
function formatSeasonDateRange(startStr: string, endStr: string): string {
  if (!startStr) return '';
  const parseLocal = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return { day: d, month: MONTHS_ID[m - 1], year: y };
  };
  const start = parseLocal(startStr);
  if (!endStr || endStr === startStr) {
    return `${start.day} ${start.month} ${start.year}`;
  }
  const end = parseLocal(endStr);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} - ${end.day} ${start.month} ${start.year}`;
  }
  if (start.year === end.year) {
    return `${start.day} ${start.month} - ${end.day} ${end.month} ${start.year}`;
  }
  return `${start.day} ${start.month} ${start.year} - ${end.day} ${end.month} ${end.year}`;
}

interface LagaAmalViewProps {
  seasons?: LagaAmalSeasonData[];
  activeSeasonId?: string;
  selectedSeasonId?: string;
  onSeasonChange?: (seasonId: string) => void;
  onSetActiveSeason?: (seasonId: string) => void;
  onUpdateSeason?: (season: LagaAmalSeasonData) => void;
  onDeleteSeason?: (seasonId: string) => void;
  onViewPlayerProfile?: (nickname: string) => void;
  isAdmin?: boolean;
}

export const LagaAmalView: React.FC<LagaAmalViewProps> = ({
  seasons = [],
  activeSeasonId,
  selectedSeasonId,
  onSeasonChange,
  onSetActiveSeason,
  onUpdateSeason,
  onDeleteSeason,
  onViewPlayerProfile,
  isAdmin = false,
}) => {
  // Current season data resolved: prioritize selectedSeasonId, then activeSeasonId, then fallback
  const viewSeasonId = selectedSeasonId || activeSeasonId;
  const currentSeason = useMemo(() => {
    return (
      seasons.find((s) => s.id === viewSeasonId) ||
      seasons.find((s) => s.id === activeSeasonId) ||
      seasons[0] ||
      EMPTY_SEASON
    );
  }, [seasons, viewSeasonId, activeSeasonId]);

  const isCurrentlyActiveSeason = Boolean(
    currentSeason.id &&
      (currentSeason.id === activeSeasonId || (!activeSeasonId && currentSeason.isActive))
  );

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('standings');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvInputText, setCsvInputText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // New season modal — simplified to just a season number + a start/end
  // date picker. The title and the display date string are both generated
  // automatically from these so admins don't have to hand-type formatted
  // text like "KLASEMEN LAGA AMAL - S42" or "12 Sep - 12 Okt 2026".
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState(42);
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('');
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('');
  const [newSeasonError, setNewSeasonError] = useState<string | null>(null);

  // Selected player detail modal
  const [detailPlayer, setDetailPlayer] = useState<LagaAmalPlayerStat | null>(null);
  const [showDeleteSeasonConfirm, setShowDeleteSeasonConfirm] = useState(false);
  const [isDeletingSeason, setIsDeletingSeason] = useState(false);

  // View mode for standings: 'table' is default, 'cards' is mobile-friendly card mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Sort and filter players for standings
  const filteredPlayers = useMemo(() => {
    return (currentSeason.players || [])
      .filter((p) => p.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        let diff = 0;
        switch (sortField) {
          case 'score':
            diff = a.score - b.score;
            break;
          case 'mvp':
            diff = a.mvp - b.mvp;
            break;
          case 'antam':
            diff = a.antam - b.antam;
            break;
          case 'silver':
            diff = a.silver - b.silver;
            break;
          case 'coklat':
            diff = a.coklat - b.coklat;
            break;
          case 'matches':
            diff = a.matches - b.matches;
            break;
          case 'winRate':
            diff = a.winRate - b.winRate;
            break;
          case 'avgScore':
            diff = a.avgScore - b.avgScore;
            break;
        }
        return sortAsc ? diff : -diff;
      });
  }, [currentSeason.players, searchQuery, sortField, sortAsc]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Hero picks filtered by selected player
  const filteredHeroPicks = useMemo(() => {
    if (!currentSeason.heroPicks) return [];
    if (selectedPlayerFilter === 'all') {
      return currentSeason.heroPicks;
    }
    return currentSeason.heroPicks.filter(
      (p) => p.user.toLowerCase() === selectedPlayerFilter.toLowerCase()
    );
  }, [currentSeason.heroPicks, selectedPlayerFilter]);

  // Opens the "New Season" modal with a sensible next season number
  // pre-filled, so admins usually just need to pick the dates.
  const openNewSeasonModal = () => {
    const existingNumbers = seasons.map((s) => parseInt((s.id.match(/(\d+)/) || [])[1] || '0', 10));
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    setNewSeasonNumber(nextNumber);
    setNewSeasonStartDate('');
    setNewSeasonEndDate('');
    setNewSeasonError(null);
    setIsNewSeasonModalOpen(true);
  };

  // Live preview of the auto-generated title & date string
  const newSeasonPreviewTitle = `KLASEMEN LAGA AMAL - S${newSeasonNumber || ''}`;
  const newSeasonPreviewDate = formatSeasonDateRange(newSeasonStartDate, newSeasonEndDate) || 'Pilih tanggal mulai';

  // Handle creating a new season
  const handleCreateNewSeason = () => {
    setNewSeasonError(null);

    if (!newSeasonNumber || newSeasonNumber <= 0) {
      setNewSeasonError('Nomor season harus diisi.');
      return;
    }
    if (!newSeasonStartDate) {
      setNewSeasonError('Tanggal mulai harus diisi.');
      return;
    }

    const newId = `s${newSeasonNumber}`;
    if (seasons.some((s) => s.id === newId)) {
      setNewSeasonError(`Season S${newSeasonNumber} sudah ada. Pakai nomor lain.`);
      return;
    }

    const newSeason: LagaAmalSeasonData = {
      id: newId,
      title: newSeasonPreviewTitle,
      dateStr: formatSeasonDateRange(newSeasonStartDate, newSeasonEndDate),
      activePlayersCount: currentSeason.players.length,
      topCoklat: { player: currentSeason.players[0]?.nickname || '-', count: 0 },
      topSilver: { player: currentSeason.players[0]?.nickname || '-', count: 0 },
      topAntam: { player: currentSeason.players[0]?.nickname || '-', count: 0 },
      topMvp: { player: currentSeason.players[0]?.nickname || '-', count: 0 },
      totalMatchesRecorded: 0,
      totalScoreAccumulated: 0,
      averageWinRate: 0,
      averageScore: 0,
      players: currentSeason.players.map((p) => ({
        nickname: p.nickname,
        coklat: 0,
        silver: 0,
        antam: 0,
        mvp: 0,
        matches: 0,
        score: 0,
        winRate: 0,
        avgScore: 0,
        avatar_url: p.avatar_url,
      })),
      heroPicks: [],
      heroPool: [],
      matchLogs: [],
    };

    if (onUpdateSeason) {
      onUpdateSeason(newSeason);
    }
    if (onSeasonChange) {
      onSeasonChange(newId);
    }
    setIsNewSeasonModalOpen(false);
    setNewSeasonStartDate('');
    setNewSeasonEndDate('');
  };

  // CSV Import handler
  const handleImportCsv = () => {
    setImportError(null);
    setImportSuccess(false);

    if (!csvInputText.trim()) {
      setImportError('Silakan tempel (paste) data CSV terlebih dahulu.');
      return;
    }

    try {
      const lines = csvInputText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const parsedPlayers: LagaAmalPlayerStat[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.toLowerCase().includes('nickname') ||
          line.toLowerCase().includes('nama pemain') ||
          line.toLowerCase().includes('user')
        ) {
          continue;
        }

        const cols = line.split(',').map((c) => c.replace(/(^"|"$)/g, '').trim());
        if (cols.length >= 6) {
          const nickname = cols[0];
          if (!nickname) continue;

          const coklat = parseInt(cols[1], 10) || 0;
          const silver = parseInt(cols[2], 10) || 0;
          const antam = parseInt(cols[3], 10) || 0;
          const mvp = parseInt(cols[4], 10) || 0;
          const matches = parseInt(cols[5], 10) || (coklat + silver + antam + mvp);
          const score = cols[6] ? parseFloat(cols[6]) : (coklat * 0 + silver * 1 + antam * 2 + mvp * 3);
          const winRate = cols[7] ? parseFloat(cols[7].replace('%', '')) : (matches > 0 ? Math.round(((antam + mvp) / matches) * 100) : 0);
          const avgScore = cols[8] ? parseFloat(cols[8]) : (matches > 0 ? parseFloat((score / matches).toFixed(2)) : 0);

          parsedPlayers.push({
            nickname,
            coklat,
            silver,
            antam,
            mvp,
            matches,
            score,
            winRate,
            avgScore,
          });
        }
      }

      if (parsedPlayers.length === 0) {
        throw new Error('Tidak ada baris pemain yang valid ditemukan.');
      }

      const updatedSeason = recalculateSeasonStats({
        ...currentSeason,
        players: parsedPlayers,
      });

      if (onUpdateSeason) {
        onUpdateSeason(updatedSeason);
      }

      setImportSuccess(true);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccess(false);
        setCsvInputText('');
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses teks CSV');
    }
  };

  return (
    <div id="laga-amal-view" className="space-y-6">
      {/* Top Banner Header & Season Selector */}
      <div className="relative overflow-hidden rounded-2xl border border-[#332C25] bg-gradient-to-b from-[#241F1B] via-[#1D1916] to-[#161311] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            {/* Season Selector Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-2.5 py-1 text-xs font-bold text-[#E8B33D]">
                <History size={13} className="text-[#E8B33D]" />
                <span>Pilih Season:</span>
                <select
                  id="season-history-selector"
                  value={currentSeason.id}
                  onChange={(e) => onSeasonChange && onSeasonChange(e.target.value)}
                  className="bg-transparent font-bold text-[#F2EDE4] focus:outline-none cursor-pointer pr-1"
                >
                  {seasons.map((s) => {
                    const isItemActive = s.id === activeSeasonId || (!activeSeasonId && s.isActive);
                    return (
                      <option key={s.id} value={s.id} className="bg-[#1D1916] text-[#F2EDE4]">
                        {s.title} {isItemActive ? '★ (Active Season)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Active Season Button / Indicator */}
              {isCurrentlyActiveSeason ? (
                <div
                  id="badge-active-season"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-300 shadow-sm"
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
                  id="btn-set-active-season"
                  type="button"
                  onClick={() => onSetActiveSeason && onSetActiveSeason(currentSeason.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 hover:text-amber-100 transition-all cursor-pointer shadow-sm active:scale-95"
                  title={`Klik untuk menentukan dan mengaktifkan ${currentSeason.title} sebagai Active Season`}
                >
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Aktifkan Season Ini</span>
                </button>
              )}

              <span className="flex items-center gap-1 text-xs text-[#9C948A]">
                <Calendar size={13} className="text-[#E8B33D]" />
                {currentSeason.dateStr}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#F2EDE4]">
              {currentSeason.title}
            </h2>
            <p className="text-xs text-[#9C948A] max-w-2xl leading-relaxed">
              Papan klasemen performa individu resmi Laga Amal MLBB Pantos. Dihitung berdasarkan perolehan Medali Coklat, Silver, Antam (Gold), dan Gelar MVP.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-import-csv-laga-amal"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-2 text-xs font-semibold text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors shadow-xs cursor-pointer"
            >
              <Upload size={14} />
              <span>Import / Sync CSV</span>
            </button>

            {isAdmin && (
              <button
                id="btn-create-new-season"
                onClick={openNewSeasonModal}
                className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs font-semibold text-[#F2EDE4] hover:bg-[#2d2621] transition-colors cursor-pointer"
              >
                <Plus size={14} className="text-[#E8B33D]" />
                <span>+ Season Baru</span>
              </button>
            )}

            {isAdmin && onDeleteSeason && (
              showDeleteSeasonConfirm ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/50 p-1">
                  <span className="text-xs font-semibold text-red-300 pl-1">Hapus klasemen ini?</span>
                  <button
                    id="btn-confirm-delete-season"
                    onClick={async () => {
                      setIsDeletingSeason(true);
                      try {
                        await onDeleteSeason(currentSeason.id);
                      } finally {
                        setIsDeletingSeason(false);
                        setShowDeleteSeasonConfirm(false);
                      }
                    }}
                    disabled={isDeletingSeason}
                    className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>{isDeletingSeason ? 'Menghapus...' : 'Ya, Hapus'}</span>
                  </button>
                  <button
                    id="btn-cancel-delete-season"
                    onClick={() => setShowDeleteSeasonConfirm(false)}
                    disabled={isDeletingSeason}
                    className="rounded-md border border-[#332C25] bg-[#1D1916] px-2 py-1 text-xs text-[#9C948A] hover:text-[#F2EDE4] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  id="btn-delete-season"
                  onClick={() => setShowDeleteSeasonConfirm(true)}
                  disabled={seasons.length <= 1}
                  title={
                    seasons.length <= 1
                      ? 'Tidak bisa menghapus satu-satunya season yang tersisa'
                      : `Hapus klasemen ${currentSeason.title}`
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  <span>Hapus Klasemen</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* 7 KPI Ribbon Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {/* Active Players */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <Users size={12} className="text-[#E8B33D]" />
              <span>Active Player</span>
            </div>
            <span className="text-xl font-black text-[#F2EDE4]">{currentSeason.activePlayersCount}</span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Peserta Terdaftar</span>
          </div>

          {/* Top Coklat */}
          <div className="rounded-xl border border-[#6B4226]/40 bg-[#2A1D15] p-3 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#b8764a] uppercase tracking-wider mb-1.5">
              <span>🍫 Top Coklat</span>
            </div>
            <PlayerAvatar name={currentSeason.topCoklat.player} size="sm" className="mb-1" />
            <span className="text-xs font-bold text-[#F2EDE4] block truncate w-full" title={currentSeason.topCoklat.player}>
              {currentSeason.topCoklat.player}
            </span>
            <span className="text-[10px] font-semibold text-[#b8764a] mt-0.5 block">
              {currentSeason.topCoklat.count}x Coklat
            </span>
          </div>

          {/* Top Silver */}
          <div className="rounded-xl border border-[#7D766D]/40 bg-[#1D1B19] p-3 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#B9B2A8] uppercase tracking-wider mb-1.5">
              <span>🥈 Top Silver</span>
            </div>
            <PlayerAvatar name={currentSeason.topSilver.player} size="sm" className="mb-1" />
            <span className="text-xs font-bold text-[#F2EDE4] block truncate w-full" title={currentSeason.topSilver.player}>
              {currentSeason.topSilver.player}
            </span>
            <span className="text-[10px] font-semibold text-[#B9B2A8] mt-0.5 block">
              {currentSeason.topSilver.count}x Silver
            </span>
          </div>

          {/* Top Antam */}
          <div className="rounded-xl border border-[#D8A93A]/40 bg-[#251E17] p-3 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#D8A93A] uppercase tracking-wider mb-1.5">
              <span>🥇 Top Antam</span>
            </div>
            <PlayerAvatar name={currentSeason.topAntam.player} size="sm" className="mb-1" />
            <span className="text-xs font-bold text-[#F2EDE4] block truncate w-full" title={currentSeason.topAntam.player}>
              {currentSeason.topAntam.player}
            </span>
            <span className="text-[10px] font-semibold text-[#D8A93A] mt-0.5 block">
              {currentSeason.topAntam.count}x Gold
            </span>
          </div>

          {/* Top MVP */}
          <div className="rounded-xl border border-[#E8B33D]/40 bg-[#2A2218] p-3 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#E8B33D] uppercase tracking-wider mb-1.5">
              <span>👑 Top MVP</span>
            </div>
            <PlayerAvatar name={currentSeason.topMvp.player} size="sm" className="mb-1" />
            <span className="text-xs font-bold text-[#F2EDE4] block truncate w-full" title={currentSeason.topMvp.player}>
              {currentSeason.topMvp.player}
            </span>
            <span className="text-[10px] font-semibold text-[#E8B33D] mt-0.5 block">
              {currentSeason.topMvp.count}x MVP
            </span>
          </div>

          {/* Total Matches */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <Flame size={12} className="text-rose-400" />
              <span>Total Laga</span>
            </div>
            <span className="text-xl font-black text-[#F2EDE4]">{currentSeason.totalMatchesRecorded}</span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Match Terdata</span>
          </div>

          {/* Average Winrate & Score */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <Trophy size={12} className="text-emerald-400" />
              <span>Rata-Rata</span>
            </div>
            <span className="text-xl font-black text-emerald-400">{currentSeason.averageWinRate}%</span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Skor: {currentSeason.averageScore}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs: Mobile scrollable */}
      <div className="flex items-center justify-between border-b border-[#332C25] pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="tab-laga-amal-standings"
            onClick={() => setActiveSubTab('standings')}
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] ${
              activeSubTab === 'standings'
                ? 'bg-[#E8B33D] text-[#161311] shadow-md font-black'
                : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
            }`}
          >
            <Trophy size={15} className="shrink-0" />
            <span>Klasemen Pemain ({filteredPlayers.length})</span>
          </button>
          <button
            id="tab-laga-amal-heropicks"
            onClick={() => setActiveSubTab('heroPicks')}
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] ${
              activeSubTab === 'heroPicks'
                ? 'bg-[#E8B33D] text-[#161311] shadow-md font-black'
                : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
            }`}
          >
            <BarChart3 size={15} className="shrink-0" />
            <span>Hero Picks ({currentSeason.heroPicks?.length || 0})</span>
          </button>
          <button
            id="tab-laga-amal-heropool"
            onClick={() => setActiveSubTab('heroPool')}
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] ${
              activeSubTab === 'heroPool'
                ? 'bg-[#E8B33D] text-[#161311] shadow-md font-black'
                : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
            }`}
          >
            <Layers size={15} className="shrink-0" />
            <span>Hero Pool ({currentSeason.heroPool?.length || 0})</span>
          </button>
          <button
            id="tab-laga-amal-matchlogs"
            onClick={() => setActiveSubTab('matchLogs')}
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] ${
              activeSubTab === 'matchLogs'
                ? 'bg-[#E8B33D] text-[#161311] shadow-md font-black'
                : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
            }`}
          >
            <FileText size={15} className="shrink-0" />
            <span>Log Match ({currentSeason.matchLogs?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: STANDINGS */}
      {activeSubTab === 'standings' && (
        <div className="space-y-4">
          {/* Search bar & View mode toggle toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C948A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nickname pemain..."
                className="w-full rounded-xl border border-[#332C25] bg-[#1D1916] pl-9 pr-4 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="text-[11px] sm:text-xs text-[#9C948A]">
                <span>Sort: <strong className="text-[#E8B33D] uppercase">{sortField}</strong> ({sortAsc ? '▲' : '▼'})</span>
              </div>

              {/* View Mode Switcher: Cards (User-friendly Mobile) vs Table */}
              <div className="flex items-center gap-1 rounded-xl border border-[#332C25] bg-[#141210] p-1 shadow-inner">
                <button
                  type="button"
                  id="btn-view-cards"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-[#E8B33D] text-[#161311] shadow-sm font-black'
                      : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                  }`}
                  title="Tampilan Kartu (Responsif Layar Ponsel)"
                >
                  <LayoutGrid size={13} />
                  <span>Kartu</span>
                </button>
                <button
                  type="button"
                  id="btn-view-table"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[#E8B33D] text-[#161311] shadow-sm font-black'
                      : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                  }`}
                  title="Tampilan Tabel Lengkap"
                >
                  <Table size={13} />
                  <span>Tabel</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: USER-FRIENDLY MOBILE CARDS */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredPlayers.map((player, idx) => {
                const isTopRank = idx === 0 && sortField === 'score' && !sortAsc;
                const isBottomRank = idx === filteredPlayers.length - 1 && sortField === 'score' && !sortAsc;

                return (
                  <div
                    key={`laga-player-card-${player.nickname}-${idx}`}
                    onClick={() => setDetailPlayer(player)}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer shadow-lg relative overflow-hidden active:scale-[0.99] ${
                      isTopRank
                        ? 'border-[#E8B33D]/70 bg-gradient-to-br from-[#2D2316] via-[#1D1916] to-[#161311] ring-1 ring-[#E8B33D]/40'
                        : isBottomRank
                        ? 'border-[#8B4513]/60 bg-gradient-to-br from-[#2B1B14] via-[#1D1916] to-[#161311]'
                        : 'border-[#332C25] bg-[#1D1916] hover:border-[#4A3F33] hover:bg-[#221D19]'
                    }`}
                  >
                    {/* Card Header: Rank Badge, Avatar, Nickname, Tier, Score */}
                    <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-[#332C25]/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                            idx === 0
                              ? 'bg-[#E8B33D] text-[#161311] shadow-md font-black'
                              : idx === 1
                              ? 'bg-[#C5BCAD] text-[#161311] font-black'
                              : idx === 2
                              ? 'bg-[#b8764a] text-[#161311] font-black'
                              : isBottomRank
                              ? 'bg-[#8B4513] text-[#F2EDE4] font-black'
                              : 'bg-[#251F1B] text-[#9C948A] border border-[#332C25] font-bold'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        <PlayerAvatar name={player.nickname} avatarUrl={player.avatar_url} size="sm" />

                        <div className="min-w-0">
                          <div className="font-black text-sm text-[#F2EDE4] truncate group-hover:text-[#E8B33D]">
                            {player.nickname}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9C948A]">
                            <span className="truncate">{player.tier || 'Sepuh Pantos'}</span>
                            <span>·</span>
                            <span className="text-emerald-400 font-bold">{player.winRate}% WR</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Score Highlight */}
                      <div className="text-right shrink-0 bg-[#E8B33D]/10 border border-[#E8B33D]/30 px-2.5 py-1 rounded-xl">
                        <span className="text-[9px] text-[#9C948A] block uppercase font-bold leading-none">Skor</span>
                        <span className="text-base font-black text-[#E8B33D] leading-tight">
                          {player.score}
                        </span>
                      </div>
                    </div>

                    {/* Medals 4-Grid: Coklat, Silver, Antam, MVP */}
                    <div className="grid grid-cols-4 gap-1.5 pt-3 pb-2 text-center">
                      <div className="rounded-xl bg-[#251A14] border border-[#6B4226]/40 py-1.5 px-1">
                        <span className="text-[9px] sm:text-[10px] text-[#b8764a] block font-bold">🍫 Coklat</span>
                        <span className="text-xs sm:text-sm font-black text-[#b8764a]">{player.coklat}</span>
                      </div>
                      <div className="rounded-xl bg-[#1F1D1B] border border-[#7D766D]/40 py-1.5 px-1">
                        <span className="text-[9px] sm:text-[10px] text-[#B9B2A8] block font-bold">🥈 Silver</span>
                        <span className="text-xs sm:text-sm font-black text-[#B9B2A8]">{player.silver}</span>
                      </div>
                      <div className="rounded-xl bg-[#262016] border border-[#D8A93A]/40 py-1.5 px-1">
                        <span className="text-[9px] sm:text-[10px] text-[#D8A93A] block font-bold">🥇 Antam</span>
                        <span className="text-xs sm:text-sm font-black text-[#D8A93A]">{player.antam}</span>
                      </div>
                      <div className="rounded-xl bg-[#2A2218] border border-[#E8B33D]/50 py-1.5 px-1">
                        <span className="text-[9px] sm:text-[10px] text-[#E8B33D] block font-bold">👑 MVP</span>
                        <span className="text-xs sm:text-sm font-black text-[#E8B33D]">{player.mvp}</span>
                      </div>
                    </div>

                    {/* Footer Stats: Matches and Average Score */}
                    <div className="flex items-center justify-between text-[11px] text-[#9C948A] pt-2 border-t border-[#332C25]/40">
                      <span>{player.matches} Pertandingan</span>
                      <span>Rata-rata: <strong className="text-[#F2EDE4] font-bold">{player.avgScore}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW MODE 2: TABLE WITH STICKY COLUMNS FOR MOBILE */
            <div className="overflow-x-auto rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-md">
              <table className="w-full text-left text-xs text-[#F2EDE4]">
                <thead className="border-b border-[#332C25] bg-[#161311] text-[11px] uppercase tracking-wider text-[#9C948A]">
                  <tr>
                    {/* Sticky Rank Header */}
                    <th className="sticky left-0 bg-[#161311] z-20 py-3.5 pl-3 pr-2 text-center w-12 border-r border-[#332C25]/40">
                      #
                    </th>
                    {/* Sticky Player Name Header */}
                    <th className="sticky left-12 bg-[#161311] z-20 py-3.5 px-3 min-w-[130px] sm:min-w-[160px] border-r border-[#332C25] shadow-[4px_0_8px_rgba(0,0,0,0.4)]">
                      Pemain
                    </th>
                    <th
                      onClick={() => handleSort('coklat')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#b8764a]"
                      title="Medali Coklat (Semen)"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Coklat</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('silver')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#B9B2A8]"
                      title="Medali Silver"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Silver</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('antam')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#D8A93A]"
                      title="Medali Antam (Gold)"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Antam</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('mvp')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#E8B33D]"
                      title="Gelar MVP"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>MVP</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('matches')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#F2EDE4]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Match</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('score')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-[#E8B33D] font-black text-[#E8B33D]"
                      title="Total Skor"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Skor</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('winRate')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-emerald-400"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>WR%</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('avgScore')}
                      className="py-3.5 pr-4 pl-3 text-center cursor-pointer hover:text-amber-300"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>AVG</span>
                        <ArrowUpDown size={11} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#332C25]/60 font-medium">
                  {filteredPlayers.map((player, idx) => {
                    const isTopRank = idx === 0 && sortField === 'score' && !sortAsc;
                    const isBottomRank = idx === filteredPlayers.length - 1 && sortField === 'score' && !sortAsc;

                    return (
                      <tr
                        key={`laga-table-row-${player.nickname}-${idx}`}
                        onClick={() => setDetailPlayer(player)}
                        className="group transition-colors hover:bg-[#241F1B] cursor-pointer"
                      >
                        {/* Sticky Rank Column */}
                        <td className="sticky left-0 bg-[#1D1916] group-hover:bg-[#241F1B] z-10 py-3 pl-3 pr-2 text-center border-r border-[#332C25]/40 transition-colors">
                          {isTopRank ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8B33D]/20 text-xs font-black text-[#E8B33D]">
                              1
                            </span>
                          ) : isBottomRank ? (
                            <span
                              title="Penghuni Kelas Semen"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6B4226]/40 text-xs font-bold text-[#b8764a]"
                            >
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-[#9C948A] text-xs font-semibold">{idx + 1}</span>
                          )}
                        </td>

                        {/* Sticky Player Name Column */}
                        <td className="sticky left-12 bg-[#1D1916] group-hover:bg-[#241F1B] z-10 py-3 px-3 border-r border-[#332C25] shadow-[4px_0_8px_rgba(0,0,0,0.4)] transition-colors">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              name={player.nickname}
                              avatarUrl={player.avatar_url}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-[#F2EDE4] group-hover:text-[#E8B33D] transition-colors truncate block">
                                {player.nickname}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Medals & Stats */}
                        <td className="py-3 px-3 text-center font-semibold text-[#b8764a]">
                          {player.coklat}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#B9B2A8]">
                          {player.silver}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#D8A93A]">
                          {player.antam}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-[#E8B33D]">
                          {player.mvp}
                        </td>

                        {/* Matches */}
                        <td className="py-3 px-3 text-center font-bold text-[#F2EDE4]">
                          {player.matches}
                        </td>

                        {/* Total Score */}
                        <td className="py-3 px-3 text-center font-black text-sm text-[#E8B33D]">
                          {player.score}
                        </td>

                        {/* Win Rate */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-400">
                          {player.winRate}%
                        </td>

                        {/* AVG Score */}
                        <td className="py-3 pr-4 pl-3 text-center font-bold text-amber-300">
                          {player.avgScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: HERO PICKS */}
      {activeSubTab === 'heroPicks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-[#E8B33D]" />
              <span className="text-xs text-[#9C948A]">Filter Pemain:</span>
              <select
                value={selectedPlayerFilter}
                onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                className="rounded-xl border border-[#332C25] bg-[#1D1916] px-3 py-1.5 text-xs font-semibold text-[#F2EDE4] focus:outline-none"
              >
                <option value="all">Semua Pemain ({currentSeason.heroPicks?.length || 0})</option>
                {currentSeason.heroPicks?.map((hp, idx) => (
                  <option key={`hp-opt-${hp.user}-${idx}`} value={hp.user}>
                    {hp.user}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHeroPicks.map((hp, idx) => (
              <div
                key={`hp-user-card-${hp.user}-${idx}`}
                className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-[#332C25] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar name={hp.user} size="sm" />
                    <div>
                      <h4 className="font-bold text-sm text-[#F2EDE4]">{hp.user}</h4>
                      <span className="text-[10px] text-[#9C948A]">
                        {hp.heroes.length} Hero Dimainkan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {hp.heroes.map((h, i) => (
                    <div key={`hero-pct-${h.heroName}-${i}`} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <HeroAvatar heroName={h.heroName} size="xs" shape="rounded" />
                        <span className="font-medium text-[#F2EDE4]">{h.heroName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-[#251E17] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E8B33D] rounded-full"
                            style={{ width: `${Math.min(100, h.percentage)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-[#E8B33D] w-10 text-right">
                          {h.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HERO POOL */}
      {activeSubTab === 'heroPool' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(currentSeason.heroPool || []).map((item, idx) => (
              <div
                key={`pool-${item.heroName}-${idx}`}
                className="rounded-xl border border-[#332C25] bg-[#1D1916] p-3 text-center space-y-2 hover:border-[#E8B33D]/50 transition-all"
              >
                <HeroAvatar heroName={item.heroName} size="md" shape="rounded" className="mx-auto" />
                <div>
                  <h4 className="font-bold text-xs text-[#F2EDE4] truncate">{item.heroName}</h4>
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-[#9C948A]">
                    <span className="font-bold text-[#E8B33D]">{item.timesPicked}x</span>
                    <span>Pick ({item.percentage}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LOG MATCH */}
      {activeSubTab === 'matchLogs' && (
        <div className="space-y-3">
          {(currentSeason.matchLogs || []).map((log, index) => {
            const displayNum =
              typeof log.matchNumber === 'number' && log.matchNumber > 0 && log.matchNumber < 1000000
                ? log.matchNumber
                : (currentSeason.matchLogs?.length || 0) - index;

            return (
              <div
                key={`${log.matchNumber}-${index}`}
                className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#E8B33D]/20 px-2 py-0.5 text-[11px] font-bold text-[#E8B33D]">
                      Match #{displayNum}
                    </span>
                    <span className="text-xs text-[#9C948A]">{log.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#F2EDE4]">
                    <span>Pemenang:</span>
                    <span className="text-emerald-400">{log.winner}</span>
                  </div>
                </div>

              <div className="flex items-center gap-3 text-xs">
                {log.pohonMvp && (
                  <div className="rounded-lg bg-[#241F1B] px-3 py-1.5 border border-[#332C25]">
                    <span className="text-[10px] text-[#9C948A] block">MVP Pohon</span>
                    <span className="font-bold text-[#E8B33D]">{log.pohonMvp}</span>
                  </div>
                )}
                {log.lobbyMvp && (
                  <div className="rounded-lg bg-[#241F1B] px-3 py-1.5 border border-[#332C25]">
                    <span className="text-[10px] text-[#9C948A] block">MVP Lobby</span>
                    <span className="font-bold text-[#E8B33D]">{log.lobbyMvp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* PLAYER DETAIL MODAL */}
      {detailPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={detailPlayer.nickname} size="lg" />
                <div>
                  <h3 className="text-base font-bold text-[#F2EDE4]">{detailPlayer.nickname}</h3>
                  <span className="text-xs text-[#9C948A]">
                    Statistik di {currentSeason.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailPlayer(null)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-[#2A1D15] p-2 border border-[#6B4226]/40">
                <div className="text-base font-black text-[#b8764a]">{detailPlayer.coklat}</div>
                <div className="text-[10px] text-[#9C948A]">Coklat</div>
              </div>
              <div className="rounded-lg bg-[#211E1B] p-2 border border-[#7D766D]/40">
                <div className="text-base font-black text-[#B9B2A8]">{detailPlayer.silver}</div>
                <div className="text-[10px] text-[#9C948A]">Silver</div>
              </div>
              <div className="rounded-lg bg-[#251E17] p-2 border border-[#D8A93A]/40">
                <div className="text-base font-black text-[#D8A93A]">{detailPlayer.antam}</div>
                <div className="text-[10px] text-[#9C948A]">Antam</div>
              </div>
              <div className="rounded-lg bg-[#2A2218] p-2 border border-[#E8B33D]/40">
                <div className="text-base font-black text-[#E8B33D]">{detailPlayer.mvp}</div>
                <div className="text-[10px] text-[#9C948A]">MVP</div>
              </div>
            </div>

            <div className="rounded-xl bg-[#161311] p-3.5 border border-[#332C25] space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Total Match:</span>
                <span className="font-bold text-[#F2EDE4]">{detailPlayer.matches} Pertandingan</span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Total Skor Musim:</span>
                <span className="font-black text-[#E8B33D]">{detailPlayer.score}</span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>Win Rate:</span>
                <span className="font-bold text-emerald-400">{detailPlayer.winRate}%</span>
              </div>
              <div className="flex justify-between items-center text-[#9C948A]">
                <span>AVG Score per Match:</span>
                <span className="font-bold text-amber-300">{detailPlayer.avgScore}</span>
              </div>
            </div>

            {/* Action to view full profile */}
            {onViewPlayerProfile && (
              <button
                onClick={() => {
                  onViewPlayerProfile(detailPlayer.nickname);
                  setDetailPlayer(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E8B33D] px-4 py-2.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer"
              >
                <span>Buka Profil Lengkap & Riwayat Hero</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* NEW SEASON MODAL */}
      {isNewSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[#E8B33D]" />
                <h3 className="text-base font-bold text-[#F2EDE4]">Buat Musim / Season Baru</h3>
              </div>
              <button
                onClick={() => setIsNewSeasonModalOpen(false)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">Nomor Season:</label>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#161311] border border-[#332C25] px-3 py-2 font-bold text-[#E8B33D]">S</span>
                  <input
                    type="number"
                    min={1}
                    value={newSeasonNumber}
                    onChange={(e) => setNewSeasonNumber(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    value={newSeasonStartDate}
                    onChange={(e) => setNewSeasonStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[#9C948A] font-semibold mb-1">Tanggal Selesai:</label>
                  <input
                    type="date"
                    value={newSeasonEndDate}
                    min={newSeasonStartDate || undefined}
                    onChange={(e) => setNewSeasonEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Live preview of the auto-generated title & date so admins
                  can see exactly what will be created before confirming. */}
              <div className="rounded-xl border border-[#E8B33D]/30 bg-[#E8B33D]/5 p-3 space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-[#9C948A]">Pratinjau</div>
                <div className="font-bold text-sm text-[#F2EDE4]">{newSeasonPreviewTitle}</div>
                <div className="text-[#E8B33D] font-medium">{newSeasonPreviewDate}</div>
              </div>

              {newSeasonError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-2.5 text-[#F2EDE4]">
                  <AlertCircle size={14} className="shrink-0 text-red-400" />
                  <span>{newSeasonError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewSeasonModalOpen(false)}
                className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleCreateNewSeason}
                className="rounded-xl bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer"
              >
                Buat Season
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-[#E8B33D]" />
                <h3 className="text-base font-bold text-[#F2EDE4]">Import CSV Klasemen</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#9C948A]">
              Tempel teks CSV hasil ekspor spreadsheet dengan format kolom:<br />
              <code className="text-[#E8B33D] font-mono">Nickname, Coklat, Silver, Antam, MVP, Matches, Score, WinRate, AvgScore</code>
            </p>

            <textarea
              rows={8}
              value={csvInputText}
              onChange={(e) => setCsvInputText(e.target.value)}
              placeholder={`LAH MANDOOR,0,1,4,11,16,51.0,93.8%,3.19\nDignityzed,0,2,4,8,14,40.0,85.7%,2.86`}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] p-3 text-xs font-mono text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
            />

            {importError && (
              <div className="rounded-xl border border-rose-800/40 bg-rose-950/50 p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/50 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>Berhasil mengimpor data klasemen musim!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handleImportCsv}
                className="rounded-xl bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer"
              >
                Terapkan CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
