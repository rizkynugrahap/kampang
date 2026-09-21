import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Sparkles,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
  Shield,
  Lock,
  Calendar,
  Layers,
  X,
  Filter,
} from 'lucide-react';
import { Player, Hero, Medal, TeamShort, MatchPlayerDetail, TeamName, Match, LagaAmalSeasonData, MLBB_TIER_OPTIONS } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { SearchableHeroSelect } from './SearchableHeroSelect';
import { calculateNextMatchNumber } from '../utils/matchSequence';
import { sortSeasonsDescending } from '../utils/seasonCalculations';
import { getPlayerDocId } from '../utils/playerId';

const MAX_PLAYERS_PER_TEAM = 5;

interface AdminInputProps {
  players: Player[];
  heroes: Hero[];
  matches?: Match[];
  seasons?: LagaAmalSeasonData[];
  activeSeasonId?: string;
  isAdmin: boolean;
  prefilledDraft?: {
    pohon: Array<{ player: string; hero: string }>;
    lobby: Array<{ player: string; hero: string }>;
  } | null;
  onOpenLogin: () => void;
  onSaveMatch: (matchData: any) => Promise<boolean>;
  onAddPlayer: (player: { name: string; status: 'Aktif' | 'Cabutan'; tier: string; avatar_url?: string }) => Promise<boolean>;
}

