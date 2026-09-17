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
  History,
} from 'lucide-react';
import { Player, Match, Hero, LagaAmalSeasonData } from './types';
import { ScoreBanner } from './components/ScoreBanner';
import { DashboardView } from './components/DashboardView';
import { MatchHistoryView } from './components/MatchHistoryView';
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
  subscribeToBackgroundSettings,
  syncBackgroundSettingsToFirestore,
  syncPlayerToFirestore,
  syncMatchToFirestore,
  syncLagaAmalToFirestore,
  syncPlayersBatchToFirestore,
  deleteLagaAmalFromFirestore,
  deleteMatchFromFirestore,
  deleteMatchesBatchFromFirestore,
} from './services/firestoreSync';
import { MLBB_HEROES } from './data/heroes';
import { INITIAL_PLAYERS } from './data/seed';
import { ALL_INITIAL_SEASONS, buildPlayersFromSeason, applyMatchToSeason, recalculateSeasonStats, revertMatchFromSeason } from './data/seasonsSeed';
import { saveCustomPlayerAvatar, normalizeImageUrl } from './data/playerAvatars';
import { generateHeuristicMatchAnalysis } from './utils/matchAnalysis';
import { generateHeuristicPlayerJulukan } from './utils/julukan';
import { getPlayerTopHeroes } from './utils/stats';
import { sanitizeMatches } from './utils/matchSequence';

