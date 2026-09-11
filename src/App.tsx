import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ClipboardList,
  UserRound,
  Swords,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { Player, Match, Hero, TournamentData } from './types';
import { ScoreBanner } from './components/ScoreBanner';
import { KelasSemenTable } from './components/KelasSemenTable';
import { MatchFeed } from './components/MatchFeed';
import { MatchDetailModal } from './components/MatchDetailModal';
import { PlayerModal } from './components/PlayerModal';
import { AdminInput } from './components/AdminInput';
import { PlayerProfile } from './components/PlayerProfile';
import { TournamentView } from './components/TournamentView';
import { LagaAmalView } from './components/LagaAmalView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { MLBB_HEROES } from './data/heroes';
import { INITIAL_PLAYERS, INITIAL_MATCHES } from './data/seed';
import { INITIAL_TOURNAMENTS } from './data/tournamentSeed';

type ActiveTab = 'dashboard' | 'lagaAmal' | 'tournament' | 'admin' | 'profile';

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('dashboard');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [heroes, setHeroes] = useState<Hero[]>(MLBB_HEROES);
  const [tournaments, setTournaments] = useState<TournamentData[]>(INITIAL_TOURNAMENTS);

  // Modals & active selections
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [profilePlayerId, setProfilePlayerId] = useState<number | string>(1);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('pantos_admin_token'));
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data from server
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [playersRes, matchesRes, heroesRes, tourneyRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/matches'),
        fetch('/api/heroes'),
        fetch('/api/tournaments'),
      ]);

      if (playersRes.ok) {
        const pData = await playersRes.json();
        setPlayers(pData);
      }
      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        setMatches(mData);
      }
      if (heroesRes.ok) {
        const hData = await heroesRes.json();
        setHeroes(hData);
      }
      if (tourneyRes && tourneyRes.ok) {
        const tData = await tourneyRes.json();
        if (Array.isArray(tData) && tData.length > 0) {
          setTournaments(tData);
        }
      }
    } catch (err) {
      console.warn('Using local seed data fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isAdmin && tab === 'admin') {
      setTab('dashboard');
    }
  }, [isAdmin, tab]);

  // Admin actions
  const handleSaveMatch = async (matchData: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan pertandingan');
      }

      const savedMatch = await res.json();
      // Reload updated matches & player standings
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Save match error:', err);
      throw err;
    }
  };

  const handleAddPlayer = async (newPlayerData: {
    name: string;
    status: 'Aktif' | 'Cabutan';
    tier: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayerData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambahkan pemain');
      }

      await loadData();
      return true;
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan pemain');
      return false;
    }
  };

  const handleReanalyze = async (matchId: number) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/analyze`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, ai_analysis: data.ai_analysis } : m))
        );
        if (selectedMatch && selectedMatch.id === matchId) {
          setSelectedMatch((prev) => (prev ? { ...prev, ai_analysis: data.ai_analysis } : null));
        }
      }
    } catch (err) {
      console.error('Reanalyze error:', err);
    }
  };

  const handleResetData = async () => {
    if (!confirm('Reset semua data pertandingan dan pemain ke seed awal?')) return;
    try {
      const res = await fetch('/api/reset-data', { method: 'POST' });
      if (res.ok) {
        await loadData();
        alert('Data berhasil direset ke seed awal.');
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pantos_admin_token');
    setIsAdmin(false);
    if (tab === 'admin') {
      setTab('dashboard');
    }
  };

  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'Dasbor', icon: Trophy },
    { id: 'lagaAmal' as ActiveTab, label: 'Klasemen Laga Amal', icon: FileSpreadsheet, badge: 'S41' },
    { id: 'tournament' as ActiveTab, label: 'Turnamen Tim', icon: Swords, badge: 'Musim 1' },
    ...(isAdmin
      ? [{ id: 'admin' as ActiveTab, label: 'Input & Draft', icon: ClipboardList, badge: 'Admin' }]
      : []),
    { id: 'profile' as ActiveTab, label: 'Profil Pemain', icon: UserRound },
  ];

  return (
    <div
      id="app-root"
      className="min-h-screen w-full bg-[#161311] text-[#F2EDE4] selection:bg-[#E8B33D]/30"
    >
      {/* Top Application Header */}
      <header className="border-b border-[#332C25] bg-[#191513]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#241F1B] text-[#E8B33D] shadow-inner border border-[#332C25]">
              <Swords size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg tracking-tight text-[#F2EDE4]">
                  Laga Amal Pantos
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[#E8B33D]/15 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D] uppercase">
                  <Sparkles size={10} /> MLBB AI Tracker
                </span>
              </div>
              <p className="text-[11px] text-[#9C948A]">
                <span className="font-semibold text-[#4F7942]">Tim Pohon</span> vs{' '}
                <span className="font-semibold text-[#C97A3D]">Tim Lobby</span> · Klasemen Kelas Semen
              </p>
            </div>
          </div>

          {/* Quick utility controls */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#4F7942]/60 bg-[#4F7942]/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <Unlock size={12} /> Admin Aktif
                </span>
                <button
                  id="btn-logout-admin"
                  onClick={handleLogout}
                  className="rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 text-xs text-[#9C948A] hover:bg-[#302822] hover:text-[#F2EDE4]"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                id="btn-login-admin"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#E8B33D] hover:bg-[#2b241f]"
              >
                <Lock size={12} />
                <span>Admin</span>
              </button>
            )}

            <button
              id="btn-reset-seed"
              onClick={handleResetData}
              title="Reset Data ke Awal"
              className="rounded-lg border border-[#332C25] bg-[#241F1B] p-2 text-[#9C948A] hover:bg-[#302822] hover:text-[#F2EDE4]"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {/* Navigation Tabs */}
        <nav
          id="main-nav-tabs"
          className="mb-6 flex gap-1 rounded-xl border border-[#332C25] bg-[#1D1916] p-1 shadow-sm"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                id={`nav-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'border border-[#E8B33D]/40 bg-[#241F1B] text-[#E8B33D] shadow-xs'
                    : 'text-[#9C948A] hover:bg-[#241F1B]/50 hover:text-[#F2EDE4]'
                }`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
                {t.badge && (
                  <span className="hidden sm:inline-block rounded bg-[#4F7942] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab 1: Dasbor Utama */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            {/* Skor Banner */}
            <ScoreBanner matches={matches} />

            {/* Klasemen Kelas Semen */}
            <KelasSemenTable
              players={players}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
            />

            {/* Feed Riwayat Pertandingan */}
            <MatchFeed
              matches={matches}
              onSelectMatch={(m) => setSelectedMatch(m)}
            />
          </div>
        )}

        {/* Tab: Klasemen Laga Amal (From CSV Benchmark) */}
        {tab === 'lagaAmal' && <LagaAmalView />}

        {/* Tab 2: Turnamen Klasemen */}
        {tab === 'tournament' && (
          <TournamentView
            matches={matches}
            players={players}
            tournaments={tournaments}
            onTournamentsReload={loadData}
            onSelectMatch={(m) => setSelectedMatch(m)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {/* Tab 2: Input & Draft (Hanya muncul jika admin sudah masuk) */}
        {tab === 'admin' && isAdmin && (
          <AdminInput
            players={players}
            heroes={heroes}
            isAdmin={isAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSaveMatch={handleSaveMatch}
            onAddPlayer={handleAddPlayer}
          />
        )}

        {/* Tab 3: Profil Individu Pemain */}
        {tab === 'profile' && (
          <PlayerProfile
            players={players}
            matches={matches}
            selectedPlayerId={profilePlayerId}
            onSelectPlayerId={(id) => setProfilePlayerId(id)}
          />
        )}
      </div>

      {/* Popups & Modals */}
      {/* 1. Modal Top Hero saat pemain di-klik */}
      <PlayerModal
        player={selectedPlayer}
        matches={matches}
        onClose={() => setSelectedPlayer(null)}
        onViewProfile={(pId) => {
          setProfilePlayerId(pId);
          setTab('profile');
        }}
      />

      {/* 2. Modal Detail Match & Analisis AI */}
      <MatchDetailModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onReanalyze={isAdmin ? handleReanalyze : undefined}
      />

      {/* 3. Modal Admin Login */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAdmin(true);
          setTab('admin');
        }}
      />
    </div>
  );
}