export const AdminInput: React.FC<AdminInputProps> = ({
  players,
  heroes,
  matches = [],
  seasons = [],
  activeSeasonId = 's41',
  isAdmin,
  prefilledDraft,
  onOpenLogin,
  onSaveMatch,
  onAddPlayer,
}) => {
  // Assigned rosters
  const [pohonPlayers, setPohonPlayers] = useState<string[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [draggingPlayer, setDraggingPlayer] = useState<string | null>(null);

  // Player configuration row: { hero, medal, score }
  const [playerConfig, setPlayerConfig] = useState<
    Record<string, { hero: string; medal: Medal; score: number }>
  >({});

  // Match meta
  const [winner, setWinner] = useState<TeamName>('Tim Pohon');
  const [selectedSeason, setSelectedSeason] = useState<string>(activeSeasonId);

  // Seasons sorted in descending order (highest season first)
  const sortedSeasons = useMemo(() => sortSeasonsDescending(seasons || []), [seasons]);

  const [matchNumber, setMatchNumber] = useState<number>(() =>
    calculateNextMatchNumber(matches, activeSeasonId, seasons)
  );
  const [matchDate, setMatchDate] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  });

  // Re-calculate next match sequence when selectedSeason or matches change
  React.useEffect(() => {
    const nextNum = calculateNextMatchNumber(matches, selectedSeason, seasons);
    setMatchNumber(nextNum);
  }, [selectedSeason, matches, seasons]);

  // Apply draft from Gacha Pick if provided
  React.useEffect(() => {
    if (prefilledDraft && prefilledDraft.pohon.length > 0 && prefilledDraft.lobby.length > 0) {
      const pNames = prefilledDraft.pohon.map((p) => p.player);
      const lNames = prefilledDraft.lobby.map((p) => p.player);
      setPohonPlayers(pNames);
      setLobbyPlayers(lNames);

      const newConfig: Record<string, { hero: string; medal: Medal; score: number }> = {};
      prefilledDraft.pohon.forEach((item) => {
        newConfig[item.player] = { hero: item.hero || 'Kadita', medal: 'Silver', score: 6.0 };
      });
      prefilledDraft.lobby.forEach((item) => {
        newConfig[item.player] = { hero: item.hero || 'Kadita', medal: 'Silver', score: 6.0 };
      });
      setPlayerConfig(newConfig);

      setNotification({
        type: 'success',
        message: 'Hasil Gacha Team & Hero berhasil dimuat! Silakan sesuaikan pemenang, medali & skor.',
      });
    }
  }, [prefilledDraft]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add new player modal state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatarUrl, setNewPlayerAvatarUrl] = useState('');
  const [newPlayerStatus, setNewPlayerStatus] = useState<'Aktif' | 'Cabutan'>('Aktif');
  const [newPlayerTier, setNewPlayerTier] = useState('Legend');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Player search & filter state
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerStatusFilter, setPlayerStatusFilter] = useState<'Semua' | 'Aktif' | 'Cabutan'>('Semua');
  const [filterUnassignedOnly, setFilterUnassignedOnly] = useState(false);
  const [playerSortDir, setPlayerSortDir] = useState<'asc' | 'desc'>('asc');

  // Player pool currently unassigned
  const pool = useMemo(() => {
    return players.filter(
      (p) => !pohonPlayers.includes(p.name) && !lobbyPlayers.includes(p.name)
    );
  }, [players, pohonPlayers, lobbyPlayers]);

  // Filtered players list for the interactive assignment panel
  const filteredPlayersList = useMemo(() => {
    const term = playerSearchQuery.toLowerCase().trim();
    const filtered = players.filter((p) => {
      const isPohon = pohonPlayers.includes(p.name);
      const isLobby = lobbyPlayers.includes(p.name);
      const isAssigned = isPohon || isLobby;

      if (filterUnassignedOnly && isAssigned) {
        return false;
      }

      const matchName = p.name.toLowerCase().includes(term);
      const matchStatus = playerStatusFilter === 'Semua' || p.status === playerStatusFilter;

      return matchName && matchStatus;
    });

    const dir = playerSortDir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => dir * a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [
    players,
    playerSearchQuery,
    playerStatusFilter,
    filterUnassignedOnly,
    pohonPlayers,
    lobbyPlayers,
    playerSortDir,
  ]);

  const getDefaultScore = (medal: Medal): number => {
    switch (medal) {
      case 'MVP':
        return 10.0;
      case 'Gold':
        return 8.5;
      case 'Silver':
        return 6.0;
      case 'Coklat':
        return 3.5;
    }
  };

  const assignPlayerToTeam = (name: string, team: TeamShort) => {
    if (team === 'Pohon') {
      if (pohonPlayers.includes(name)) return;
      if (pohonPlayers.length >= MAX_PLAYERS_PER_TEAM) {
        setNotification({
          type: 'error',
          message: `Tim Kiri sudah penuh (maksimal ${MAX_PLAYERS_PER_TEAM} pemain)! Hapus salah satu terlebih dahulu jika ingin mengganti.`,
        });
        return;
      }
      setLobbyPlayers((prev) => prev.filter((n) => n !== name));
      setPohonPlayers((prev) => [...prev, name]);
    } else {
      if (lobbyPlayers.includes(name)) return;
      if (lobbyPlayers.length >= MAX_PLAYERS_PER_TEAM) {
        setNotification({
          type: 'error',
          message: `Tim Kanan sudah penuh (maksimal ${MAX_PLAYERS_PER_TEAM} pemain)! Hapus salah satu terlebih dahulu jika ingin mengganti.`,
        });
        return;
      }
      setPohonPlayers((prev) => prev.filter((n) => n !== name));
      setLobbyPlayers((prev) => [...prev, name]);
    }

    // Initialize config if not yet set
    if (!playerConfig[name]) {
      const defaultHero = heroes[Math.floor(Math.random() * Math.min(10, heroes.length))]?.name || 'Kadita';
      setPlayerConfig((prev) => ({
        ...prev,
        [name]: {
          hero: defaultHero,
          medal: 'Silver',
          score: 6.0,
        },
      }));
    }
  };

  const removePlayerFromTeam = (name: string) => {
    setPohonPlayers((prev) => prev.filter((n) => n !== name));
    setLobbyPlayers((prev) => prev.filter((n) => n !== name));
  };

  const updatePlayerField = (
    name: string,
    field: 'hero' | 'medal' | 'score',
    value: any
  ) => {
    setPlayerConfig((prev) => {
      const current = prev[name] || { hero: 'Kadita', medal: 'Silver', score: 6.0 };
      if (field === 'medal') {
        const newMedal = value as Medal;
        // If current score was exactly the default for previous medal, auto-update to new default
        const prevDefault = getDefaultScore(current.medal);
        const nextScore = current.score === prevDefault ? getDefaultScore(newMedal) : current.score;
        return {
          ...prev,
          [name]: {
            ...current,
            medal: newMedal,
            score: nextScore,
          },
        };
      }
      return {
        ...prev,
        [name]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveMatch = async () => {
    if (!isAdmin) {
      onOpenLogin();
      return;
    }

    if (pohonPlayers.length === 0 || lobbyPlayers.length === 0) {
      setNotification({
        type: 'error',
        message: 'Minimal pilih 1 pemain untuk Tim Kiri dan 1 pemain untuk Tim Kanan!',
      });
      return;
    }

    if (pohonPlayers.length > MAX_PLAYERS_PER_TEAM || lobbyPlayers.length > MAX_PLAYERS_PER_TEAM) {
      setNotification({
        type: 'error',
        message: `Maksimal ${MAX_PLAYERS_PER_TEAM} pemain untuk setiap tim (Format 5v5 MLBB)! Kurangi pemain yang melebihi kuota.`,
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const pohonDetails: MatchPlayerDetail[] = pohonPlayers.map((name) => {
      const p = players.find((x) => x.name.toLowerCase() === name.toLowerCase());
      const conf = playerConfig[name] || { hero: 'Kadita', medal: 'Silver', score: 6.0 };
      const h = heroes.find((hero) => hero.name === conf.hero);
      return {
        player_id: p?.id || Date.now(),
        player_name: name,
        hero_id: h?.id,
        hero_name: conf.hero,
        team: 'Pohon',
        medal: conf.medal,
        score: Number(conf.score) || 6.0,
      };
    });

    const lobbyDetails: MatchPlayerDetail[] = lobbyPlayers.map((name) => {
      const p = players.find((x) => x.name.toLowerCase() === name.toLowerCase());
      const conf = playerConfig[name] || { hero: 'Chou', medal: 'Silver', score: 6.0 };
      const h = heroes.find((hero) => hero.name === conf.hero);
      return {
        player_id: p?.id || Date.now(),
        player_name: name,
        hero_id: h?.id,
        hero_name: conf.hero,
        team: 'Lobby',
        medal: conf.medal,
        score: Number(conf.score) || 6.0,
      };
    });

    const seasonObj = seasons.find((s) => s.id === selectedSeason) || seasons[0];
    const seasonLabel = seasonObj ? seasonObj.title : 'Season 41';
    const targetMatchNumber = Math.max(1, Number(matchNumber) || 1);

    const payload = {
      id: targetMatchNumber,
      matchNumber: targetMatchNumber,
      date: matchDate,
      season: seasonLabel,
      winner,
      type: 'Laga Amal',
      pohon: pohonDetails,
      lobby: lobbyDetails,
    };

    try {
      const success = await onSaveMatch(payload);
      if (success) {
        setNotification({
          type: 'success',
          message: `Match #${targetMatchNumber} tersimpan & langsung tersinkron ke Klasemen Laga Amal!`,
        });
        setPohonPlayers([]);
        setLobbyPlayers([]);
        setMatchNumber(targetMatchNumber + 1);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menyimpan pertandingan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNewName = newPlayerName.trim();
    if (!cleanNewName) return;

    // Duplicate check — exact name
    if (players.some((p) => p.name.trim().toLowerCase() === cleanNewName.toLowerCase())) {
      setNotification({
        type: 'error',
        message: `Pemain dengan nama "${cleanNewName}" sudah terdaftar di database!`,
      });
      return;
    }

    // Storage-key collision check — a name that only differs by
    // spaces/punctuation from an existing player would overwrite that
    // player's data in Supabase (the storage key is a slug of the name).
    const newSlug = getPlayerDocId({ name: cleanNewName, id: 0 } as Player);
    const slugConflict = players.find((p) => getPlayerDocId(p) === newSlug);
    if (slugConflict) {
      setNotification({
        type: 'error',
        message: `Nama "${cleanNewName}" terlalu mirip dengan "${slugConflict.name}" yang sudah ada (beda spasi/simbol saja) — datanya bisa saling menimpa. Pakai nama yang lebih berbeda.`,
      });
      return;
    }

    setIsAddingPlayer(true);
    try {
      const ok = await onAddPlayer({
        name: newPlayerName.trim(),
        status: newPlayerStatus,
        tier: newPlayerTier,
        avatar_url: newPlayerAvatarUrl.trim() || undefined,
      });

      if (ok) {
        setNewPlayerName('');
        setNewPlayerAvatarUrl('');
        setShowAddPlayer(false);
        setNotification({
          type: 'success',
          message: `Pemain '${newPlayerName}' berhasil ditambahkan ke database & klasemen!`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menambahkan pemain baru.',
      });
    } finally {
      setIsAddingPlayer(false);
    }
  };

  return (
    <div id="admin-input-view" className="space-y-6">
      {/* Header & Match Setup */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#332C25] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D] border border-[#332C25]">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg flex items-center gap-2">
                Input Pertandingan Laga Amal
                {isAdmin ? (
                  <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Mode Admin Aktif
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-950 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Lock size={10} /> Read Only
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#9C948A]">
                Tentukan tim, hero, medali, dan skor setiap pemain untuk update real-time klasemen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-3 py-1.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer shadow-sm"
              >
                <Lock size={13} />
                <span>Masuk Admin</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="btn-open-add-player"
                onClick={() => setShowAddPlayer(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#F2EDE4] hover:bg-[#2d2621] transition-colors cursor-pointer"
              >
                <Plus size={14} className="text-[#E8B33D]" />
                <span>+ Tambah Pemain</span>
              </button>
            )}
          </div>
        </div>

        {/* Match Configurations (Number, Date, Season, Winner) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1 flex items-center justify-between">
              <span>Nomor Match:</span>
              <span className="text-[10px] text-[#E8B33D] font-mono font-bold">Auto-Sequence</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-black text-[#E8B33D]">#</span>
              <input
                id="input-match-number"
                type="number"
                min={1}
                value={matchNumber}
                onChange={(e) => setMatchNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl border border-[#332C25] bg-[#161311] pl-7 pr-3 py-2 text-xs font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
                placeholder="1"
              />
            </div>
            <p className="text-[10px] text-[#9C948A] mt-1 truncate">
              Match #{matchNumber} berurutan otomatis
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">
              Tanggal Match:
            </label>
            <input
              type="text"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-medium text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">
              Target Season:
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-xs font-medium text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
            >
              {sortedSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9C948A] mb-1">
              Tim Pemenang:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWinner('Tim Pohon')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  winner === 'Tim Pohon'
                    ? 'border border-[#4F7942] bg-[#4F7942] text-white shadow-md'
                    : 'border border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                ⬅️ Kiri
              </button>
              <button
                type="button"
                onClick={() => setWinner('Tim Lobby')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  winner === 'Tim Lobby'
                    ? 'border border-[#C97A3D] bg-[#C97A3D] text-white shadow-md'
                    : 'border border-[#332C25] bg-[#161311] text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                ➡️ Kanan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Assignment Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TIM KIRI */}
        <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#4F7942]" />
              <h3 className="font-bold text-sm text-[#F2EDE4] uppercase tracking-wider flex items-center gap-2">
                <span>Tim Kiri</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    pohonPlayers.length === MAX_PLAYERS_PER_TEAM
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#241F1B] text-[#9C948A] border border-[#332C25]'
                  }`}
                >
                  {pohonPlayers.length} / {MAX_PLAYERS_PER_TEAM}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {pohonPlayers.length === MAX_PLAYERS_PER_TEAM ? (
                <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Lengkap (5/5)
                </span>
              ) : (
                <span className="text-[10px] text-[#9C948A]">
                  Sisa {MAX_PLAYERS_PER_TEAM - pohonPlayers.length} slot
                </span>
              )}
              {winner === 'Tim Pohon' && (
                <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                  Pemenang Match
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 min-h-[140px]">
            {pohonPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#332C25] p-6 text-center text-xs text-[#9C948A]">
                Belum ada pemain di Tim Kiri. Cari dan pilih pemain di panel pencarian bawah (maksimal {MAX_PLAYERS_PER_TEAM} pemain).
              </div>
            ) : (
              pohonPlayers.map((name, idx) => {
                const conf = playerConfig[name] || { hero: 'Kadita', medal: 'Silver', score: 6.0 };
                return (
                  <div
                    key={`pohon-player-${name}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#332C25] bg-[#241F1B] p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={name} size="sm" />
                      <span className="font-bold text-xs text-[#F2EDE4] truncate max-w-[120px]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Searchable Hero selector */}
                      <SearchableHeroSelect
                        heroes={heroes}
                        selectedHero={conf.hero}
                        onSelectHero={(heroName) => updatePlayerField(name, 'hero', heroName)}
                      />

                      {/* Medal selector */}
                      <select
                        value={conf.medal}
                        onChange={(e) => updatePlayerField(name, 'medal', e.target.value as Medal)}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold cursor-pointer ${
                          conf.medal === 'MVP'
                            ? 'border-[#E8B33D] bg-[#2A2218] text-[#E8B33D]'
                            : conf.medal === 'Gold'
                            ? 'border-[#D8A93A] bg-[#251E17] text-[#D8A93A]'
                            : conf.medal === 'Silver'
                            ? 'border-[#B9B2A8] bg-[#211E1B] text-[#B9B2A8]'
                            : 'border-[#6B4226] bg-[#2A1D15] text-[#b8764a]'
                        }`}
                      >
                        <option value="MVP">👑 MVP</option>
                        <option value="Gold">🥇 Gold</option>
                        <option value="Silver">🥈 Silver</option>
                        <option value="Coklat">🍫 Coklat</option>
                      </select>

                      {/* Player Score Input */}
                      <div className="flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1">
                        <span className="text-[10px] text-[#9C948A] font-semibold">Skor:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={conf.score}
                          onChange={(e) =>
                            updatePlayerField(name, 'score', parseFloat(e.target.value) || 0)
                          }
                          className="w-12 bg-transparent text-center font-bold text-xs text-[#F2EDE4] focus:outline-none"
                          title="Input skor individu MLBB"
                        />
                      </div>

                      <button
                        onClick={() => removePlayerFromTeam(name)}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus dari tim"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TIM KANAN */}
        <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#C97A3D]" />
              <h3 className="font-bold text-sm text-[#F2EDE4] uppercase tracking-wider flex items-center gap-2">
                <span>Tim Kanan</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    lobbyPlayers.length === MAX_PLAYERS_PER_TEAM
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#241F1B] text-[#9C948A] border border-[#332C25]'
                  }`}
                >
                  {lobbyPlayers.length} / {MAX_PLAYERS_PER_TEAM}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {lobbyPlayers.length === MAX_PLAYERS_PER_TEAM ? (
                <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Lengkap (5/5)
                </span>
              ) : (
                <span className="text-[10px] text-[#9C948A]">
                  Sisa {MAX_PLAYERS_PER_TEAM - lobbyPlayers.length} slot
                </span>
              )}
              {winner === 'Tim Lobby' && (
                <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                  Pemenang Match
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 min-h-[140px]">
            {lobbyPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#332C25] p-6 text-center text-xs text-[#9C948A]">
                Belum ada pemain di Tim Kanan. Cari dan pilih pemain di panel pencarian bawah (maksimal {MAX_PLAYERS_PER_TEAM} pemain).
              </div>
            ) : (
              lobbyPlayers.map((name, idx) => {
                const conf = playerConfig[name] || { hero: 'Chou', medal: 'Silver', score: 6.0 };
                return (
                  <div
                    key={`lobby-player-${name}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#332C25] bg-[#241F1B] p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={name} size="sm" />
                      <span className="font-bold text-xs text-[#F2EDE4] truncate max-w-[120px]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Searchable Hero selector */}
                      <SearchableHeroSelect
                        heroes={heroes}
                        selectedHero={conf.hero}
                        onSelectHero={(heroName) => updatePlayerField(name, 'hero', heroName)}
                      />

                      {/* Medal selector */}
                      <select
                        value={conf.medal}
                        onChange={(e) => updatePlayerField(name, 'medal', e.target.value as Medal)}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold cursor-pointer ${
                          conf.medal === 'MVP'
                            ? 'border-[#E8B33D] bg-[#2A2218] text-[#E8B33D]'
                            : conf.medal === 'Gold'
                            ? 'border-[#D8A93A] bg-[#251E17] text-[#D8A93A]'
                            : conf.medal === 'Silver'
                            ? 'border-[#B9B2A8] bg-[#211E1B] text-[#B9B2A8]'
                            : 'border-[#6B4226] bg-[#2A1D15] text-[#b8764a]'
                        }`}
                      >
                        <option value="MVP">👑 MVP</option>
                        <option value="Gold">🥇 Gold</option>
                        <option value="Silver">🥈 Silver</option>
                        <option value="Coklat">🍫 Coklat</option>
                      </select>

                      {/* Player Score Input */}
                      <div className="flex items-center gap-1 rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1">
                        <span className="text-[10px] text-[#9C948A] font-semibold">Skor:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={conf.score}
                          onChange={(e) =>
                            updatePlayerField(name, 'score', parseFloat(e.target.value) || 0)
                          }
                          className="w-12 bg-transparent text-center font-bold text-xs text-[#F2EDE4] focus:outline-none"
                          title="Input skor individu MLBB"
                        />
                      </div>

                      <button
                        onClick={() => removePlayerFromTeam(name)}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus dari tim"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SEARCH & ASSIGN PLAYERS PANEL */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#332C25] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#F2EDE4] flex items-center gap-2">
              <Users size={16} className="text-[#E8B33D]" />
              Pencarian & Penentuan Pemain Tim
            </h3>
            <p className="text-xs text-[#9C948A] mt-0.5">
              Cari nama pemain untuk memasukkan ke Tim Kiri atau Tim Kanan (Maksimal 5 vs 5)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Team quotas status */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold border ${
                  pohonPlayers.length === MAX_PLAYERS_PER_TEAM
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-400'
                    : 'border-[#332C25] bg-[#241F1B] text-[#72ac60]'
                }`}
                title={`Tim Kiri: ${pohonPlayers.length} dari ${MAX_PLAYERS_PER_TEAM} pemain`}
              >
                ⬅️ Kiri: {pohonPlayers.length}/{MAX_PLAYERS_PER_TEAM}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold border ${
                  lobbyPlayers.length === MAX_PLAYERS_PER_TEAM
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-400'
                    : 'border-[#332C25] bg-[#241F1B] text-[#e29355]'
                }`}
                title={`Tim Kanan: ${lobbyPlayers.length} dari ${MAX_PLAYERS_PER_TEAM} pemain`}
              >
                ➡️ Kanan: {lobbyPlayers.length}/{MAX_PLAYERS_PER_TEAM}
              </span>
            </div>
          </div>
        </div>

        {/* Search Input and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C948A]" />
            <input
              type="text"
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              placeholder="Cari nama pemain (misal: Bang Jago, Rrq, dll)..."
              className="w-full rounded-xl border border-[#332C25] bg-[#161311] pl-9 pr-8 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
            />
            {playerSearchQuery && (
              <button
                type="button"
                onClick={() => setPlayerSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1.5">
            {(['Semua', 'Aktif', 'Cabutan'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setPlayerStatusFilter(st)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  playerStatusFilter === st
                    ? 'bg-[#E8B33D] text-[#161311] font-bold'
                    : 'border border-[#332C25] bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                {st}
              </button>
            ))}

            {/* Toggle unassigned only */}
            <button
              type="button"
              onClick={() => setFilterUnassignedOnly(!filterUnassignedOnly)}
              className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer border ${
                filterUnassignedOnly
                  ? 'border-[#E8B33D]/60 bg-[#E8B33D]/15 text-[#E8B33D] font-bold'
                  : 'border-[#332C25] bg-[#241F1B] text-[#9C948A] hover:text-[#F2EDE4]'
              }`}
              title="Hanya tampilkan pemain yang belum masuk tim"
            >
              <Filter size={13} />
              <span className="hidden sm:inline">Belum Masuk Tim</span>
              <span className="sm:hidden">Belum Tim</span>
            </button>

            <button
              type="button"
              onClick={() => setPlayerSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer border border-[#332C25] bg-[#241F1B] text-[#E8B33D] hover:text-[#F2EDE4] hover:border-[#E8B33D]/40"
              title={
                playerSortDir === 'asc'
                  ? 'Urutan A-Z (ascended). Klik untuk Z-A'
                  : 'Urutan Z-A (descended). Klik untuk A-Z'
              }
            >
              {playerSortDir === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />}
              <span>{playerSortDir === 'asc' ? 'A-Z' : 'Z-A'}</span>
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#332C25]">
          {filteredPlayersList.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-dashed border-[#332C25] text-xs text-[#9C948A] space-y-2">
              <p>Tidak ada pemain yang sesuai dengan kriteria pencarian.</p>
              {(playerSearchQuery || playerStatusFilter !== 'Semua' || filterUnassignedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setPlayerSearchQuery('');
                    setPlayerStatusFilter('Semua');
                    setFilterUnassignedOnly(false);
                  }}
                  className="rounded-lg bg-[#241F1B] border border-[#332C25] px-3 py-1 text-xs text-[#E8B33D] hover:bg-[#2A241E] cursor-pointer"
                >
                  Reset Filter & Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredPlayersList.map((p, idx) => {
                const isInPohon = pohonPlayers.includes(p.name);
                const isInLobby = lobbyPlayers.includes(p.name);
                const isPohonFull = pohonPlayers.length >= MAX_PLAYERS_PER_TEAM;
                const isLobbyFull = lobbyPlayers.length >= MAX_PLAYERS_PER_TEAM;

                return (
                  <div
                    key={`search-player-${p.id || p.name}-${idx}`}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                      isInPohon
                        ? 'border-[#4F7942]/60 bg-[#4F7942]/10'
                        : isInLobby
                        ? 'border-[#C97A3D]/60 bg-[#C97A3D]/10'
                        : 'border-[#332C25] bg-[#241F1B] hover:border-[#E8B33D]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PlayerAvatar name={p.name} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-[#F2EDE4] truncate">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              p.status === 'Aktif'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.tier && (
                            <span className="text-[9px] text-[#9C948A] truncate">
                              {p.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team assignment actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isInPohon ? (
                        <div className="flex items-center gap-1">
                          <span className="rounded-lg bg-[#4F7942] text-white px-2 py-1 text-[10px] font-bold">
                            ⬅️ Kiri
                          </span>
                          <button
                            type="button"
                            onClick={() => assignPlayerToTeam(p.name, 'Lobby')}
                            disabled={isLobbyFull}
                            className={`rounded-lg px-2 py-1 text-[10px] font-semibold border transition-colors ${
                              isLobbyFull
                                ? 'border-[#332C25] text-[#554F47] cursor-not-allowed'
                                : 'border-[#C97A3D]/50 text-[#e29355] hover:bg-[#C97A3D] hover:text-white cursor-pointer'
                            }`}
                            title={isLobbyFull ? 'Tim Kanan penuh (5/5)' : 'Pindah ke Tim Kanan'}
                          >
                            ⇄ Kanan
                          </button>
                          <button
                            type="button"
                            onClick={() => removePlayerFromTeam(p.name)}
                            className="rounded-lg p-1 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            title="Keluarkan dari tim"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : isInLobby ? (
                        <div className="flex items-center gap-1">
                          <span className="rounded-lg bg-[#C97A3D] text-white px-2 py-1 text-[10px] font-bold">
                            ➡️ Kanan
                          </span>
                          <button
                            type="button"
                            onClick={() => assignPlayerToTeam(p.name, 'Pohon')}
                            disabled={isPohonFull}
                            className={`rounded-lg px-2 py-1 text-[10px] font-semibold border transition-colors ${
                              isPohonFull
                                ? 'border-[#332C25] text-[#554F47] cursor-not-allowed'
                                : 'border-[#4F7942]/50 text-[#72ac60] hover:bg-[#4F7942] hover:text-white cursor-pointer'
                            }`}
                            title={isPohonFull ? 'Tim Kiri penuh (5/5)' : 'Pindah ke Tim Kiri'}
                          >
                            ⇄ Kiri
                          </button>
                          <button
                            type="button"
                            onClick={() => removePlayerFromTeam(p.name)}
                            className="rounded-lg p-1 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            title="Keluarkan dari tim"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => assignPlayerToTeam(p.name, 'Pohon')}
                            disabled={isPohonFull}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                              isPohonFull
                                ? 'bg-[#241F1B] text-[#554F47] border border-[#332C25] cursor-not-allowed'
                                : 'bg-[#4F7942]/20 text-[#72ac60] hover:bg-[#4F7942] hover:text-white cursor-pointer'
                            }`}
                            title={isPohonFull ? 'Tim Kiri sudah penuh (maksimal 5 pemain)' : 'Masukkan ke Tim Kiri'}
                          >
                            {isPohonFull ? 'Penuh' : '+ Kiri'}
                          </button>
                          <button
                            type="button"
                            onClick={() => assignPlayerToTeam(p.name, 'Lobby')}
                            disabled={isLobbyFull}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                              isLobbyFull
                                ? 'bg-[#241F1B] text-[#554F47] border border-[#332C25] cursor-not-allowed'
                                : 'bg-[#C97A3D]/20 text-[#e29355] hover:bg-[#C97A3D] hover:text-white cursor-pointer'
                            }`}
                            title={isLobbyFull ? 'Tim Kanan sudah penuh (maksimal 5 pemain)' : 'Masukkan ke Tim Kanan'}
                          >
                            {isLobbyFull ? 'Penuh' : '+ Kanan'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-300'
              : 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Action Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          id="btn-save-match"
          onClick={handleSaveMatch}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-[#E8B33D] px-6 py-3 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-colors shadow-md cursor-pointer"
        >
          {isSubmitting ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isSubmitting ? 'Menyimpan & Menganalisis...' : `Simpan Match #${matchNumber} & Update Klasemen`}</span>
        </button>
      </div>

      {/* ADD PLAYER MODAL */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
              <h3 className="text-base font-bold text-[#F2EDE4]">Tambah Pemain Baru</h3>
              <button
                onClick={() => setShowAddPlayer(false)}
                className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241E] hover:text-[#F2EDE4] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">Nickname Pemain:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bang Jago"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">Status:</label>
                <select
                  value={newPlayerStatus}
                  onChange={(e) => setNewPlayerStatus(e.target.value as 'Aktif' | 'Cabutan')}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Cabutan">Cabutan</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9C948A] font-semibold mb-1">Tier / Rank:</label>
                <select
                  value={newPlayerTier}
                  onChange={(e) => setNewPlayerTier(e.target.value)}
                  className="w-full rounded-xl border border-[#332C25] bg-[#161311] px-3 py-2 text-[#F2EDE4] focus:outline-none cursor-pointer"
                >
                  {MLBB_TIER_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-[#1D1916] text-[#F2EDE4]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(false)}
                  className="rounded-xl border border-[#332C25] px-4 py-2 text-xs font-semibold text-[#9C948A] hover:bg-[#241F1B] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingPlayer}
                  className="rounded-xl bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isAddingPlayer ? 'Menyimpan...' : 'Simpan Pemain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