type ActiveTab = 'dashboard' | 'matchHistory' | 'lagaAmal' | 'admin' | 'profile';

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

  // Deduplicate and sanitize player roster ensuring unique IDs and unique names
  const deduplicatePlayers = (playerList: Player[]): Player[] => {
    if (!Array.isArray(playerList)) return [];
    const seenNames = new Set<string>();
    const seenIds = new Set<string | number>();
    const result: Player[] = [];
    let maxId = 0;

    for (const p of playerList) {
      if (!p) continue;
      const nameKey = (p.name || '').trim().toLowerCase();
      if (!nameKey || seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);

      const numId = typeof p.id === 'number' && !isNaN(p.id) ? p.id : parseInt(String(p.id), 10);
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
      result.push(p);
    }

    return result.map((p) => {
      let assignedId = p.id;
      if (assignedId === undefined || assignedId === null || seenIds.has(assignedId)) {
        maxId += 1;
        assignedId = maxId;
      }
      seenIds.add(assignedId);
      return {
        ...p,
        id: assignedId,
      };
    });
  };

  // Player roster always strictly follows the active Laga Amal season
  const [players, setPlayers] = useState<Player[]>(() =>
    deduplicatePlayers(buildPlayersFromSeason(activeSeason))
  );

  // Tier ("Ubah Badge & Tier"), status ("badge" Aktif/Cabutan), julukan, and
  // custom avatar are admin-set fields that live only in Firestore's
  // `players` collection — they aren't part of the season roster stats at
  // all. Whenever the player list gets rebuilt from season data (below),
  // those fields must be carried over instead of silently reset to their
  // auto-computed defaults, which is why badge/tier edits used to "revert"
  // on refresh or after any new match was added.
  const mergePlayerOverrides = (basePlayers: Player[], overridesSource: Player[]): Player[] => {
    const cleanBase = deduplicatePlayers(basePlayers);
    const cleanOverrides = deduplicatePlayers(overridesSource);

    const merged = cleanBase.map((base) => {
      const override = cleanOverrides.find(
        (o) => o.name.toLowerCase() === base.name.toLowerCase()
      );
      if (!override) return base;
      return {
        ...base,
        tier: override.tier ?? base.tier,
        status: override.status ?? base.status,
        julukan: override.julukan ?? base.julukan,
        julukan_updated_at: override.julukan_updated_at ?? base.julukan_updated_at,
        avatar_url: override.avatar_url ?? base.avatar_url,
      };
    });

    for (const extra of cleanOverrides) {
      if (!extra || !extra.name) continue;
      const alreadyIn = merged.some((m) => m.name.toLowerCase() === extra.name.toLowerCase());
      if (!alreadyIn) {
        merged.push(extra);
      }
    }

    return deduplicatePlayers(merged);
  };

  // Primary source of truth for matches (persisted in cache and synced with backend & Firestore)
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('pantos_matches_cache');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Failed to parse matches cache:', e);
      }
    }
    return [];
  });
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
  const [draftForAdmin, setDraftForAdmin] = useState<{
    pohon: Array<{ player: string; hero: string }>;
    lobby: Array<{ player: string; hero: string }>;
  } | null>(null);

  const handleExportDraftToAdmin = (draft: {
    pohon: Array<{ player: string; hero: string }>;
    lobby: Array<{ player: string; hero: string }>;
  }) => {
    setDraftForAdmin(draft);
    setTab('admin');
  };
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [firestoreNotice, setFirestoreNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  const showFirestoreNotice = (msg: string, isError = true) => {
    setFirestoreNotice({ message: msg, isError });
    setTimeout(() => {
      setFirestoreNotice((prev) => (prev?.message === msg ? null : prev));
    }, 7000);
  };

  // Background state — cached instantly from localStorage on load (so
  // there's no flash of the default image), then kept permanently in sync
  // with Firestore below so it survives refresh AND carries over to every
  // device/browser, not just the one that set it.
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
    syncBackgroundSettingsToFirestore({ bgUrl: newUrl }).catch((e) =>
      console.warn('Gagal menyimpan background ke Firestore:', e)
    );
  };

  const handleSaveBgOpacity = (newOpacity: number) => {
    setBgOpacity(newOpacity);
    localStorage.setItem('pantos_bg_opacity', String(newOpacity));
    syncBackgroundSettingsToFirestore({ bgOpacity: newOpacity }).catch((e) =>
      console.warn('Gagal menyimpan opacity background ke Firestore:', e)
    );
  };

  // Keep players in sync when activeSeason changes
  useEffect(() => {
    const derived = buildPlayersFromSeason(activeSeason);
    setPlayers((prev) => mergePlayerOverrides(derived, prev));
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
        if (Array.isArray(mData)) {
          const { sanitized, remapped } = sanitizeMatches(mData);
          setMatches(sanitized);
          localStorage.setItem('pantos_matches_cache', JSON.stringify(sanitized));
          if (remapped.length > 0) {
            remapped.forEach(async ({ oldId, newId }) => {
              const corrected = sanitized.find((m) => m.id === newId);
              if (corrected) {
                try {
                  await syncMatchToFirestore(corrected);
                  await deleteMatchFromFirestore(oldId);
                } catch (e) {
                  console.warn('Match ID remapping sync error:', e);
                }
              }
            });
          }
        }
      }

      if (heroesRes.ok) {
        const hData = await heroesRes.json();
        setHeroes(hData);
      }

      if (playersRes.ok) {
        const pData = await playersRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setPlayers((prev) => mergePlayerOverrides(prev, pData));
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
        if (Array.isArray(remoteMatches)) {
          const { sanitized, remapped } = sanitizeMatches(remoteMatches);
          setMatches(sanitized);
          localStorage.setItem('pantos_matches_cache', JSON.stringify(sanitized));
          setLastSyncedAt(new Date());
          setIsFirestoreConnected(true);
          if (remapped.length > 0) {
            remapped.forEach(async ({ oldId, newId }) => {
              const corrected = sanitized.find((m) => m.id === newId);
              if (corrected) {
                try {
                  await syncMatchToFirestore(corrected);
                  await deleteMatchFromFirestore(oldId);
                } catch (e) {
                  console.warn('Match ID remapping sync error:', e);
                }
              }
            });
          }
        }
      },
      () => setIsFirestoreConnected(false)
    );

    // Live-sync admin-set player fields (badge/status, tier, julukan,
    // custom avatar) across every device. This was imported but never
    // actually wired up before, so those edits only ever lived in
    // whichever browser made them (and got wiped out on top of that by the
    // season-sync effect above) — never truly saved anywhere permanent.
    const unsubPlayers = subscribeToPlayers(
      (remotePlayers) => {
        if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
          setPlayers((prev) => mergePlayerOverrides(prev, remotePlayers));
          localStorage.setItem('pantos_players_cache', JSON.stringify(remotePlayers));
          setLastSyncedAt(new Date());
          setIsFirestoreConnected(true);
        }
      },
      () => setIsFirestoreConnected(false)
    );

    // Keep background image/opacity permanently in sync across every
    // device — this used to only live in localStorage, so it "reset" on
    // any other browser/device and never actually persisted anywhere
    // shared.
    const unsubBackground = subscribeToBackgroundSettings((remoteBg) => {
      if (!remoteBg) return;
      if (typeof remoteBg.bgUrl === 'string' && remoteBg.bgUrl) {
        setBgUrl(remoteBg.bgUrl);
        localStorage.setItem('pantos_custom_bg', remoteBg.bgUrl);
      }
      if (typeof remoteBg.bgOpacity === 'number' && !isNaN(remoteBg.bgOpacity)) {
        setBgOpacity(remoteBg.bgOpacity);
        localStorage.setItem('pantos_bg_opacity', String(remoteBg.bgOpacity));
      }
    });

    return () => {
      unsubLagaAmal();
      unsubMatches();
      unsubPlayers();
      unsubBackground();
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
    } catch (err: any) {
      console.error('Sync season to Firestore failed:', err);
      showFirestoreNotice(
        `Perubahan klasemen tersimpan lokal, namun gagal disinkronkan ke Firestore: ${err?.message || 'Missing or insufficient permissions'}. Cek tab Rules di Firebase Console.`
      );
    }
  };

  // Save new match with player score and automatic season sync
  const handleSaveMatch = async (matchPayload: any): Promise<boolean> => {
    let savedMatch: Match;

    // Calculate reliable sequential ID (< 1,000,000)
    const validMatchIds = matches
      .map((m) => Number(m.id))
      .filter((id) => !isNaN(id) && id > 0 && id < 1000000);
    const targetId =
      typeof matchPayload.id === 'number' && matchPayload.id > 0 && matchPayload.id < 1000000
        ? matchPayload.id
        : validMatchIds.length > 0
        ? Math.max(...validMatchIds) + 1
        : matches.length + 1;

    const payloadWithId = {
      ...matchPayload,
      id: targetId,
      matchNumber: targetId,
    };

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithId),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menyimpan pertandingan');
      }

      const resData = await res.json();
      const candidate = resData.match || resData;
      const candidateId = Number(candidate.id);
      savedMatch = {
        ...candidate,
        id: !isNaN(candidateId) && candidateId > 0 && candidateId < 1000000 ? candidateId : targetId,
        matchNumber: targetId,
      };

      // Update local matches
      setMatches((prev) => {
        const next = [savedMatch, ...prev.filter((m) => m.id !== savedMatch.id)];
        localStorage.setItem('pantos_matches_cache', JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      console.error('Error saving match to backend, using local fallback:', err);
      // Fallback ALWAYS uses targetId — NEVER Date.now()!
      savedMatch = {
        id: targetId,
        matchNumber: targetId,
        ...matchPayload,
        ai_analysis: generateHeuristicMatchAnalysis(matchPayload),
      };
      setMatches((prev) => [savedMatch, ...prev.filter((m) => m.id !== savedMatch.id)]);
    }

    // Apply match to active season (local + backend cache) regardless of
    // which path above ran.
    const updatedSeason = applyMatchToSeason(activeSeason, savedMatch);
    await handleUpdateSeason(updatedSeason);
    const updatedPlayers = buildPlayersFromSeason(updatedSeason);
    setPlayers(updatedPlayers);

    // Sync match and players to Firestore — kept in its OWN try/catch so a
    // Firestore failure (e.g. security rules not deployed on the current
    // project) doesn't get mistaken for "backend unreachable" and silently
    // produce a duplicate local-only match. This is also the one place
    // that decides whether the match survives a page refresh at all, so
    // its failure needs to be loud, not swallowed.
    try {
      await syncMatchToFirestore(savedMatch);
      await syncPlayersBatchToFirestore(updatedPlayers);
      setLastSyncedAt(new Date());
    } catch (syncErr: any) {
      console.error('Error syncing match to Firestore:', syncErr);
      showFirestoreNotice(
        `Pertandingan tersimpan lokal, namun gagal disinkronkan ke Firestore: ${syncErr?.message || 'Missing or insufficient permissions'}. Cek tab Rules di Firebase Console.`
      );
    }

    return true;
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

      setPlayers((prev) => {
        const cleanPrev = deduplicatePlayers(prev);
        const exists = cleanPrev.some(
          (p) =>
            p.name.toLowerCase() === addedPlayer.name.toLowerCase() ||
            String(p.id) === String(addedPlayer.id)
        );
        if (exists) {
          return cleanPrev.map((p) =>
            p.name.toLowerCase() === addedPlayer.name.toLowerCase()
              ? { ...p, ...addedPlayer }
              : p
          );
        }
        return deduplicatePlayers([...cleanPrev, addedPlayer]);
      });
      await syncPlayerToFirestore(addedPlayer);
      return true;
    } catch (err: any) {
      console.error('Error adding player:', err);
      showFirestoreNotice(
        `Pemain baru tersimpan lokal, namun gagal ke Firestore: ${err?.message || 'Missing or insufficient permissions'}. Cek tab Rules.`
      );
      return false;
    }
  };

  // Delete match
  const handleDeleteMatch = async (matchId: number) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      setIsLoading(true);

      // 1. Delete from Firestore so it doesn't reappear on snapshot/refresh
      await deleteMatchFromFirestore(matchId);

      // 2. Delete from backend server
      fetch(`/api/matches/${matchId}`, { method: 'DELETE' }).catch((e) =>
        console.warn('Backend delete match sync:', e)
      );

      // 3. Find the deleted match for reverting season stats
      const deletedMatch = matches.find((m) => m.id === matchId);

      // 4. Update local matches state
      setMatches((prev) => {
        const next = prev.filter((m) => m.id !== matchId);
        localStorage.setItem('pantos_matches_cache', JSON.stringify(next));
        return next;
      });
      if (selectedMatch && selectedMatch.id === matchId) {
        setSelectedMatch(null);
      }

      // 5. If this match belonged to a season, revert its impact on that season
      if (deletedMatch) {
        setSeasons((prevSeasons) => {
          const nextSeasons = prevSeasons.map((s) => {
            const extractNum = (str?: string) => str?.match(/(\d+)/)?.[1];
            const sNum = extractNum(s.title) || extractNum(s.id);
            const mNum = extractNum(deletedMatch.season);
            const isTargetSeason =
              (sNum && mNum === sNum) ||
              s.id === deletedMatch.season ||
              s.title === deletedMatch.season;

            if (isTargetSeason) {
              const reverted = revertMatchFromSeason(s, deletedMatch);
              // sync reverted season to firestore & API
              syncLagaAmalToFirestore(reverted).catch((err) => {
                console.error('Sync reverted season:', err);
                showFirestoreNotice(
                  `Statistik klasemen tersimpan lokal, namun gagal ke Firestore: ${err?.message || 'Izin ditolak'}.`
                );
              });
              return reverted;
            }
            return s;
          });
          localStorage.setItem('pantos_seasons_cache', JSON.stringify(nextSeasons));
          return nextSeasons;
        });
      }
    } catch (err: any) {
      console.error('Error deleting match:', err);
      showFirestoreNotice(
        `Pertandingan dihapus dari tampilan, namun gagal di Firestore: ${err?.message || 'Missing or insufficient permissions'}.`
      );
      setMatches((prev) => {
        const next = prev.filter((m) => m.id !== matchId);
        localStorage.setItem('pantos_matches_cache', JSON.stringify(next));
        return next;
      });
      if (selectedMatch && selectedMatch.id === matchId) {
        setSelectedMatch(null);
      }
    } finally {
      setIsLoading(false);
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
            updatedMatch = { ...m, ai_analysis: data.ai_analysis, is_generating_analysis: false };
            return updatedMatch;
          })
        );
        if (selectedMatch && selectedMatch.id === matchId) {
          setSelectedMatch((prev) => (prev ? { ...prev, ai_analysis: data.ai_analysis, is_generating_analysis: false } : null));
        }
        // Persist the regenerated analysis to Firestore too
        if (updatedMatch) {
          await syncMatchToFirestore(updatedMatch);
        }
        return;
      }
      throw new Error('Backend analyze endpoint returned ' + res.status);
    } catch (err) {
      console.warn('Error analyzing match via backend, using local fallback:', err);
      if (!targetMatch) return;
      const fallbackAnalysis = generateHeuristicMatchAnalysis(targetMatch);
      const updatedMatch: Match = { ...targetMatch, ai_analysis: fallbackAnalysis, is_generating_analysis: false };
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
  // and local state, along with all associated matches. At least one season must always remain.
  const handleDeleteSeason = async (seasonId: string) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }

    const target = seasons.find((s) => s.id === seasonId);
    if (!target) return;

    if (seasons.length <= 1) {
      return;
    }

    const extractSeasonNumber = (s?: string) => s?.match(/(\d+)/)?.[1];
    const targetNum = extractSeasonNumber(target.title) || extractSeasonNumber(target.id);
    const matchesToDelete = matches.filter((m) => {
      const mNum = extractSeasonNumber(m.season);
      return (
        (targetNum && mNum === targetNum) ||
        m.season === target.id ||
        m.season === target.title ||
        (m.season && m.season.toLowerCase().includes(target.id.toLowerCase()))
      );
    });

    try {
      setIsLoading(true);

      // 1. Delete season doc from Firestore
      await deleteLagaAmalFromFirestore(seasonId);

      // 2. Cascade delete all matching matches from Firestore
      if (matchesToDelete.length > 0) {
        await deleteMatchesBatchFromFirestore(matchesToDelete.map((m) => m.id));
      }

      // 3. Delete from backend server
      fetch(`/api/laga-amal/${seasonId}`, { method: 'DELETE' }).catch((e) =>
        console.warn('Backend delete season sync:', e)
      );

      // 4. Update local matches state
      if (matchesToDelete.length > 0) {
        const toDeleteIds = new Set(matchesToDelete.map((m) => m.id));
        setMatches((prev) => prev.filter((m) => !toDeleteIds.has(m.id)));
        if (selectedMatch && toDeleteIds.has(selectedMatch.id)) {
          setSelectedMatch(null);
        }
      }

      // 5. Update local seasons state
      setSeasons((prev) => {
        const next = prev.filter((s) => s.id !== seasonId);
        localStorage.setItem('pantos_seasons_cache', JSON.stringify(next));
        if (selectedSeasonId === seasonId && next.length > 0) {
          setSelectedSeasonId(next[0].id);
        }
        return next;
      });
    } catch (err: any) {
      console.error('Error deleting season:', err);
      showFirestoreNotice(
        `Klasemen dihapus dari tampilan, namun gagal di Firestore: ${err?.message || 'Missing or insufficient permissions'}.`
      );
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

  // Update player status, tier, or other profile details (Admin)
  const handleUpdatePlayerDetails = async (
    playerId: number | string,
    updates: Partial<Player>
  ): Promise<boolean> => {
    try {
      const targetPlayer = players.find(
        (p) => String(p.id) === String(playerId) || p.name.toLowerCase() === String(playerId).toLowerCase()
      );
      if (!targetPlayer) return false;

      const updatedPlayer: Player = { ...targetPlayer, ...updates };

      // 1. Update state immediately
      setPlayers((prev) =>
        prev.map((p) =>
          String(p.id) === String(playerId) || p.name.toLowerCase() === targetPlayer.name.toLowerCase()
            ? updatedPlayer
            : p
        )
      );

      // 2. Persist to server API
      try {
        await fetch(`/api/players/${encodeURIComponent(String(playerId))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetPlayer.name, ...updates }),
        });
      } catch (err) {
        console.warn('Failed to update player details on backend:', err);
      }

      // 3. Persist to Cloud Firestore
      await syncPlayerToFirestore(updatedPlayer);

      return true;
    } catch (err: any) {
      console.error('Error updating player details:', err);
      showFirestoreNotice(
        `Perubahan pemain tersimpan lokal, namun gagal ke Firestore: ${err?.message || 'Missing or insufficient permissions'}.`
      );
      return false;
    }
  };

  // Generate creative Pantos AI title for player (Weekly AI update or manual admin click)
  const handleGeneratePlayerJulukan = async (playerId: number | string): Promise<string | null> => {
    const targetPlayer = players.find(
      (p) => String(p.id) === String(playerId) || p.name.toLowerCase() === String(playerId).toLowerCase()
    );
    if (!targetPlayer) return null;

    try {
      // Send the player we already have (from Firestore) as a fallback —
      // this backend's own local store can be stale/out of sync with real
      // player data, which used to 404 silently here.
      const topHeroNames = getPlayerTopHeroes(targetPlayer.name, seasonMatches, activeSeason).map((h) => h.hero);
      const res = await fetch(`/api/players/${encodeURIComponent(String(playerId))}/generate-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: targetPlayer, topHeroes: topHeroNames }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.julukan) {
          const nowIso = data.julukan_updated_at || new Date().toISOString();
          const updatedPlayer: Player = {
            ...targetPlayer,
            julukan: data.julukan,
            julukan_updated_at: nowIso,
          };

          // Update local state
          setPlayers((prev) =>
            prev.map((p) =>
              String(p.id) === String(playerId) || p.name.toLowerCase() === targetPlayer.name.toLowerCase()
                ? updatedPlayer
                : p
            )
          );

          // Sync to Cloud Firestore
          await syncPlayerToFirestore(updatedPlayer);

          return data.julukan;
        }
      }
      throw new Error('Backend generate-title endpoint returned ' + res.status);
    } catch (err) {
      console.warn('Error generating player title via backend, using local fallback:', err);
      // Backend unreachable — generate a heuristic julukan locally instead
      // of silently returning nothing (which is what made this feature
      // look broken).
      const seasonStat = activeSeason.players.find(
        (p) => p.nickname.toLowerCase() === targetPlayer.name.toLowerCase()
      );
      const fallbackJulukan = generateHeuristicPlayerJulukan(targetPlayer, seasonStat);
      const nowIso = new Date().toISOString();
      const updatedPlayer: Player = { ...targetPlayer, julukan: fallbackJulukan, julukan_updated_at: nowIso };

      setPlayers((prev) =>
        prev.map((p) =>
          String(p.id) === String(playerId) || p.name.toLowerCase() === targetPlayer.name.toLowerCase()
            ? updatedPlayer
            : p
        )
      );

      try {
        await syncPlayerToFirestore(updatedPlayer);
      } catch (syncErr) {
        console.warn('Error syncing fallback julukan to Firestore:', syncErr);
      }

      return fallbackJulukan;
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8B33D] to-[#b8764a] text-[#161311] shadow-md font-black text-base sm:text-lg">
              LP
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-[#F2EDE4]">
                  LAGA AMAL PANTOS
                </h1>
                <span className="rounded bg-[#E8B33D]/20 border border-[#E8B33D]/30 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#E8B33D]">
                  MLBB
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#9C948A] hidden sm:block">
                Sistem Papan Klasemen Season & Tracker Medali Komunitas Pantos
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Admin toggle button */}
            <button
              id="btn-bg-settings"
              onClick={() => setIsBgModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer min-h-[38px]"
              title="Atur Background Laga Amal (Git / Unggah)"
            >
              <ImageIcon size={14} className="text-[#E8B33D]" />
              <span className="hidden md:inline">Background</span>
            </button>

            {isAdmin ? (
              <button
                id="btn-admin-logout"
                onClick={() => {
                  localStorage.removeItem('pantos_admin_token');
                  setIsAdmin(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors cursor-pointer min-h-[38px]"
                title="Klik untuk keluar dari Mode Admin"
              >
                <Unlock size={14} />
                <span className="hidden sm:inline">Admin Aktif</span>
              </button>
            ) : (
              <button
                id="btn-admin-login"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer min-h-[38px]"
              >
                <Lock size={14} />
                <span className="hidden sm:inline">Masuk Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Tabs: Only shown on Tablet / Desktop (md+) */}
        <div className="hidden md:block mx-auto max-w-7xl px-2 sm:px-6">
          <nav className="flex space-x-1 sm:space-x-2 border-t border-[#332C25]/50 py-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              id="nav-tab-dashboard"
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'dashboard'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md shadow-[#E8B33D]/20 font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Trophy size={15} className="shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-match-history"
              onClick={() => setTab('matchHistory')}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'matchHistory'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md shadow-[#E8B33D]/20 font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <History size={15} className="shrink-0" />
              <span>Riwayat Pertandingan</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                tab === 'matchHistory' ? 'bg-[#161311]/20 text-[#161311]' : 'bg-[#E8B33D]/20 text-[#E8B33D]'
              }`}>
                {seasonMatches.length}
              </span>
            </button>

            <button
              id="nav-tab-laga-amal"
              onClick={() => setTab('lagaAmal')}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'lagaAmal'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md shadow-[#E8B33D]/20 font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Flame size={15} className="shrink-0" />
              <span>Klasemen Laga Amal</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                tab === 'lagaAmal' ? 'bg-[#161311]/20 text-[#161311]' : 'bg-[#E8B33D]/20 text-[#E8B33D]'
              }`}>
                {activeSeason.title.split('-')[1]?.trim() || 'S41'}
              </span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setTab('profile')}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'profile'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md shadow-[#E8B33D]/20 font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <UserRound size={15} className="shrink-0" />
              <span>Profil Pemain</span>
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => setTab('admin')}
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'admin'
                  ? 'bg-[#E8B33D] text-[#161311] shadow-md shadow-[#E8B33D]/20 font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <ClipboardList size={15} className="shrink-0" />
              <span>Input Pertandingan</span>
              {isAdmin && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Non-blocking Firestore Banner / Notification */}
      {firestoreNotice && (
        <div className="sticky top-[61px] z-30 px-4 py-2 bg-gradient-to-r from-amber-950/95 to-[#2A1D13] border-b border-amber-500/40 text-xs text-[#F2EDE4] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span className="font-medium text-amber-200">{firestoreNotice.message}</span>
            <button
              onClick={() => {
                const btn = document.getElementById('btn-firestore-status');
                if (btn) btn.click();
              }}
              className="ml-2 text-xs text-amber-300 underline hover:text-amber-200 font-semibold cursor-pointer shrink-0"
            >
              Panduan Rules
            </button>
          </div>
          <button
            onClick={() => setFirestoreNotice(null)}
            className="text-[#9C948A] hover:text-[#F2EDE4] px-2 py-1 rounded text-sm cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6 py-4 pb-24 md:py-6 md:pb-8">
        {/* TAB 1: DASHBOARD (Refurbished according to user requirements) */}
        {tab === 'dashboard' && (
          <DashboardView
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={(id) => setSelectedSeasonId(id)}
            activeSeason={activeSeason}
            seasonMatches={seasonMatches}
            players={players}
            heroes={heroes}
            onSelectPlayer={(pName) => handleViewPlayerProfile(pName)}
            onExportToAdmin={handleExportDraftToAdmin}
          />
        )}

        {/* TAB 2: RIWAYAT PERTANDINGAN (New dedicated tab with AI analysis highlight) */}
        {tab === 'matchHistory' && (
          <MatchHistoryView
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={(id) => setSelectedSeasonId(id)}
            activeSeason={activeSeason}
            matches={seasonMatches}
            onSelectMatch={(m) => setSelectedMatch(m)}
            onDeleteMatch={handleDeleteMatch}
            isAdmin={isAdmin}
          />
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
            matches={seasonMatches}
            isAdmin={isAdmin}
            onUpdatePlayerAvatar={handleUpdatePlayerAvatar}
            onUpdatePlayerDetails={handleUpdatePlayerDetails}
            onGenerateJulukan={handleGeneratePlayerJulukan}
          />
        )}

        {/* TAB 4: INPUT MATCH (ADMIN) */}
        {tab === 'admin' && (
          <AdminInput
            players={players}
            heroes={heroes}
            matches={matches}
            seasons={seasons}
            activeSeasonId={selectedSeasonId}
            isAdmin={isAdmin}
            prefilledDraft={draftForAdmin}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSaveMatch={handleSaveMatch}
            onAddPlayer={handleAddPlayer}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#332C25] bg-[#191513] py-5 pb-24 md:pb-5 text-center text-xs text-[#9C948A]">
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

      {/* Mobile Bottom Navigation Bar: Visible ONLY on mobile, hidden on md+ */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#332C25] bg-[#191513]/95 backdrop-blur-xl px-2 pt-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {/* 1. Dashboard */}
          <button
            id="mobile-btn-dashboard"
            type="button"
            onClick={() => {
              setTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              tab === 'dashboard'
                ? 'text-[#E8B33D]'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <div
              className={`flex items-center justify-center h-7 w-12 rounded-full transition-all ${
                tab === 'dashboard' ? 'bg-[#E8B33D]/20 shadow-sm' : ''
              }`}
            >
              <Trophy
                size={18}
                className={tab === 'dashboard' ? 'text-[#E8B33D]' : 'text-[#9C948A]'}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                tab === 'dashboard' ? 'font-black text-[#E8B33D]' : 'font-medium'
              }`}
            >
              Dashboard
            </span>
          </button>

          {/* 2. Riwayat */}
          <button
            id="mobile-btn-history"
            type="button"
            onClick={() => {
              setTab('matchHistory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              tab === 'matchHistory'
                ? 'text-[#E8B33D]'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <div
              className={`relative flex items-center justify-center h-7 w-12 rounded-full transition-all ${
                tab === 'matchHistory' ? 'bg-[#E8B33D]/20 shadow-sm' : ''
              }`}
            >
              <History
                size={18}
                className={tab === 'matchHistory' ? 'text-[#E8B33D]' : 'text-[#9C948A]'}
              />
              {seasonMatches.length > 0 && (
                <span className="absolute -top-0.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#E8B33D] px-1 text-[9px] font-black text-[#161311]">
                  {seasonMatches.length}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                tab === 'matchHistory' ? 'font-black text-[#E8B33D]' : 'font-medium'
              }`}
            >
              Riwayat
            </span>
          </button>

          {/* 3. Klasemen */}
          <button
            id="mobile-btn-standings"
            type="button"
            onClick={() => {
              setTab('lagaAmal');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              tab === 'lagaAmal'
                ? 'text-[#E8B33D]'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <div
              className={`flex items-center justify-center h-7 w-12 rounded-full transition-all ${
                tab === 'lagaAmal' ? 'bg-[#E8B33D]/20 shadow-sm' : ''
              }`}
            >
              <Flame
                size={18}
                className={tab === 'lagaAmal' ? 'text-[#E8B33D]' : 'text-[#9C948A]'}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                tab === 'lagaAmal' ? 'font-black text-[#E8B33D]' : 'font-medium'
              }`}
            >
              Klasemen
            </span>
          </button>

          {/* 4. Profil */}
          <button
            id="mobile-btn-profile"
            type="button"
            onClick={() => {
              setTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              tab === 'profile'
                ? 'text-[#E8B33D]'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <div
              className={`flex items-center justify-center h-7 w-12 rounded-full transition-all ${
                tab === 'profile' ? 'bg-[#E8B33D]/20 shadow-sm' : ''
              }`}
            >
              <UserRound
                size={18}
                className={tab === 'profile' ? 'text-[#E8B33D]' : 'text-[#9C948A]'}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                tab === 'profile' ? 'font-black text-[#E8B33D]' : 'font-medium'
              }`}
            >
              Profil
            </span>
          </button>

          {/* 5. Input */}
          <button
            id="mobile-btn-admin"
            type="button"
            onClick={() => {
              setTab('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              tab === 'admin'
                ? 'text-[#E8B33D]'
                : 'text-[#9C948A] hover:text-[#F2EDE4]'
            }`}
          >
            <div
              className={`relative flex items-center justify-center h-7 w-12 rounded-full transition-all ${
                tab === 'admin' ? 'bg-[#E8B33D]/20 shadow-sm' : ''
              }`}
            >
              <ClipboardList
                size={18}
                className={tab === 'admin' ? 'text-[#E8B33D]' : 'text-[#9C948A]'}
              />
              {isAdmin && (
                <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-[#191513]" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                tab === 'admin' ? 'font-black text-[#E8B33D]' : 'font-medium'
              }`}
            >
              Input
            </span>
          </button>
        </div>
      </nav>

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
