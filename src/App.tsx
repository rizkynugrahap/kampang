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
  Database,
  Download,
} from 'lucide-react';
import { Player, Match, Hero, TournamentData, LagaAmalSeasonData } from './types';
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
import { ExportDatabaseModal } from './components/ExportDatabaseModal';
import { FirestoreStatusBadge } from './components/FirestoreStatusBadge';
import {
  subscribeToPlayers,
  subscribeToMatches,
  subscribeToTournaments,
  subscribeToLagaAmal,
  seedFirestoreIfEmpty,
  syncPlayerToFirestore,
  syncMatchToFirestore,
  forceSyncAllToFirestore,
} from './services/firestoreSync';
import { MLBB_HEROES } from './data/heroes';
import { INITIAL_PLAYERS, INITIAL_MATCHES } from './data/seed';
import { INITIAL_TOURNAMENTS } from './data/tournamentSeed';
import { INITIAL_LAGA_AMAL_S41 } from './data/lagaAmalS41Data';

type ActiveTab = 'dashboard' | 'lagaAmal' | 'tournament' | 'admin' | 'profile';

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('dashboard');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [heroes, setHeroes] = useState<Hero[]>(MLBB_HEROES);
  const [tournaments, setTournaments] = useState<TournamentData[]>(INITIAL_TOURNAMENTS);
  const [lagaAmal, setLagaAmal] = useState<LagaAmalSeasonData>(INITIAL_LAGA_AMAL_S41);

  // Modals & active selections
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [profilePlayerId, setProfilePlayerId] = useState<number | string>(1);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('pantos_admin_token'));
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  // Fetch data from server fallback
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [playersRes, matchesRes, heroesRes, tourneyRes, lagaAmalRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/matches'),
        fetch('/api/heroes'),
        fetch('/api/tournaments'),
        fetch('/api/laga-amal'),
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
      if (lagaAmalRes && lagaAmalRes.ok) {
        const laData = await lagaAmalRes.json();
        if (Array.isArray(laData) && laData.length > 0) {
          setLagaAmal(laData[0]);
        }
      }
    } catch (err) {
      console.warn('Using local seed data fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Cloud Firestore Subscriptions & Auto-seed
  useEffect(() => {
    // Initial fetch from server
    loadData();

    // Auto-seed Firestore if collections are empty
    seedFirestoreIfEmpty({
      players: INITIAL_PLAYERS,
      matches: INITIAL_MATCHES,
      tournaments: INITIAL_TOURNAMENTS,
      lagaAmal: INITIAL_LAGA_AMAL_S41,
    })
      .then((ok) => {
        if (ok) {
          setIsFirestoreConnected(true);
          setLastSyncedAt(new Date());
        }
      })
      .catch((err) => {
        console.warn('Firestore seed check error:', err);
      });

    // Real-time listener for players
    const unsubPlayers = subscribeToPlayers(
      (newPlayers) => {
        if (newPlayers && newPlayers.length > 0) {
          setPlayers(newPlayers);
        }
        setIsFirestoreConnected(true);
        setLastSyncedAt(new Date());
      },
      () => setIsFirestoreConnected(false)
    );

    // Real-time listener for matches
    const unsubMatches = subscribeToMatches(
      (newMatches) => {
        if (newMatches && newMatches.length > 0) {
          setMatches(newMatches);
        }
        setIsFirestoreConnected(true);
        setLastSyncedAt(new Date());
      },
      () => setIsFirestoreConnected(false)
    );

    // Real-time listener for tournaments
    const unsubTournaments = subscribeToTournaments(
      (newTournaments) => {
        if (newTournaments && newTournaments.length > 0) {
          setTournaments(newTournaments);
        }
        setIsFirestoreConnected(true);
        setLastSyncedAt(new Date());
      },
      () => setIsFirestoreConnected(false)
    );

    // Real-time listener for Laga Amal seasons
    const unsubLagaAmal = subscribeToLagaAmal(
      (seasons) => {
        if (seasons && seasons.length > 0) {
          setLagaAmal(seasons[0]);
        }
        setIsFirestoreConnected(true);
        setLastSyncedAt(new Date());
      },
      () => setIsFirestoreConnected(false)
    );

    return () => {
      unsubPlayers();
      unsubMatches();
      unsubTournaments();
      unsubLagaAmal();
    };
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

      const savedMatch: Match = await res.json();

      // Sync saved match & updated standings to Firestore
      try {
        await syncMatchToFirestore(savedMatch);
        setLastSyncedAt(new Date());
      } catch (fErr) {
        console.warn('Firestore sync error for new match:', fErr);
      }

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
    avatar_url?: string;
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

      const addedPlayer: Player = await res.json();

      // Sync new player to Firestore
      try {
        await syncPlayerToFirestore(addedPlayer);
        setLastSyncedAt(new Date());
      } catch (fErr) {
        console.warn('Firestore sync error for new player:', fErr);
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
        setMatches((prev) => {
          const updated = prev.map((m) => (m.id === matchId ? { ...m, ai_analysis: data.ai_analysis } : m));
          const target = updated.find((m) => m.id === matchId);
          if (target) {
            syncMatchToFirestore(target).catch((e) => console.warn('Sync reanalyze match:', e));
          }
          return updated;
        });
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
        await forceSyncAllToFirestore({
          players: INITIAL_PLAYERS,
          matches: INITIAL_MATCHES,
          tournaments: INITIAL_TOURNAMENTS,
          lagaAmal: INITIAL_LAGA_AMAL_S41,
        });
        await loadData();
        setLastSyncedAt(new Date());
        alert('Data berhasil direset dan disinkronkan ke Cloud Firestore.');
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
            <FirestoreStatusBadge
              players={players}
              matches={matches}
              tournaments={tournaments}
              lagaAmal={lagaAmal}
              isConnected={isFirestoreConnected}
              lastSyncedAt={lastSyncedAt}
              onSyncSuccess={() => {
                setLastSyncedAt(new Date());
                loadData();
              }}
            />

            <button
              id="btn-open-export-csv"
              onClick={() => setIsExportModalOpen(true)}
              title="Export Database ke CSV"
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#F2EDE4] hover:border-[#E8B33D]/50 hover:bg-[#2c241e] transition-colors"
            >
              <Database size={13} className="text-[#E8B33D]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

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
            matches={matches}
            tournaments={tournaments}
            isAdmin={isAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSaveMatch={handleSaveMatch}
            onAddPlayer={handleAddPlayer}
            onOpenExport={() => setIsExportModalOpen(true)}
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

      {/* 4. Modal Export Database ke CSV */}
      <ExportDatabaseModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        players={players}
        matches={matches}
        tournaments={tournaments}
        lagaAmal={lagaAmal}
      />
    </div>
  );
}
