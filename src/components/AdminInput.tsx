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
  Database,
  Download,
  FileSpreadsheet,
  Cloud,
} from 'lucide-react';
import { firebaseConfig } from '../lib/firebase';
import { Player, Hero, Medal, TeamShort, MatchPlayerDetail, TeamName, Match, TournamentData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import {
  downloadCsvFile,
  generatePlayersCsv,
  generateMatchesCsv,
  generateMatchDetailsCsv,
  generateAllInOneDatabaseCsv,
} from '../utils/csvExport';

interface AdminInputProps {
  players: Player[];
  heroes: Hero[];
  matches?: Match[];
  tournaments?: TournamentData[];
  isAdmin: boolean;
  onOpenLogin: () => void;
  onSaveMatch: (matchData: any) => Promise<boolean>;
  onAddPlayer: (player: { name: string; status: 'Aktif' | 'Cabutan'; tier: string; avatar_url?: string }) => Promise<boolean>;
  onOpenExport?: () => void;
}

export const AdminInput: React.FC<AdminInputProps> = ({
  players,
  heroes,
  matches = [],
  tournaments = [],
  isAdmin,
  onOpenLogin,
  onSaveMatch,
  onAddPlayer,
  onOpenExport,
}) => {
  // Assigned rosters
  const [pohonPlayers, setPohonPlayers] = useState<string[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [draggingPlayer, setDraggingPlayer] = useState<string | null>(null);

  // Player configuration row: { hero_name, medal }
  const [playerConfig, setPlayerConfig] = useState<
    Record<string, { hero: string; medal: Medal }>
  >({});

  // Match meta
  const [winner, setWinner] = useState<TeamName>('Tim Pohon');
  const [matchType, setMatchType] = useState<'Laga Amal' | 'Ranked' | 'Turnamen'>('Laga Amal');
  const [tournamentStage, setTournamentStage] = useState('Pekan Reguler');
  const [matchDate, setMatchDate] = useState<string>(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  });

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Quick hero search filter for quick picking
  const [heroSearch, setHeroSearch] = useState<string>('');

  // Add new player modal state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatarUrl, setNewPlayerAvatarUrl] = useState('');
  const [newPlayerStatus, setNewPlayerStatus] = useState<'Aktif' | 'Cabutan'>('Aktif');
  const [newPlayerTier, setNewPlayerTier] = useState('Legend');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Players currently in pool
  const pool = players.filter(
    (p) => !pohonPlayers.includes(p.name) && !lobbyPlayers.includes(p.name)
  );

  // Drag and Drop handlers
  const handleDragStart = (name: string) => {
    setDraggingPlayer(name);
  };

  const handleDrop = (targetTeam: TeamShort) => {
    if (!draggingPlayer) return;
    assignPlayerToTeam(draggingPlayer, targetTeam);
    setDraggingPlayer(null);
  };

  const assignPlayerToTeam = (name: string, team: TeamShort) => {
    if (team === 'Pohon') {
      setLobbyPlayers((prev) => prev.filter((n) => n !== name));
      setPohonPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    } else {
      setPohonPlayers((prev) => prev.filter((n) => n !== name));
      setLobbyPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    // Default hero and medal if not assigned
    if (!playerConfig[name]) {
      setPlayerConfig((prev) => ({
        ...prev,
        [name]: {
          hero: heroes[Math.floor(Math.random() * 10)]?.name || 'Chou',
          medal: 'Silver',
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
    field: 'hero' | 'medal',
    value: string
  ) => {
    setPlayerConfig((prev) => ({
      ...prev,
      [name]: {
        hero: field === 'hero' ? value : prev[name]?.hero || heroes[0]?.name || 'Kadita',
        medal: field === 'medal' ? (value as Medal) : prev[name]?.medal || 'Silver',
      },
    }));
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
      const p = players.find((x) => x.name === name);
      const conf = playerConfig[name] || { hero: 'Kadita', medal: 'Silver' };
      const h = heroes.find((hero) => hero.name === conf.hero);
      return {
        player_id: p?.id || Date.now(),
        player_name: name,
        hero_id: h?.id,
        hero_name: conf.hero,
        team: 'Pohon',
        medal: conf.medal,
      };
    });

    const lobbyDetails: MatchPlayerDetail[] = lobbyPlayers.map((name) => {
      const p = players.find((x) => x.name === name);
      const conf = playerConfig[name] || { hero: 'Chou', medal: 'Silver' };
      const h = heroes.find((hero) => hero.name === conf.hero);
      return {
        player_id: p?.id || Date.now(),
        player_name: name,
        hero_id: h?.id,
        hero_name: conf.hero,
        team: 'Lobby',
        medal: conf.medal,
      };
    });

    const payload = {
      date: matchDate,
      season: 'Season 1',
      winner,
      type: matchType,
      tournament_stage: matchType === 'Turnamen' ? tournamentStage : undefined,
      pohon: pohonDetails,
      lobby: lobbyDetails,
    };

    try {
      const success = await onSaveMatch(payload);
      if (success) {
        setNotification({
          type: 'success',
          message: 'Match tersimpan! Analisis AI Gemini sedang diproses secara async...',
        });
        // Reset rosters for next game
        setPohonPlayers([]);
        setLobbyPlayers([]);
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

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setIsAddingPlayer(true);
    try {
      const ok = await onAddPlayer({
        name: newPlayerName.trim(),
        status: newPlayerStatus,
        tier: newPlayerTier,
        avatar_url: newPlayerAvatarUrl.trim() ? newPlayerAvatarUrl.trim() : undefined,
      });
      if (ok) {
        setNewPlayerName('');
        setNewPlayerAvatarUrl('');
        setShowAddPlayer(false);
      }
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // If not logged in as admin, show lock overlay or friendly prompt
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#332C25] bg-[#1D1916] p-8 text-center sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#241F1B] text-[#E8B33D] shadow-inner">
          <Lock size={28} />
        </div>
        <h2 className="mt-4 font-bold text-lg text-[#F2EDE4]">
          Halaman Khusus Admin
        </h2>
        <p className="mt-1.5 max-w-sm text-xs text-[#9C948A]">
          Input pertandingan dan pengelolaan data hanya dapat diakses oleh admin Pantos. Silakan login untuk melanjutkan.
        </p>
        <button
          id="admin-login-trigger-btn"
          onClick={onOpenLogin}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E8B33D] px-6 py-2.5 font-bold text-xs text-[#161311] transition-transform hover:scale-105"
        >
          <span>Login Admin Pantos</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div id="admin-input-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C25] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#241F1B] text-[#E8B33D]">
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#F2EDE4] sm:text-lg">
              Input Pertandingan & Draft Cepat
            </h2>
            <p className="text-xs text-[#9C948A]">
              Drag & drop atau klik chip pemain · Target waktu pengisian: &lt;30 detik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExport && (
            <button
              id="btn-admin-export-csv"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/40 bg-[#E8B33D]/10 px-3 py-1.5 font-medium text-xs text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-colors"
            >
              <Database size={14} />
              <span>Export Database (CSV)</span>
            </button>
          )}

          <button
            id="btn-add-player"
            onClick={() => setShowAddPlayer(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 font-medium text-xs text-[#F2EDE4] hover:bg-[#2c2621]"
          >
            <Plus size={14} />
            <span>Tambah Pemain Baru</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-medium ${
            notification.type === 'success'
              ? 'border-[#4F7942] bg-[#4F7942]/15 text-emerald-200'
              : 'border-red-600/50 bg-red-950/30 text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 text-[#4F7942]" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Player pool */}
      <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-bold text-xs text-[#9C948A] uppercase tracking-wider">
            Pool Pemain ({pool.length} Tersedia)
          </span>
          <span className="text-[11px] text-[#9C948A]">
            Tarik ke kotak tim, atau klik tombol di bawah chip
          </span>
        </div>

        {pool.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#332C25] py-4 text-center text-xs text-[#9C948A]">
            Semua pemain sudah dimasukkan ke dalam tim.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(p.name)}
                className="group flex items-center gap-2 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 text-xs font-medium text-[#F2EDE4] shadow-xs hover:border-[#E8B33D]/50"
              >
                <PlayerAvatar name={p.name} avatarUrl={p.avatar_url} size="xs" />
                <span className="cursor-grab select-none font-semibold">{p.name}</span>
                <span className="text-[10px] text-[#9C948A]">({p.tier})</span>

                {/* Quick assign buttons for mobile & fast click */}
                <div className="ml-1 flex items-center gap-1 border-l border-[#332C25] pl-1.5">
                  <button
                    type="button"
                    onClick={() => assignPlayerToTeam(p.name, 'Pohon')}
                    className="rounded bg-[#4F7942]/20 px-1.5 py-0.5 font-bold text-[10px] text-[#4F7942] hover:bg-[#4F7942] hover:text-white"
                    title="Masuk Tim Pohon"
                  >
                    +Pohon
                  </button>
                  <button
                    type="button"
                    onClick={() => assignPlayerToTeam(p.name, 'Lobby')}
                    className="rounded bg-[#C97A3D]/20 px-1.5 py-0.5 font-bold text-[10px] text-[#C97A3D] hover:bg-[#C97A3D] hover:text-white"
                    title="Masuk Tim Lobby"
                  >
                    +Lobby
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Team Draft Boxes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Box Tim Pohon */}
        <div
          id="dropzone-tim-pohon"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('Pohon')}
          className="flex flex-col rounded-xl border-2 border-dashed border-[#4F7942]/60 bg-[#1D1916] p-4 transition-colors"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4F7942]" />
              <h3 className="font-bold text-sm text-[#4F7942] uppercase tracking-wider">
                Tim Pohon
              </h3>
            </div>
            <span className="rounded bg-[#241F1B] px-2 py-0.5 text-xs text-[#9C948A]">
              {pohonPlayers.length} Pemain
            </span>
          </div>

          <div className="min-h-[140px] flex-1 space-y-2">
            {pohonPlayers.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-[#332C25]/40 py-8 text-center text-xs text-[#9C948A]">
                Lepas chip pemain di sini untuk Tim Pohon
              </div>
            ) : (
              pohonPlayers.map((name) => {
                const conf = playerConfig[name] || { hero: 'Kadita', medal: 'Silver' };
                const playerObj = players.find((p) => p.name === name);
                return (
                  <div
                    key={name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#332C25] bg-[#241F1B] p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 w-28">
                      <PlayerAvatar
                        name={name}
                        avatarUrl={playerObj?.avatar_url}
                        team="Pohon"
                        size="xs"
                      />
                      <span className="truncate font-semibold text-xs text-[#F2EDE4]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-1 items-center gap-1.5 min-w-[200px]">
                      {/* Hero icon preview */}
                      <HeroAvatar heroName={conf.hero} size="xs" shape="rounded" />

                      {/* Hero selector */}
                      <select
                        value={conf.hero}
                        onChange={(e) => updatePlayerField(name, 'hero', e.target.value)}
                        className="flex-1 rounded border border-[#332C25] bg-[#161311] px-2 py-1 font-medium text-xs text-[#F2EDE4] focus:outline-hidden"
                      >
                        {heroes.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name} ({h.role_primary})
                          </option>
                        ))}
                      </select>

                      {/* Medal selector */}
                      <select
                        value={conf.medal}
                        onChange={(e) => updatePlayerField(name, 'medal', e.target.value)}
                        className="rounded border border-[#332C25] bg-[#161311] px-2 py-1 font-bold text-xs focus:outline-hidden"
                        style={{
                          color:
                            conf.medal === 'MVP'
                              ? '#E8B33D'
                              : conf.medal === 'Gold'
                              ? '#D8A93A'
                              : conf.medal === 'Silver'
                              ? '#B9B2A8'
                              : '#6B4226',
                        }}
                      >
                        <option value="MVP" className="text-[#E8B33D]">MVP</option>
                        <option value="Gold" className="text-[#D8A93A]">Gold</option>
                        <option value="Silver" className="text-[#B9B2A8]">Silver</option>
                        <option value="Coklat" className="text-[#6B4226]">Coklat</option>
                      </select>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removePlayerFromTeam(name)}
                      className="rounded p-1 text-[#9C948A] hover:bg-[#332C25] hover:text-red-400"
                      title="Keluarkan dari tim"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Box Tim Lobby */}
        <div
          id="dropzone-tim-lobby"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('Lobby')}
          className="flex flex-col rounded-xl border-2 border-dashed border-[#C97A3D]/60 bg-[#1D1916] p-4 transition-colors"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C97A3D]" />
              <h3 className="font-bold text-sm text-[#C97A3D] uppercase tracking-wider">
                Tim Lobby
              </h3>
            </div>
            <span className="rounded bg-[#241F1B] px-2 py-0.5 text-xs text-[#9C948A]">
              {lobbyPlayers.length} Pemain
            </span>
          </div>

          <div className="min-h-[140px] flex-1 space-y-2">
            {lobbyPlayers.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-[#332C25]/40 py-8 text-center text-xs text-[#9C948A]">
                Lepas chip pemain di sini untuk Tim Lobby
              </div>
            ) : (
              lobbyPlayers.map((name) => {
                const conf = playerConfig[name] || { hero: 'Chou', medal: 'Silver' };
                const playerObj = players.find((p) => p.name === name);
                return (
                  <div
                    key={name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#332C25] bg-[#241F1B] p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 w-28">
                      <PlayerAvatar
                        name={name}
                        avatarUrl={playerObj?.avatar_url}
                        team="Lobby"
                        size="xs"
                      />
                      <span className="truncate font-semibold text-xs text-[#F2EDE4]">
                        {name}
                      </span>
                    </div>

                    <div className="flex flex-1 items-center gap-1.5 min-w-[200px]">
                      {/* Hero icon preview */}
                      <HeroAvatar heroName={conf.hero} size="xs" shape="rounded" />

                      {/* Hero selector */}
                      <select
                        value={conf.hero}
                        onChange={(e) => updatePlayerField(name, 'hero', e.target.value)}
                        className="flex-1 rounded border border-[#332C25] bg-[#161311] px-2 py-1 font-medium text-xs text-[#F2EDE4] focus:outline-hidden"
                      >
                        {heroes.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name} ({h.role_primary})
                          </option>
                        ))}
                      </select>

                      {/* Medal selector */}
                      <select
                        value={conf.medal}
                        onChange={(e) => updatePlayerField(name, 'medal', e.target.value)}
                        className="rounded border border-[#332C25] bg-[#161311] px-2 py-1 font-bold text-xs focus:outline-hidden"
                        style={{
                          color:
                            conf.medal === 'MVP'
                              ? '#E8B33D'
                              : conf.medal === 'Gold'
                              ? '#D8A93A'
                              : conf.medal === 'Silver'
                              ? '#B9B2A8'
                              : '#6B4226',
                        }}
                      >
                        <option value="MVP" className="text-[#E8B33D]">MVP</option>
                        <option value="Gold" className="text-[#D8A93A]">Gold</option>
                        <option value="Silver" className="text-[#B9B2A8]">Silver</option>
                        <option value="Coklat" className="text-[#6B4226]">Coklat</option>
                      </select>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removePlayerFromTeam(name)}
                      className="rounded p-1 text-[#9C948A] hover:bg-[#332C25] hover:text-red-400"
                      title="Keluarkan dari tim"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Match Meta & Submit */}
      <div className="rounded-xl border border-[#332C25] bg-[#1D1916] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Winner */}
          <div>
            <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
              Pemenang Pertandingan
            </label>
            <select
              id="select-winner"
              value={winner}
              onChange={(e) => setWinner(e.target.value as TeamName)}
              className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 font-bold text-sm text-[#F2EDE4]"
            >
              <option value="Tim Pohon">Tim Pohon</option>
              <option value="Tim Lobby">Tim Lobby</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
              Jenis Pertandingan
            </label>
            <select
              id="select-match-type"
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as any)}
              className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
            >
              <option value="Laga Amal">Laga Amal (Utama)</option>
              <option value="Turnamen">Turnamen Klasemen</option>
              <option value="Ranked">Ranked Santai</option>
            </select>
          </div>

          {/* Date / Stage */}
          <div>
            <label className="mb-1.5 block font-bold text-xs text-[#9C948A] uppercase">
              {matchType === 'Turnamen' ? 'Babak / Putaran Turnamen' : 'Tanggal Laga'}
            </label>
            {matchType === 'Turnamen' ? (
              <select
                id="select-tournament-stage"
                value={tournamentStage}
                onChange={(e) => setTournamentStage(e.target.value)}
                className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
              >
                <option value="Pekan 1 - Matchday 1">Pekan 1 - Matchday 1</option>
                <option value="Pekan 2 - Matchday 1">Pekan 2 - Matchday 1</option>
                <option value="Pekan 3 - Matchday 1">Pekan 3 - Matchday 1</option>
                <option value="Playoffs - Semifinal 1">Playoffs - Semifinal 1</option>
                <option value="Playoffs - Semifinal 2">Playoffs - Semifinal 2</option>
                <option value="Grand Final BO5">Grand Final BO5</option>
              </select>
            ) : (
              <input
                id="input-match-date"
                type="text"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
                placeholder="Contoh: 12 Feb 2025"
              />
            )}
          </div>
        </div>

        {matchType === 'Turnamen' && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-[#9C948A] font-medium">Tanggal:</label>
            <input
              type="text"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1 text-xs text-[#F2EDE4]"
              placeholder="Contoh: 12 Feb 2025"
            />
          </div>
        )}

        {/* Submit button */}
        <div className="mt-5 border-t border-[#332C25] pt-4">
          <button
            id="btn-submit-match"
            type="button"
            onClick={handleSaveMatch}
            disabled={
              isSubmitting || pohonPlayers.length === 0 || lobbyPlayers.length === 0
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8B33D] py-3.5 font-bold text-sm text-[#161311] shadow-lg transition-all hover:bg-[#d69f29] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Menyimpan & Menjalankan Analisis AI Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Simpan & Buat Analisis AI</span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-[#9C948A]">
            Analisis otomatis diproses di server menggunakan model Gemini dengan prompt analis e-sport khas Pantos.
          </p>
        </div>
      </div>

      {/* Database Backup & Export Section */}
      <div className="rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C25] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A241E] text-[#E8B33D]">
              <Database size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F2EDE4]">
                Manajemen & Ekspor Database ke CSV
              </h3>
              <p className="text-[11px] text-[#9C948A]">
                Cadangkan data pemain, hasil laga, dan turnamen ke format spreadsheet (.csv)
              </p>
            </div>
          </div>

          {onOpenExport && (
            <button
              id="btn-admin-open-modal-export"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-1.5 text-xs font-semibold text-[#E8B33D] hover:bg-[#E8B33D]/20 transition-all"
            >
              <FileSpreadsheet size={14} />
              <span>Buka Menu Ekspor Lengkap</span>
            </button>
          )}
        </div>

        {/* Cloud Firestore Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Cloud size={15} className="text-emerald-400" />
            <span className="font-semibold text-[#F2EDE4]">
              Tersinkronisasi dengan Cloud Firestore:
            </span>
            <span className="font-mono text-[11px] text-[#E8B33D] hidden sm:inline">
              {firebaseConfig.projectId} ({firebaseConfig.firestoreDatabaseId})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 size={13} /> Real-Time onSnapshot Aktif
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Export Master */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E8B33D]/30 bg-[#251E17] p-3.5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#E8B33D] mb-1">
                <span>Master All-in-One</span>
                <Sparkles size={14} />
              </div>
              <p className="text-[11px] text-[#C5BCAD]">
                Semua data tabel digabung dalam 1 file master lengkap.
              </p>
            </div>
            <button
              id="btn-quick-export-master"
              onClick={() => {
                const csv = generateAllInOneDatabaseCsv({ players, matches, tournaments });
                downloadCsvFile('pantos_master_database.csv', csv);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#E8B33D] py-1.5 text-xs font-bold text-[#161311] hover:bg-[#F3C256]"
            >
              <Download size={13} />
              <span>Unduh Master CSV</span>
            </button>
          </div>

          {/* Export Players */}
          <div className="flex flex-col justify-between rounded-xl border border-[#332C25] bg-[#191512] p-3.5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#F2EDE4] mb-1">
                <span>Data Pemain</span>
                <span className="text-[10px] text-[#9C948A]">{players.length} Pemain</span>
              </div>
              <p className="text-[11px] text-[#9C948A]">
                Nama, status, tier, perolehan medali, dan win rate.
              </p>
            </div>
            <button
              id="btn-quick-export-players"
              onClick={() => {
                const csv = generatePlayersCsv(players);
                downloadCsvFile('pantos_database_pemain.csv', csv);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] py-1.5 text-xs font-medium text-[#F2EDE4] hover:bg-[#302822]"
            >
              <Download size={13} />
              <span>Unduh Pemain CSV</span>
            </button>
          </div>

          {/* Export Matches */}
          <div className="flex flex-col justify-between rounded-xl border border-[#332C25] bg-[#191512] p-3.5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#F2EDE4] mb-1">
                <span>Riwayat Pertandingan</span>
                <span className="text-[10px] text-[#9C948A]">{matches.length} Laga</span>
              </div>
              <p className="text-[11px] text-[#9C948A]">
                Pemenang, MVP, susunan draft hero, medali, & AI.
              </p>
            </div>
            <button
              id="btn-quick-export-matches"
              onClick={() => {
                const csv = generateMatchesCsv(matches);
                downloadCsvFile('pantos_riwayat_pertandingan.csv', csv);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] py-1.5 text-xs font-medium text-[#F2EDE4] hover:bg-[#302822]"
            >
              <Download size={13} />
              <span>Unduh Pertandingan CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Add Player */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#332C25] bg-[#1D1916] p-5 shadow-2xl">
            <h3 className="font-bold text-base text-[#F2EDE4]">Tambah Pemain Baru</h3>

            {/* Live Avatar Preview */}
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#332C25] bg-[#241F1B] p-3">
              <PlayerAvatar
                name={newPlayerName.trim() || 'Pemain'}
                avatarUrl={newPlayerAvatarUrl.trim() || undefined}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-sm text-[#F2EDE4] truncate">
                  {newPlayerName.trim() || 'Nama Pemain'}
                </span>
                <span className="block text-[11px] text-[#9C948A]">
                  {newPlayerAvatarUrl.trim() ? 'Menggunakan URL Foto kustom' : 'Avatar otomatis dari nama pemain'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreatePlayer} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[#9C948A]">
                  Nama Pemain / Panggilan
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Contoh: Bogi"
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#9C948A]">
                  URL Foto / Avatar (Opsional)
                </label>
                <input
                  type="url"
                  value={newPlayerAvatarUrl}
                  onChange={(e) => setNewPlayerAvatarUrl(e.target.value)}
                  placeholder="https://... (kosongkan untuk avatar bawaan)"
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#9C948A]">Status</label>
                <select
                  value={newPlayerStatus}
                  onChange={(e) => setNewPlayerStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
                >
                  <option value="Aktif">Aktif (Pemain Rutin)</option>
                  <option value="Cabutan">Cabutan (Tamu / Cadangan)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#9C948A]">Tier Akun</label>
                <select
                  value={newPlayerTier}
                  onChange={(e) => setNewPlayerTier(e.target.value)}
                  className="w-full rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-2 text-sm text-[#F2EDE4]"
                >
                  <option value="Mythic Immortal">Mythic Immortal</option>
                  <option value="Mythical Glory">Mythical Glory</option>
                  <option value="Mythic">Mythic</option>
                  <option value="Legend">Legend</option>
                  <option value="Epic">Epic</option>
                  <option value="Grandmaster">Grandmaster</option>
                </select>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(false)}
                  className="flex-1 rounded-lg border border-[#332C25] bg-[#241F1B] py-2 font-medium text-xs text-[#F2EDE4]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingPlayer}
                  className="flex-1 rounded-lg bg-[#E8B33D] py-2 font-bold text-xs text-[#161311]"
                >
                  {isAddingPlayer ? 'Menyimpan...' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
