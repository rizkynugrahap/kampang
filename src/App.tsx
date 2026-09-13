import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  ClipboardList,
  UserRound,
  Swords,
  Lock,
  Unlock,
  Sparkles,
  Flame,
  Image as ImageIcon,
} from 'lucide-react';
import { Player, Match, Hero, LagaAmalSeasonData } from './types';
import { ScoreBanner } from './components/ScoreBanner';
import { KelasSemenTable } from './components/KelasSemenTable';
import { MatchFeed } from './components/MatchFeed';
import { MatchDetailModal } from './components/MatchDetailModal';
import { PlayerModal } from './components/PlayerModal';
import { AdminInput } from './components/AdminInput';
import { PlayerProfile } from './components/PlayerProfile';
import { LagaAmalView } from './components/LagaAmalView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { FirestoreStatusBadge } from './components/FirestoreStatusBadge';
import { BackgroundSettingsModal, DEFAULT_GIT_BACKGROUND_URL } from './components/BackgroundSettingsModal';
import {
  subscribeToPlayers,
  subscribeToMatches,
  subscribeToLagaAmal,
  seedAdminIfEmpty,
  syncPlayerToFirestore,
  syncMatchToFirestore,
  syncLagaAmalToFirestore,
  syncPlayersBatchToFirestore,
  deleteLagaAmalFromFirestore,
} from './services/firestoreSync';
import { MLBB_HEROES } from './data/heroes';
import { INITIAL_PLAYERS, INITIAL_MATCHES } from './data/seed';
import { ALL_INITIAL_SEASONS, buildPlayersFromSeason, applyMatchToSeason, recalculateSeasonStats } from './data/seasonsSeed';
import { saveCustomPlayerAvatar, normalizeImageUrl } from './data/playerAvatars';
import { generateHeuristicMatchAnalysis } from './utils/matchAnalysis';

