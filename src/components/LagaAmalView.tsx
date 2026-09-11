import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Crown,
  Shield,
  Upload,
  Download,
  Search,
  Filter,
  Users,
  Swords,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Flame,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { LagaAmalSeasonData, LagaAmalPlayerStat, LagaAmalHeroPick } from '../types';
import { INITIAL_LAGA_AMAL_S41, parseLagaAmalCsv, exportLagaAmalCsv } from '../data/lagaAmalS41Data';

type SubTab = 'standings' | 'heroPicks' | 'heroPool' | 'matchLogs';
type SortField = 'score' | 'mvp' | 'antam' | 'silver' | 'coklat' | 'matches' | 'winRate' | 'avgScore';

export const LagaAmalView: React.FC = () => {
  const [seasonData, setSeasonData] = useState<LagaAmalSeasonData>(() => {
    const saved = localStorage.getItem('pantos_laga_amal_s41');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse cached season data:', e);
      }
    }
    return INITIAL_LAGA_AMAL_S41;
  });

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

  // Selected player detail modal
  const [detailPlayer, setDetailPlayer] = useState<LagaAmalPlayerStat | null>(null);

  // Load from backend on mount if available
  React.useEffect(() => {
    fetch('/api/laga-amal')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const s41 = data.find((s) => s.id === 's41') || data[0];
          setSeasonData(s41);
          localStorage.setItem('pantos_laga_amal_s41', JSON.stringify(s41));
        }
      })
      .catch((err) => console.warn('Could not load from API, using cached/seed:', err));
  }, []);

  // Save to localStorage & backend when seasonData changes
  const updateSeasonData = (newData: LagaAmalSeasonData) => {
    setSeasonData(newData);
    try {
      localStorage.setItem('pantos_laga_amal_s41', JSON.stringify(newData));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    fetch('/api/laga-amal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    }).catch((e) => console.warn('Failed to sync with API:', e));
  };

  // Sort and filter players for standings
  const filteredPlayers = useMemo(() => {
    return seasonData.players
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
  }, [seasonData.players, searchQuery, sortField, sortAsc]);

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
    return seasonData.heroPicksByUser.filter((hp) => {
      const matchesPlayer = selectedPlayerFilter === 'all' || hp.player === selectedPlayerFilter;
      const matchesSearch =
        hp.hero.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hp.player.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlayer && matchesSearch;
    });
  }, [seasonData.heroPicksByUser, selectedPlayerFilter, searchQuery]);

  // Handle CSV Import
  const handleImportCsv = () => {
    if (!csvInputText.trim()) {
      setImportError('Silakan tempel teks CSV terlebih dahulu.');
      return;
    }
    try {
      const parsed = parseLagaAmalCsv(csvInputText);
      if (parsed.players.length === 0) {
        throw new Error('Format CSV tidak dikenali atau tabel pemain kosong.');
      }
      updateSeasonData(parsed);
      setImportSuccess(true);
      setImportError(null);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccess(false);
        setCsvInputText('');
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses file CSV.');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCsvInputText(content);
      }
    };
    reader.readAsText(file);
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const csvContent = exportLagaAmalCsv(seasonData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Klasemen_Laga_Amal_${seasonData.id.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset to seed data
  const handleReset = () => {
    if (confirm('Kembalikan data ke patokan CSV Musim 41 (S41) default?')) {
      updateSeasonData(INITIAL_LAGA_AMAL_S41);
    }
  };

  return (
    <div id="laga-amal-view" className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#332C25] bg-gradient-to-b from-[#241F1B] via-[#1D1916] to-[#161311] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-3 py-0.5 text-xs font-bold text-[#E8B33D]">
                MLBB Season Standings · Musim 41
              </span>
              <span className="flex items-center gap-1 text-xs text-[#9C948A]">
                <Calendar size={13} className="text-[#E8B33D]" />
                {seasonData.dateStr}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#F2EDE4]">
              {seasonData.title}
            </h2>
            <p className="text-xs text-[#9C948A] max-w-2xl leading-relaxed">
              Papan klasemen performa individu resmi Laga Amal MLBB Pantos. Dihitung berdasarkan perolehan Medali Coklat, Silver, Antam (Gold), dan Gelar MVP.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-import-csv-laga-amal"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-2 text-xs font-semibold text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors shadow-xs"
            >
              <Upload size={14} />
              <span>Import / Sync CSV</span>
            </button>
            <button
              id="btn-export-csv-laga-amal"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs font-semibold text-[#F2EDE4] hover:bg-[#2d2621] transition-colors"
            >
              <Download size={14} />
              <span>Unduh CSV</span>
            </button>
            <button
              id="btn-reset-laga-amal"
              onClick={handleReset}
              className="rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-xs text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2d2621] transition-colors"
              title="Reset ke patokan S41"
            >
              Reset S41
            </button>
          </div>
        </div>

        {/* 7 KPI Ribbon Cards (Exact Match from CSV) */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {/* Active Players */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <Users size={12} className="text-[#E8B33D]" />
              <span>Active Player</span>
            </div>
            <span className="text-xl font-black text-[#F2EDE4]">{seasonData.activePlayersCount}</span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Peserta Terdaftar</span>
          </div>

          {/* Top Coklat */}
          <div className="rounded-xl border border-[#6B4226]/40 bg-[#2A1D15] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#b8764a] uppercase tracking-wider mb-1">
              <span>🥉 Top Coklat</span>
            </div>
            <span className="text-xs font-bold text-[#F2EDE4] block truncate" title={seasonData.topCoklat.player}>
              {seasonData.topCoklat.player}
            </span>
            <span className="text-[10px] font-semibold text-[#b8764a] mt-0.5 block">
              {seasonData.topCoklat.count}x Coklat
            </span>
          </div>

          {/* Top Silver */}
          <div className="rounded-xl border border-[#7D766D]/40 bg-[#1D1B19] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#B9B2A8] uppercase tracking-wider mb-1">
              <span>🥈 Top Silver</span>
            </div>
            <span className="text-xs font-bold text-[#F2EDE4] block truncate" title={seasonData.topSilver.player}>
              {seasonData.topSilver.player}
            </span>
            <span className="text-[10px] font-semibold text-[#B9B2A8] mt-0.5 block">
              {seasonData.topSilver.count}x Silver
            </span>
          </div>

          {/* Top Antam */}
          <div className="rounded-xl border border-[#E8B33D]/40 bg-[#252014] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#E8B33D] uppercase tracking-wider mb-1">
              <span>🥇 Top Antam</span>
            </div>
            <span className="text-xs font-bold text-[#F2EDE4] block truncate" title={seasonData.topAntam.player}>
              {seasonData.topAntam.player}
            </span>
            <span className="text-[10px] font-semibold text-[#E8B33D] mt-0.5 block">
              {seasonData.topAntam.count}x Gold
            </span>
          </div>

          {/* Top MVP */}
          <div className="rounded-xl border border-amber-500/50 bg-[#2D2111] p-3 text-center shadow-xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Crown size={12} className="text-amber-400" />
              <span>MVP 👑</span>
            </div>
            <span className="text-xs font-black text-[#F2EDE4] block truncate" title={seasonData.topMvp.player}>
              {seasonData.topMvp.player}
            </span>
            <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">
              {seasonData.topMvp.count}x MVP
            </span>
          </div>

          {/* Total Matches */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <Swords size={12} className="text-[#E8B33D]" />
              <span>Total Match</span>
            </div>
            <span className="text-xl font-black text-[#F2EDE4]">{seasonData.totalMatches}</span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Pertandingan</span>
          </div>

          {/* Total Score */}
          <div className="rounded-xl border border-[#332C25] bg-[#191513] p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#9C948A] uppercase tracking-wider mb-1">
              <BarChart3 size={12} className="text-[#E8B33D]" />
              <span>Total Score</span>
            </div>
            <span className="text-base font-black text-[#E8B33D] block truncate">
              {seasonData.totalScore.toLocaleString()}
            </span>
            <span className="block text-[10px] text-[#9C948A] mt-0.5">Rerata: 7.54</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs & Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#332C25] bg-[#1D1916] p-1">
          <button
            id="tab-laga-amal-standings"
            onClick={() => setActiveSubTab('standings')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'standings'
                ? 'bg-[#E8B33D] text-[#161311] shadow-xs'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Trophy size={13} />
            <span>Klasemen Individu ({seasonData.players.length})</span>
          </button>

          <button
            id="tab-laga-amal-hero-picks"
            onClick={() => setActiveSubTab('heroPicks')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'heroPicks'
                ? 'bg-[#E8B33D] text-[#161311] shadow-xs'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <Flame size={13} />
            <span>Hero Pick by User</span>
          </button>

          <button
            id="tab-laga-amal-hero-pool"
            onClick={() => setActiveSubTab('heroPool')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'heroPool'
                ? 'bg-[#E8B33D] text-[#161311] shadow-xs'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <BarChart3 size={13} />
            <span>Master Hero Pool ({seasonData.heroPool.length})</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C948A]" />
          <input
            type="text"
            placeholder={activeSubTab === 'heroPool' ? 'Cari nama hero...' : 'Cari pemain atau hero...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#332C25] bg-[#1D1916] pl-8 pr-3 py-1.5 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: KLASEMEN UTAMA */}
      {activeSubTab === 'standings' && (
        <div className="overflow-hidden rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#332C25] bg-[#241F1B] text-[11px] font-bold text-[#9C948A] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">Nickname</th>
                  <th
                    onClick={() => handleSort('coklat')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1 text-[#b8764a]">
                      <span>Coklat 🥉</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('silver')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1 text-[#B9B2A8]">
                      <span>Silver 🥈</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('antam')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1 text-[#E8B33D]">
                      <span>Antam 🥇</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('mvp')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      <span>MVP 👑</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('matches')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Ikut Main</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('score')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-end gap-1 text-[#E8B33D]">
                      <span>Total Score</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('winRate')}
                    className="py-3 px-2 text-center cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                      <span>Win Rate</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('avgScore')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#F2EDE4]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>AVG Score</span>
                      <ArrowUpDown size={10} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#332C25]/50 font-medium">
                {filteredPlayers.map((player, idx) => {
                  const isTop1 = idx === 0 && sortField === 'score' && !sortAsc;
                  const isTop2 = idx === 1 && sortField === 'score' && !sortAsc;
                  const isTop3 = idx === 2 && sortField === 'score' && !sortAsc;

                  return (
                    <tr
                      key={player.nickname}
                      onClick={() => setDetailPlayer(player)}
                      className="cursor-pointer transition-colors hover:bg-[#241F1B]/80 group"
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center font-bold">
                        {isTop1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8B33D] text-[#161311] font-black text-xs shadow-xs">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#B9B2A8] text-[#161311] font-black text-xs">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#C97A3D] text-[#161311] font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-[#9C948A]">{idx + 1}</span>
                        )}
                      </td>

                      {/* Nickname */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#F2EDE4] group-hover:text-[#E8B33D] transition-colors">
                            {player.nickname}
                          </span>
                          {player.mvp >= 20 && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              MVP King
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coklat */}
                      <td className="py-3 px-2 text-center font-semibold text-[#b8764a]">
                        {player.coklat}
                      </td>

                      {/* Silver */}
                      <td className="py-3 px-2 text-center font-semibold text-[#B9B2A8]">
                        {player.silver}
                      </td>

                      {/* Antam */}
                      <td className="py-3 px-2 text-center font-bold text-[#E8B33D]">
                        {player.antam}
                      </td>

                      {/* MVP */}
                      <td className="py-3 px-2 text-center font-black text-amber-400">
                        {player.mvp}
                      </td>

                      {/* Ikut Main */}
                      <td className="py-3 px-2 text-center text-[#F2EDE4]">
                        {player.matches}
                      </td>

                      {/* Total Score */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-[#E8B33D]">
                        {player.score.toFixed(1)}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3 px-2 text-center font-semibold text-emerald-400">
                        {player.winRate.toFixed(1)}%
                      </td>

                      {/* AVG Score */}
                      <td className="py-3 px-3 text-right font-mono text-[#D8D0C5]">
                        {player.avgScore.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total Summary Footer Row */}
              <tfoot className="border-t-2 border-[#332C25] bg-[#191513] font-bold text-xs">
                <tr>
                  <td className="py-3 px-3 text-center text-[#E8B33D]">Σ</td>
                  <td className="py-3 px-3 text-[#F2EDE4]">Total Result</td>
                  <td className="py-3 px-2 text-center text-[#b8764a]">38</td>
                  <td className="py-3 px-2 text-center text-[#B9B2A8]">282</td>
                  <td className="py-3 px-2 text-center text-[#E8B33D]">316</td>
                  <td className="py-3 px-2 text-center text-amber-400">151</td>
                  <td className="py-3 px-2 text-center text-[#F2EDE4]">787</td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-[#E8B33D]">5,934.1</td>
                  <td className="py-3 px-2 text-center text-emerald-400">49.94%</td>
                  <td className="py-3 px-3 text-right font-mono text-[#D8D0C5]">7.54</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MOST HERO PICK BY USER */}
      {activeSubTab === 'heroPicks' && (
        <div className="space-y-4">
          {/* Player Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-[#9C948A] whitespace-nowrap pl-1">
              Filter Pemain:
            </span>
            <button
              onClick={() => setSelectedPlayerFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedPlayerFilter === 'all'
                  ? 'bg-[#E8B33D] text-[#161311]'
                  : 'bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
            >
              Semua ({seasonData.heroPicksByUser.length})
            </button>
            {seasonData.players.map((p) => (
              <button
                key={p.nickname}
                onClick={() => setSelectedPlayerFilter(p.nickname)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedPlayerFilter === p.nickname
                    ? 'bg-[#E8B33D] text-[#161311]'
                    : 'bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                {p.nickname}
              </button>
            ))}
          </div>

          {/* Hero Picks Table */}
          <div className="overflow-hidden rounded-2xl border border-[#332C25] bg-[#1D1916] shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#332C25] bg-[#241F1B] text-[11px] font-bold text-[#9C948A] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Pemain</th>
                    <th className="py-3 px-4">Hero</th>
                    <th className="py-3 px-3 text-center text-[#b8764a]">1. Coklat 🥉</th>
                    <th className="py-3 px-3 text-center text-[#B9B2A8]">2. Silver 🥈</th>
                    <th className="py-3 px-3 text-center text-[#E8B33D]">3. Antam 🥇</th>
                    <th className="py-3 px-3 text-center text-amber-400">4. MVP 👑</th>
                    <th className="py-3 px-4 text-center font-bold text-[#F2EDE4]">Total Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#332C25]/50">
                  {filteredHeroPicks.map((pick, i) => (
                    <tr key={`${pick.player}-${pick.hero}-${i}`} className="hover:bg-[#241F1B]/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#F2EDE4]">{pick.player}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-[#E8B33D]">{pick.hero}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#b8764a]">
                        {pick.coklat > 0 ? pick.coklat : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#B9B2A8]">
                        {pick.silver > 0 ? pick.silver : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#E8B33D]">
                        {pick.antam > 0 ? pick.antam : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-amber-400">
                        {pick.mvp > 0 ? pick.mvp : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="rounded-md bg-[#241F1B] px-2 py-0.5 font-mono font-bold text-xs text-[#F2EDE4] border border-[#332C25]">
                          {pick.total} Main
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MASTER HERO POOL */}
      {activeSubTab === 'heroPool' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-sm text-[#F2EDE4] block">Distribusi Pool Hero Musim 41</span>
              <span className="text-[#9C948A]">
                Total Hero Terdaftar di MLBB Pool: <strong className="text-[#E8B33D]">129 Hero</strong> · Hero Pernah Di-pick: <strong className="text-emerald-400">{seasonData.heroPool.filter(h => h.picked > 0).length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-400 font-semibold text-[11px]">
                Top Meta: Novaria & Selena (27 Picks)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {seasonData.heroPool
              .filter((h) => h.hero.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((h, index) => {
                const isTopPick = h.picked >= 10;
                return (
                  <div
                    key={h.hero}
                    className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                      isTopPick
                        ? 'border-[#E8B33D]/40 bg-[#252014]'
                        : h.picked > 0
                        ? 'border-[#332C25] bg-[#1D1916]'
                        : 'border-[#332C25]/40 bg-[#161311] opacity-60'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-[#F2EDE4] block truncate">
                        {h.hero}
                      </span>
                      <span className="text-[10px] text-[#9C948A]">
                        #{index + 1}
                      </span>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-mono font-bold ${
                        isTopPick
                          ? 'bg-[#E8B33D] text-[#161311]'
                          : h.picked > 0
                          ? 'bg-[#241F1B] text-[#E8B33D] border border-[#332C25]'
                          : 'bg-[#241F1B] text-[#9C948A]'
                      }`}
                    >
                      {h.picked}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#332C25] bg-[#1D1916] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8B33D]/20 text-[#E8B33D]">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#F2EDE4]">
                    Import Data Klasemen Laga Amal (CSV)
                  </h3>
                  <p className="text-xs text-[#9C948A]">
                    Format otomatis mendeteksi sheet "KELASEMEN LAGA AMAL"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* File input */}
              <div>
                <label className="block text-xs font-bold text-[#9C948A] uppercase mb-1.5">
                  Unggah File .CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[#9C948A] file:mr-3 file:rounded-lg file:border-0 file:bg-[#241F1B] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#F2EDE4] hover:file:bg-[#2d2621]"
                />
              </div>

              {/* Textarea for pasting */}
              <div>
                <label className="block text-xs font-bold text-[#9C948A] uppercase mb-1.5">
                  Atau Tempel (Paste) Konten CSV:
                </label>
                <textarea
                  rows={8}
                  placeholder="Tempel teks CSV di sini..."
                  value={csvInputText}
                  onChange={(e) => setCsvInputText(e.target.value)}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] p-3 font-mono text-[11px] text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Status messages */}
              {importError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700/50 p-2.5 text-xs text-red-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-900/30 border border-emerald-700/50 p-2.5 text-xs text-emerald-200">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>Data klasemen berhasil diperbarui dari CSV!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-lg border border-[#332C25] bg-[#241F1B] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#2d2621] hover:text-[#F2EDE4]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  className="rounded-lg bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#e0a82b] transition-colors shadow-xs"
                >
                  Proses & Sinkronkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Hero Profile Modal */}
      {detailPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-[#332C25] bg-[#1D1916] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <div>
                <span className="text-xs font-bold text-[#E8B33D] uppercase">
                  Rincian Performa Pemain · S41
                </span>
                <h3 className="text-lg font-black text-[#F2EDE4]">{detailPlayer.nickname}</h3>
              </div>
              <button
                onClick={() => setDetailPlayer(null)}
                className="rounded-lg p-1 text-[#9C948A] hover:bg-[#241F1B] hover:text-[#F2EDE4]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-2.5">
                  <span className="text-[10px] text-[#9C948A] block">Ikut Main</span>
                  <span className="text-base font-black text-[#F2EDE4]">{detailPlayer.matches}</span>
                </div>
                <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-2.5">
                  <span className="text-[10px] text-[#9C948A] block">Total Score</span>
                  <span className="text-base font-black text-[#E8B33D]">{detailPlayer.score.toFixed(1)}</span>
                </div>
                <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-2.5">
                  <span className="text-[10px] text-[#9C948A] block">Win Rate</span>
                  <span className="text-base font-black text-emerald-400">{detailPlayer.winRate.toFixed(1)}%</span>
                </div>
                <div className="rounded-xl border border-[#332C25] bg-[#241F1B] p-2.5">
                  <span className="text-[10px] text-[#9C948A] block">AVG Score</span>
                  <span className="text-base font-black text-[#D8D0C5]">{detailPlayer.avgScore.toFixed(2)}</span>
                </div>
              </div>

              {/* Medals */}
              <div className="flex items-center justify-around rounded-xl border border-[#332C25] bg-[#191513] p-3 text-xs">
                <div className="text-center">
                  <span className="text-[#b8764a] font-semibold block">🥉 Coklat</span>
                  <span className="font-bold text-sm text-[#F2EDE4]">{detailPlayer.coklat}</span>
                </div>
                <div className="text-center">
                  <span className="text-[#B9B2A8] font-semibold block">🥈 Silver</span>
                  <span className="font-bold text-sm text-[#F2EDE4]">{detailPlayer.silver}</span>
                </div>
                <div className="text-center">
                  <span className="text-[#E8B33D] font-semibold block">🥇 Antam</span>
                  <span className="font-bold text-sm text-[#F2EDE4]">{detailPlayer.antam}</span>
                </div>
                <div className="text-center">
                  <span className="text-amber-400 font-semibold block">👑 MVP</span>
                  <span className="font-bold text-sm text-[#F2EDE4]">{detailPlayer.mvp}</span>
                </div>
              </div>

              {/* Hero Breakdown List */}
              <div>
                <span className="text-xs font-bold text-[#9C948A] uppercase block mb-2">
                  Hero Dimainkan di S41 ({seasonData.heroPicksByUser.filter(hp => hp.player === detailPlayer.nickname).length} Hero):
                </span>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {seasonData.heroPicksByUser
                    .filter((hp) => hp.player === detailPlayer.nickname)
                    .map((hp) => (
                      <div
                        key={hp.hero}
                        className="flex items-center justify-between rounded-lg border border-[#332C25]/60 bg-[#241F1B] px-3 py-2 text-xs"
                      >
                        <span className="font-bold text-[#F2EDE4]">{hp.hero}</span>
                        <div className="flex items-center gap-2.5 text-[11px]">
                          {hp.mvp > 0 && <span className="text-amber-400 font-bold">{hp.mvp} MVP</span>}
                          {hp.antam > 0 && <span className="text-[#E8B33D] font-semibold">{hp.antam} Antam</span>}
                          {hp.silver > 0 && <span className="text-[#B9B2A8]">{hp.silver} Silver</span>}
                          {hp.coklat > 0 && <span className="text-[#b8764a]">{hp.coklat} Coklat</span>}
                          <span className="rounded bg-[#1D1916] px-1.5 py-0.5 font-mono text-[10px] text-[#9C948A]">
                            Total: {hp.total}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
