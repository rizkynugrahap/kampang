import React, { useState } from 'react';
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
  ArrowRight,
  Shield,
  Lock,
  Calendar,
  Layers,
} from 'lucide-react';
import { Player, Hero, Medal, TeamShort, MatchPlayerDetail, TeamName, Match, LagaAmalSeasonData, MLBB_TIER_OPTIONS } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { calculateNextMatchNumber } from '../utils/matchSequence';

interface AdminInputProps {
  players: Player[];
  heroes: Hero[];
  matches?: Match[];
  seasons?: LagaAmalSeasonData[];
  activeSeasonId?: string;
  isAdmin: boolean;
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

  // Player pool currently unassigned
  const pool = players.filter(
    (p) => !pohonPlayers.includes(p.name) && !lobbyPlayers.includes(p.name)
  );

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
      setLobbyPlayers((prev) => prev.filter((n) => n !== name));
      setPohonPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    } else {
      setPohonPlayers((prev) => prev.filter((n) => n !== name));
      setLobbyPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
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
        message: 'Minimal pilih 1 pemain untuk Tim Pohon dan 1 pemain untuk Tim Lobby!',
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
    if (!newPlayerName.trim()) return;

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
              {seasons.map((s) => (
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
                🌳 Pohon
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
                🛋️ Lobby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Assignment Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TIM POHON */}
        <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#4F7942]" />
              <h3 className="font-bold text-sm text-[#F2EDE4] uppercase tracking-wider">
                Tim Pohon ({pohonPlayers.length} Pemain)
              </h3>
            </div>
            {winner === 'Tim Pohon' && (
              <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                Pemenang Match
              </span>
            )}
          </div>

          <div className="space-y-3 min-h-[140px]">
            {pohonPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#332C25] p-6 text-center text-xs text-[#9C948A]">
                Pilih atau klik pemain di kolam bawah untuk memasukkannya ke Tim Pohon
              </div>
            ) : (
              pohonPlayers.map((name) => {
                const conf = playerConfig[name] || { hero: 'Kadita', medal: 'Silver', score: 6.0 };
                return (
                  <div
                    key={name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#332C25] bg-[#241F1B] p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={name} size="sm" />
                      <span className="font-bold text-xs text-[#F2EDE4] truncate max-w-[120px]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Hero selector */}
                      <select
                        value={conf.hero}
                        onChange={(e) => updatePlayerField(name, 'hero', e.target.value)}
                        className="rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1 text-xs text-[#F2EDE4] focus:outline-none cursor-pointer"
                      >
                        {heroes.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </select>

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

        {/* TIM LOBBY */}
        <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#C97A3D]" />
              <h3 className="font-bold text-sm text-[#F2EDE4] uppercase tracking-wider">
                Tim Lobby ({lobbyPlayers.length} Pemain)
              </h3>
            </div>
            {winner === 'Tim Lobby' && (
              <span className="rounded-full bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                Pemenang Match
              </span>
            )}
          </div>

          <div className="space-y-3 min-h-[140px]">
            {lobbyPlayers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#332C25] p-6 text-center text-xs text-[#9C948A]">
                Pilih atau klik pemain di kolam bawah untuk memasukkannya ke Tim Lobby
              </div>
            ) : (
              lobbyPlayers.map((name) => {
                const conf = playerConfig[name] || { hero: 'Chou', medal: 'Silver', score: 6.0 };
                return (
                  <div
                    key={name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#332C25] bg-[#241F1B] p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={name} size="sm" />
                      <span className="font-bold text-xs text-[#F2EDE4] truncate max-w-[120px]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Hero selector */}
                      <select
                        value={conf.hero}
                        onChange={(e) => updatePlayerField(name, 'hero', e.target.value)}
                        className="rounded-lg border border-[#332C25] bg-[#161311] px-2 py-1 text-xs text-[#F2EDE4] focus:outline-none cursor-pointer"
                      >
                        {heroes.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </select>

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

      {/* UNASSIGNED PLAYERS POOL */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#9C948A] uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="text-[#E8B33D]" />
            Kolam Pemain Tersedia ({pool.length})
          </h3>
          <span className="text-[11px] text-[#9C948A]">
            Klik nama untuk memasukkan ke Tim Pohon atau Tim Lobby
          </span>
        </div>

        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
          {pool.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#241F1B] px-2.5 py-1 text-xs text-[#F2EDE4] hover:border-[#E8B33D]/50 transition-all"
            >
              <PlayerAvatar name={p.name} size="xs" />
              <span className="font-semibold text-xs">{p.name}</span>
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => assignPlayerToTeam(p.name, 'Pohon')}
                  className="rounded bg-[#4F7942]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#72ac60] hover:bg-[#4F7942] hover:text-white transition-colors cursor-pointer"
                  title="Pilih masuk Tim Pohon"
                >
                  + Pohon
                </button>
                <button
                  type="button"
                  onClick={() => assignPlayerToTeam(p.name, 'Lobby')}
                  className="rounded bg-[#C97A3D]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#e29355] hover:bg-[#C97A3D] hover:text-white transition-colors cursor-pointer"
                  title="Pilih masuk Tim Lobby"
                >
                  + Lobby
                </button>
              </div>
            </div>
          ))}
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