type ActiveTab = 'dashboard' | 'lagaAmal' | 'admin' | 'profile';

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('dashboard');

  // Multi-season state (primary source of truth)
  const [seasons, setSeasons] = useState<LagaAmalSeasonData[]>(() => {
    const saved = localStorage.getItem('pantos_seasons_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse seasons cache:', e);
      }
    }
    return ALL_INITIAL_SEASONS;
  });

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('s41');

  // Active season resolved
  const activeSeason = useMemo(() => {
    return seasons.find((s) => s.id === selectedSeasonId) || seasons[0] || ALL_INITIAL_SEASONS[0];
  }, [seasons, selectedSeasonId]);

  // Player roster always strictly follows the active Laga Amal season
  const [players, setPlayers] = useState<Player[]>(() => buildPlayersFromSeason(activeSeason));
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [heroes, setHeroes] = useState<Hero[]>(MLBB_HEROES);

  // Matches that belong to the currently selected Laga Amal season only.
  // Joined by season number (e.g. "S41") rather than an exact string match,
  // since a match's `season` label ("Season 41") and a season's `title`
  // ("KELASEMEN LAGA AMAL - S41") aren't written identically.
  const seasonMatches = useMemo(() => {
    const extractSeasonNumber = (s?: string) => s?.match(/(\d+)/)?.[1];
    const activeNum = extractSeasonNumber(activeSeason.title) || extractSeasonNumber(activeSeason.id);
    if (!activeNum) return matches;
    return matches.filter((m) => extractSeasonNumber(m.season) === activeNum);
  }, [matches, activeSeason]);

  // Modals & active selections
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [profilePlayerId, setProfilePlayerId] = useState<number | string>(1);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('pantos_admin_token'));
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  // Background state (default to user's Git repo URL and brighter default opacity)
  const [bgUrl, setBgUrl] = useState<string>(() => {
    return localStorage.getItem('pantos_custom_bg') || DEFAULT_GIT_BACKGROUND_URL;
  });
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('pantos_bg_opacity');
    return saved ? Number(saved) : 65;
  });
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  const handleSaveBgUrl = (newUrl: string) => {
    setBgUrl(newUrl);
    localStorage.setItem('pantos_custom_bg', newUrl);
  };

  const handleSaveBgOpacity = (newOpacity: number) => {
    setBgOpacity(newOpacity);
    localStorage.setItem('pantos_bg_opacity', String(newOpacity));
  };

  // Keep players in sync when activeSeason changes
  useEffect(() => {
    const derived = buildPlayersFromSeason(activeSeason);
    setPlayers(derived);
  }, [activeSeason]);

  // Initial load from backend API
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [playersRes, matchesRes, heroesRes, lagaAmalRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/matches'),
        fetch('/api/heroes'),
        fetch('/api/laga-amal'),
      ]);

      if (lagaAmalRes.ok) {
        const laData = await lagaAmalRes.json();
        if (Array.isArray(laData) && laData.length > 0) {
          setSeasons(laData);
          localStorage.setItem('pantos_seasons_cache', JSON.stringify(laData));
        }
      }

      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        if (Array.isArray(mData) && mData.length > 0) {
          setMatches(mData);
        }
      }

      if (heroesRes.ok) {
        const hData = await heroesRes.json();
        setHeroes(hData);
      }

      if (playersRes.ok) {
        const pData = await playersRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setPlayers(pData);
        }
      }
    } catch (err) {
      console.warn('Using local seed fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Cloud Firestore Subscriptions
  useEffect(() => {
    loadData();

    // NOTE: this used to also auto-reseed players/matches/seasons back to
    // the hardcoded baseline (ALL_INITIAL_SEASONS/INITIAL_PLAYERS/
    // INITIAL_MATCHES) any time Firestore looked empty. That's been
    // removed — it fought with real admin actions like deleting a season
    // or a match (any collection left empty would silently get refilled
    // with old seed data on the next reload).

    // Auto-seed the default admin login account if Firestore has none yet
    // (this one is safe to keep — it only ever creates a login account,
    // never touches real season/player/match data).
    seedAdminIfEmpty().catch((e) => console.warn('Firestore admin seeding check:', e));

    const unsubLagaAmal = subscribeToLagaAmal(
      (remoteSeasons) => {
        if (remoteSeasons && remoteSeasons.length > 0) {
          setSeasons(remoteSeasons);
          localStorage.setItem('pantos_seasons_cache', JSON.stringify(remoteSeasons));
          setLastSyncedAt(new Date());
          setIsFirestoreConnected(true);
        }
      },
      () => setIsFirestoreConnected(false)
    );

    const unsubMatches = subscribeToMatches(
      (remoteMatches) => {
        if (remoteMatches && remoteMatches.length > 0) {
          setMatches(remoteMatches);
          setLastSyncedAt(new Date());
          setIsFirestoreConnected(true);
        }
      },
      () => setIsFirestoreConnected(false)
    );

    return () => {
      unsubLagaAmal();
      unsubMatches();
    };
  }, []);

  // Update a season (both local, cache, backend & Firestore)
  const handleUpdateSeason = async (updatedSeason: LagaAmalSeasonData) => {
    const recalc = recalculateSeasonStats(updatedSeason);
    setSeasons((prev) => {
      const idx = prev.findIndex((s) => s.id === recalc.id);
      const next = [...prev];
      if (idx >= 0) {
        next[idx] = recalc;
      } else {
        next.unshift(recalc);
      }
      localStorage.setItem('pantos_seasons_cache', JSON.stringify(next));
      return next;
    });

    // Sync to Firestore & API
    try {
      await syncLagaAmalToFirestore(recalc);
      fetch('/api/laga-amal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recalc),
      }).catch((e) => console.warn('API sync season:', e));
    } catch (err) {
      console.warn('Sync season to Firestore:', err);
    }
  };

  // Save new match with player score and automatic season sync
  const handleSaveMatch = async (matchPayload: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchPayload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menyimpan pertandingan');
      }

      const resData = await res.json();
      const savedMatch: Match = resData.match || resData;

      // Update local matches
      setMatches((prev) => [savedMatch, ...prev]);

      // Apply match to active season
      const updatedSeason = applyMatchToSeason(activeSeason, savedMatch);
      await handleUpdateSeason(updatedSeason);

      // Sync match and players to Firestore
      await syncMatchToFirestore(savedMatch);
      const updatedPlayers = buildPlayersFromSeason(updatedSeason);
      setPlayers(updatedPlayers);
      await syncPlayersBatchToFirestore(updatedPlayers);

      setLastSyncedAt(new Date());
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveMatch:', err);
      // Backend unreachable — still give a real (if simpler) commentary
      // instead of a flat generic placeholder like "Pertandingan selesai
      // dengan sengit!", which used to show up here every time.
      const fallbackId = Date.now();
      const newMatch: Match = {
        id: fallbackId,
        ...matchPayload,
        ai_analysis: generateHeuristicMatchAnalysis(matchPayload),
      };
      setMatches((prev) => [newMatch, ...prev]);

      const updatedSeason = applyMatchToSeason(activeSeason, newMatch);
      await handleUpdateSeason(updatedSeason);

      return true;
    }
  };

  // Add new player
  const handleAddPlayer = async (newPlayer: {
    name: string;
    status: 'Aktif' | 'Cabutan';
    tier: string;
    avatar_url?: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayer),
      });

      let addedPlayer: Player;
      if (res.ok) {
        addedPlayer = await res.json();
      } else {
        addedPlayer = {
          id: Date.now(),
          name: newPlayer.name,
          status: newPlayer.status,
          tier: newPlayer.tier,
          total_match: 0,
          medals: { MVP: 0, Gold: 0, Silver: 0, Coklat: 0 },
          score: 0,
          avgScore: 0,
          winRate: 0,
          avatar_url: newPlayer.avatar_url,
        };
      }

      // Add to active season players if not already there
      const currentSeason = { ...activeSeason };
      if (!currentSeason.players.some((p) => p.nickname.toLowerCase() === addedPlayer.name.toLowerCase())) {
        currentSeason.players.push({
          nickname: addedPlayer.name,
          coklat: 0,
          silver: 0,
          antam: 0,
          mvp: 0,
          matches: 0,
          score: 0,
          winRate: 0,
          avgScore: 0,
          avatar_url: addedPlayer.avatar_url,
        });
        currentSeason.activePlayersCount = currentSeason.players.length;
        await handleUpdateSeason(currentSeason);
      }

      setPlayers((prev) => [...prev, addedPlayer]);
      await syncPlayerToFirestore(addedPlayer);
      return true;
    } catch (err) {
      console.warn('Error adding player:', err);
      return false;
    }
  };

  // Delete match
  const handleDeleteMatch = async (matchId: number) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!confirm(`Hapus pertandingan #${matchId}?`)) return;

    try {
      await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setSelectedMatch(null);
    } catch (err) {
      console.warn('Error deleting match:', err);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setSelectedMatch(null);
    }
  };

  // Re-run AI analysis. Sends the full match payload as a fallback so this
  // still works for matches that only exist in Firestore/local state (e.g.
  // saved while the backend was unreachable) and were never known to this
  // server's own local store.
  const handleAnalyzeMatch = async (matchId: number) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetMatch || {}),
      });
      if (res.ok) {
        const data = await res.json();
        let updatedMatch: Match | undefined;
        setMatches((prev) =>
          prev.map((m) => {
            if (m.id !== matchId) return m;
            updatedMatch = { ...m, ai_analysis: data.ai_analysis };
            return updatedMatch;
          })
        );
        if (selectedMatch && selectedMatch.id === matchId) {
          setSelectedMatch((prev) => (prev ? { ...prev, ai_analysis: data.ai_analysis } : null));
        }
        // Persist the regenerated analysis to Firestore too — otherwise it
        // only lives in local state and reverts to the stale version on
        // the next reload or for any other viewer.
        if (updatedMatch) {
          await syncMatchToFirestore(updatedMatch);
        }
        return;
      }
      throw new Error('Backend analyze endpoint returned ' + res.status);
    } catch (err) {
      console.warn('Error analyzing match via backend, using local fallback:', err);
      // Backend unreachable — generate a heuristic commentary locally so
      // the admin still gets a real (if simpler) analysis instead of the
      // request silently doing nothing.
      if (!targetMatch) return;
      const fallbackAnalysis = generateHeuristicMatchAnalysis(targetMatch);
      const updatedMatch: Match = { ...targetMatch, ai_analysis: fallbackAnalysis };
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updatedMatch : m)));
      if (selectedMatch && selectedMatch.id === matchId) {
        setSelectedMatch(updatedMatch);
      }
      try {
        await syncMatchToFirestore(updatedMatch);
      } catch (syncErr) {
        console.warn('Error syncing fallback analysis to Firestore:', syncErr);
      }
    }
  };

  // Delete an entire season/klasemen — admin only. This removes it from
  // Firestore (the real-time source of truth), the local backend store,
  // and local state. At least one season must always remain.
  const handleDeleteSeason = async (seasonId: string) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    const target = seasons.find((s) => s.id === seasonId);
    if (!target) return;

    if (seasons.length <= 1) {
      alert('Tidak bisa menghapus satu-satunya season yang tersisa.');
      return;
    }

    if (!confirm(`Hapus klasemen "${target.title}" secara permanen? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteLagaAmalFromFirestore(seasonId);

      fetch(`/api/laga-amal/${seasonId}`, { method: 'DELETE' }).catch((e) =>
        console.warn('Backend delete season sync:', e)
      );

      setSeasons((prev) => {
        const next = prev.filter((s) => s.id !== seasonId);
        localStorage.setItem('pantos_seasons_cache', JSON.stringify(next));
        if (selectedSeasonId === seasonId && next.length > 0) {
          setSelectedSeasonId(next[0].id);
        }
        return next;
      });
    } catch (err) {
      console.warn('Error deleting season:', err);
      alert('Gagal menghapus klasemen. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update player avatar photo
  const handleUpdatePlayerAvatar = async (playerId: number | string, newAvatarUrl: string): Promise<boolean> => {
    try {
      const cleanUrl = normalizeImageUrl(newAvatarUrl);

      // 1. Locate player info
      const targetPlayer = players.find(
        (p) => String(p.id) === String(playerId) || p.name.toLowerCase() === String(playerId).toLowerCase()
      );
      const pName = targetPlayer?.name || String(playerId);

      // 2. Persist to persistent localStorage avatar store & trigger immediate re-render
      saveCustomPlayerAvatar(pName, cleanUrl);

      // 3. Update player in players state
      setPlayers((prev) =>
        prev.map((p) => {
          if (String(p.id) === String(playerId) || p.name.toLowerCase() === pName.toLowerCase()) {
            return { ...p, avatar_url: cleanUrl };
          }
          return p;
        })
      );

      // 4. Update player in all seasons state & local cache
      setSeasons((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          players: s.players.map((p) =>
            p.nickname.toLowerCase() === pName.toLowerCase() ? { ...p, avatar_url: cleanUrl } : p
          ),
        }));
        localStorage.setItem('pantos_seasons_cache', JSON.stringify(updated));
        return updated;
      });

      // 5. Persist to server API
      try {
        await fetch(`/api/players/${encodeURIComponent(String(playerId))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pName, avatar_url: cleanUrl }),
        });
      } catch (err) {
        console.warn('Could not reach backend player update, local cache preserved:', err);
      }

      // 6. Persist to Cloud Firestore
      if (targetPlayer) {
        await syncPlayerToFirestore({
          ...targetPlayer,
          avatar_url: cleanUrl,
        });
      }

      return true;
    } catch (err) {
      console.error('Error updating player avatar:', err);
      return false;
    }
  };

  // Quick navigation from Laga Amal or Klasemen to Player Profile
  const handleViewPlayerProfile = (nicknameOrId: string | number) => {
    setProfilePlayerId(nicknameOrId);
    setTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#161311] text-[#F2EDE4] flex flex-col font-sans selection:bg-[#E8B33D]/30 selection:text-[#E8B33D]">
      {/* Background Image Layer (Git raw: rizkynugrahap/kampang/blob/main/src/data/bacground.png) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
        style={{
          opacity: bgOpacity / 100,
          backgroundImage: `linear-gradient(to bottom, rgba(22, 19, 17, 0.30), rgba(22, 19, 17, 0.60)), url('${bgUrl}')`,
        }}
      />
      {/* Top Main Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#332C25] bg-[#1D1916]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8B33D] to-[#b8764a] text-[#161311] shadow-md font-black text-lg">
              LP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#F2EDE4]">
                  LAGA AMAL PANTOS
                </h1>
                <span className="rounded bg-[#E8B33D]/20 border border-[#E8B33D]/30 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D]">
                  MLBB E-Sport
                </span>
              </div>
              <p className="text-[11px] text-[#9C948A] hidden sm:block">
                Sistem Papan Klasemen Season & Tracker Medali Komunitas Pantos
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Live Cloud Firestore Badge */}
            <FirestoreStatusBadge
              players={players}
              matches={matches}
              seasons={seasons}
              isConnected={isFirestoreConnected}
              lastSyncedAt={lastSyncedAt}
              onSyncSuccess={() => setLastSyncedAt(new Date())}
            />

            {/* Admin toggle button */}
            <button
              id="btn-bg-settings"
              onClick={() => setIsBgModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer"
              title="Atur Background Laga Amal (Git / Unggah)"
            >
              <ImageIcon size={13} className="text-[#E8B33D]" />
              <span className="hidden sm:inline">Background</span>
            </button>

            {isAdmin ? (
              <button
                id="btn-admin-logout"
                onClick={() => {
                  localStorage.removeItem('pantos_admin_token');
                  setIsAdmin(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors cursor-pointer"
                title="Klik untuk keluar dari Mode Admin"
              >
                <Unlock size={13} />
                <span className="hidden sm:inline">Admin Aktif</span>
              </button>
            ) : (
              <button
                id="btn-admin-login"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-3 py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer"
              >
                <Lock size={13} />
                <span className="hidden sm:inline">Masuk Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Tabs (No Tournaments, No CSV export) */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex space-x-1 sm:space-x-2 border-t border-[#332C25]/50 py-1.5 overflow-x-auto">
            <button
              id="nav-tab-dashboard"
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === 'dashboard'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Trophy size={16} />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-laga-amal"
              onClick={() => setTab('lagaAmal')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === 'lagaAmal'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Flame size={16} />
              <span>Klasemen Laga Amal</span>
              <span className="rounded-full bg-[#E8B33D]/20 px-1.5 py-0.2 text-[10px] text-[#E8B33D]">
                {activeSeason.title.split('-')[1]?.trim() || 'S41'}
              </span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setTab('profile')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === 'profile'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <UserRound size={16} />
              <span>Profil Pemain</span>
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => setTab('admin')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === 'admin'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <ClipboardList size={16} />
              <span>Input Pertandingan</span>
              {isAdmin && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {/* TAB 1: DASHBOARD (Follows Laga Amal Season) */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Split score banner */}
            <ScoreBanner matches={seasonMatches} seasonTitle={activeSeason.title} />

            {/* Grid: Kelas Semen Leaderboard & Recent Match Feed */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <KelasSemenTable
                  players={players}
                  onSelectPlayer={(p) => handleViewPlayerProfile(p.name)}
                />
              </div>

              <div className="lg:col-span-5">
                <MatchFeed
                  matches={matches}
                  onSelectMatch={(m) => setSelectedMatch(m)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KLASEMEN LAGA AMAL (Multi-Season History) */}
        {tab === 'lagaAmal' && (
          <LagaAmalView
            seasons={seasons}
            activeSeasonId={selectedSeasonId}
            onSeasonChange={(id) => setSelectedSeasonId(id)}
            onUpdateSeason={handleUpdateSeason}
            onDeleteSeason={handleDeleteSeason}
            onViewPlayerProfile={handleViewPlayerProfile}
            isAdmin={isAdmin}
          />
        )}

        {/* TAB 3: PROFIL PEMAIN */}
        {tab === 'profile' && (
          <PlayerProfile
            players={players}
            selectedPlayerId={profilePlayerId}
            onSelectPlayer={(id) => setProfilePlayerId(id)}
            activeSeason={activeSeason}
            matches={matches}
            onUpdatePlayerAvatar={handleUpdatePlayerAvatar}
          />
        )}

        {/* TAB 4: INPUT MATCH (ADMIN) */}
        {tab === 'admin' && (
          <AdminInput
            players={players}
            heroes={heroes}
            seasons={seasons}
            activeSeasonId={selectedSeasonId}
            isAdmin={isAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSaveMatch={handleSaveMatch}
            onAddPlayer={handleAddPlayer}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#332C25] bg-[#191513] py-5 text-center text-xs text-[#9C948A]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F2EDE4]">Laga Amal Pantos</span>
            <span>·</span>
            <span>Komunitas Mobile Legends Pantos</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Cloud Firestore Connected</span>
            <span>·</span>
            <span className="text-[#E8B33D]">Season {activeSeason.id.toUpperCase()}</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          matches={matches}
          onClose={() => setSelectedPlayer(null)}
          onViewProfile={() => {
            handleViewPlayerProfile(selectedPlayer.id);
            setSelectedPlayer(null);
          }}
        />
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          isAdmin={isAdmin}
          onClose={() => setSelectedMatch(null)}
          onDeleteMatch={(id) => handleDeleteMatch(id)}
          onReanalyzeMatch={(id) => handleAnalyzeMatch(id)}
          onSelectPlayer={(name) => {
            handleViewPlayerProfile(name);
            setSelectedMatch(null);
          }}
        />
      )}

      {/* Admin Login Modal */}
      {isLoginModalOpen && (
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={() => {
            setIsAdmin(true);
            setIsLoginModalOpen(false);
          }}
        />
      )}

      {/* Background Settings Modal */}
      {isBgModalOpen && (
        <BackgroundSettingsModal
          isOpen={isBgModalOpen}
          currentBgUrl={bgUrl}
          currentOpacity={bgOpacity}
          onClose={() => setIsBgModalOpen(false)}
          onSaveBgUrl={handleSaveBgUrl}
          onSaveOpacity={handleSaveBgOpacity}
        />
      )}
    </div>
  );
}
