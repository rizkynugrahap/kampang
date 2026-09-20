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
  Users,
} from 'lucide-react';
import { Player, Match, Hero, LagaAmalSeasonData } from './types';
import { ScoreBanner } from './components/ScoreBanner';
import { DashboardView } from './components/DashboardView';
import { MatchHistoryView } from './components/MatchHistoryView';
import { MatchDetailModal } from './components/MatchDetailModal';
import { PlayerModal } from './components/PlayerModal';
import { AdminInput } from './components/AdminInput';
import { PlayerProfile } from './components/PlayerProfile';
import { PlayerCrudManager } from './components/PlayerCrudManager';
import { LagaAmalView } from './components/LagaAmalView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SupabaseStatusBadge } from './components/SupabaseStatusBadge';
import {
  BackgroundSettingsModal,
  DEFAULT_GIT_BACKGROUND_URL,
  DEFAULT_THEME_CONFIG,
  ThemeConfig,
} from './components/BackgroundSettingsModal';
import {
  subscribeToPlayers,
  subscribeToMatches,
  subscribeToLagaAmal,
  seedAdminIfEmpty,
  subscribeToBackgroundSettings,
  syncBackgroundSettingsToSupabase,
  subscribeToActiveSeason,
  syncActiveSeasonToSupabase,
  syncPlayerToSupabase,
  syncMatchToSupabase,
  syncLagaAmalToSupabase,
  syncPlayersBatchToSupabase,
  deleteLagaAmalFromSupabase,
  deleteMatchFromSupabase,
  deleteMatchesBatchFromSupabase,
  deletePlayerFromSupabase,
} from './services/supabaseSync';
import { MLBB_HEROES } from './data/heroes';
import { buildPlayersFromSeason, applyMatchToSeason, recalculateSeasonStats, revertMatchFromSeason, EMPTY_SEASON, sortSeasonsDescending } from './utils/seasonCalculations';
import { saveCustomPlayerAvatar, normalizeImageUrl } from './data/playerAvatars';
import { generateHeuristicMatchAnalysis } from './utils/matchAnalysis';
import { generateHeuristicPlayerJulukan } from './utils/julukan';
import { getPlayerTopHeroes } from './utils/stats';
import { sanitizeMatches } from './utils/matchSequence';

type ActiveTab = 'dashboard' | 'matchHistory' | 'lagaAmal' | 'admin' | 'profile' | 'players';

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'match' | 'players'>('match');

  // Multi-season state (primary source of truth from database, kept sorted descending)
  const [seasons, setSeasons] = useState<LagaAmalSeasonData[]>(() => {
    const saved = localStorage.getItem('pantos_seasons_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sortSeasonsDescending(parsed);
      } catch (e) {
        console.warn('Failed to parse seasons cache:', e);
      }
    }
    return [];
  });

  const [activeSeasonId, setActiveSeasonId] = useState<string>(() => {
    return localStorage.getItem('pantos_active_season_id') || '';
  });

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => {
    return localStorage.getItem('pantos_active_season_id') || '';
  });

  // Active season resolved: prioritize selected view, then activeSeasonId, then isActive tag, then first season
  const activeSeason = useMemo(() => {
    if (seasons.length === 0) return EMPTY_SEASON;
    return (
      seasons.find((s) => s.id === selectedSeasonId) ||
      seasons.find((s) => s.id === activeSeasonId) ||
      seasons.find((s) => s.isActive) ||
      seasons[0]
    );
  }, [seasons, selectedSeasonId, activeSeasonId]);

  // Keep activeSeasonId and selectedSeasonId in sync when seasons list loads
  useEffect(() => {
    if (seasons.length > 0) {
      if (!activeSeasonId) {
        const foundActive = seasons.find((s) => s.isActive)?.id || seasons[0].id;
        setActiveSeasonId(foundActive);
        localStorage.setItem('pantos_active_season_id', foundActive);
        if (!selectedSeasonId) {
          setSelectedSeasonId(foundActive);
        }
      } else if (!selectedSeasonId) {
        setSelectedSeasonId(activeSeasonId);
      }
    }
  }, [seasons, activeSeasonId, selectedSeasonId]);

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
        // julukan is intentionally NOT carried over from a cross-season/global
        // override here — it must always come from the active season's own
        // data (base), since it's auto-generated per season from that
        // season's own match results and should never leak between seasons.
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

  // "Database Pemain" and "Input Pertandingan" are admin-only pages — if
  // the admin session ends (logout, expired token) while one of these is
  // open, bounce back to the public Dashboard instead of leaving a
  // now-unauthorized page on screen.
  useEffect(() => {
    if (!isAdmin && (tab === 'admin' || tab === 'players')) {
      setTab('dashboard');
    }
  }, [isAdmin, tab]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [syncNotice, setSyncNotice] = useState<{ message: string; isError?: boolean } | null>(null);

  const showSyncNotice = (msg: string, isError = true) => {
    setSyncNotice({ message: msg, isError });
    setTimeout(() => {
      setSyncNotice((prev) => (prev?.message === msg ? null : prev));
    }, 7000);
  };

  // Theme and Branding state (Background, Opacity, Logo, Brand Name, Slogan, Header & Button Colors)
  // Cached instantly from localStorage and synced live to Supabase across all devices
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('pantos_theme_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_THEME_CONFIG,
          ...parsed,
          bgUrl: localStorage.getItem('pantos_custom_bg') || parsed.bgUrl || DEFAULT_GIT_BACKGROUND_URL,
          bgOpacity: localStorage.getItem('pantos_bg_opacity')
            ? Number(localStorage.getItem('pantos_bg_opacity'))
            : parsed.bgOpacity ?? 65,
        };
      } catch (e) {
        console.warn('Gagal membaca cache tema:', e);
      }
    }
    return {
      ...DEFAULT_THEME_CONFIG,
      bgUrl: localStorage.getItem('pantos_custom_bg') || DEFAULT_GIT_BACKGROUND_URL,
      bgOpacity: localStorage.getItem('pantos_bg_opacity')
        ? Number(localStorage.getItem('pantos_bg_opacity'))
        : 65,
    };
  });
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  const handleSaveTheme = (newConfig: ThemeConfig) => {
    setThemeConfig(newConfig);
    localStorage.setItem('pantos_theme_settings', JSON.stringify(newConfig));
    localStorage.setItem('pantos_custom_bg', newConfig.bgUrl);
    localStorage.setItem('pantos_bg_opacity', String(newConfig.bgOpacity));

    syncBackgroundSettingsToSupabase({
      bgUrl: newConfig.bgUrl,
      bgOpacity: newConfig.bgOpacity,
      logoType: newConfig.logoType,
      logoUrl: newConfig.logoUrl,
      logoText: newConfig.logoText,
      brandName: newConfig.brandName,
      slogan: newConfig.slogan,
      logoSize: newConfig.logoSize,
      logoFit: newConfig.logoFit,
      logoShape: newConfig.logoShape,
      headerBgColor: newConfig.headerBgColor,
      activeButtonColor: newConfig.activeButtonColor,
      activeButtonTextColor: newConfig.activeButtonTextColor,
    }).catch((e) =>
      console.warn('Gagal menyimpan pengaturan tema ke Supabase:', e)
    );
  };

  // Keep players in sync when activeSeason changes, preserving admin overrides (badge, tier, julukan, avatar)
  useEffect(() => {
    const derived = buildPlayersFromSeason(activeSeason);
    const cachedPlayersStr = localStorage.getItem('pantos_players_cache');
    let cachedOverrides: Player[] = [];
    if (cachedPlayersStr) {
      try {
        const parsed = JSON.parse(cachedPlayersStr);
        if (Array.isArray(parsed)) cachedOverrides = parsed;
      } catch (e) {
        console.warn('Failed to parse cached players:', e);
      }
    }
    setPlayers((prev) => {
      const mergedWithPrev = mergePlayerOverrides(derived, prev);
      return cachedOverrides.length > 0 ? mergePlayerOverrides(mergedWithPrev, cachedOverrides) : mergedWithPrev;
    });
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
                  await syncMatchToSupabase(corrected);
                  await deleteMatchFromSupabase(oldId);
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

  // Real-time Supabase Subscriptions
  useEffect(() => {
    loadData();

    // Auto-seed the default admin login account in Supabase if none exists yet
    seedAdminIfEmpty().catch((e) => console.warn('Supabase admin seeding check:', e));

    const unsubLagaAmal = subscribeToLagaAmal(
      (remoteSeasons) => {
        if (remoteSeasons && remoteSeasons.length > 0) {
          const sorted = sortSeasonsDescending(remoteSeasons);
          setSeasons(sorted);
          localStorage.setItem('pantos_seasons_cache', JSON.stringify(sorted));
          setLastSyncedAt(new Date());
          setIsSupabaseConnected(true);
        }
      },
      () => setIsSupabaseConnected(false)
    );

    const unsubMatches = subscribeToMatches(
      (remoteMatches) => {
        if (Array.isArray(remoteMatches)) {
          const { sanitized, remapped } = sanitizeMatches(remoteMatches);
          setMatches(sanitized);
          localStorage.setItem('pantos_matches_cache', JSON.stringify(sanitized));
          setLastSyncedAt(new Date());
          setIsSupabaseConnected(true);
          if (remapped.length > 0) {
            remapped.forEach(async ({ oldId, newId }) => {
              const corrected = sanitized.find((m) => m.id === newId);
              if (corrected) {
                try {
                  await syncMatchToSupabase(corrected);
                  await deleteMatchFromSupabase(oldId);
                } catch (e) {
                  console.warn('Match ID remapping sync error:', e);
                }
              }
            });
          }
        }
      },
      () => setIsSupabaseConnected(false)
    );

    // Live-sync admin-set player fields (badge/status, tier, julukan,
    // custom avatar) across every device.
    const unsubPlayers = subscribeToPlayers(
      (remotePlayers) => {
        if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
          setPlayers((prev) => mergePlayerOverrides(prev, remotePlayers));
          localStorage.setItem('pantos_players_cache', JSON.stringify(remotePlayers));

          // Cross-device sync: Update seasons state so when season re-renders or any formula runs,
          // the badge status ('Aktif' / 'Cabutan') and tier remain authoritative across all devices.
          setSeasons((prevSeasons) => {
            let changed = false;
            const updated = prevSeasons.map((s) => {
              const updatedPlayers = s.players.map((sp) => {
                const override = remotePlayers.find(
                  (rp) => rp.name.toLowerCase() === sp.nickname.toLowerCase()
                );
                if (override) {
                  const newStatus = override.status ?? sp.status;
                  const newTier = override.tier ?? sp.tier;
                  const newAvatar = override.avatar_url ?? sp.avatar_url;
                  // julukan is deliberately excluded here — it must stay
                  // whatever this specific season already computed for
                  // itself, never overwritten by another device/season's
                  // global player record.
                  if (
                    sp.status !== newStatus ||
                    sp.tier !== newTier ||
                    sp.avatar_url !== newAvatar
                  ) {
                    changed = true;
                    return {
                      ...sp,
                      status: newStatus,
                      tier: newTier,
                      avatar_url: newAvatar,
                    };
                  }
                }
                return sp;
              });
              return { ...s, players: updatedPlayers };
            });
            if (changed) {
              localStorage.setItem('pantos_seasons_cache', JSON.stringify(updated));
              return updated;
            }
            return prevSeasons;
          });

          setLastSyncedAt(new Date());
          setIsSupabaseConnected(true);
        }
      },
      () => setIsSupabaseConnected(false)
    );

    // Keep theme, branding, colors & background permanently in sync across every device
    const unsubBackground = subscribeToBackgroundSettings((remoteTheme) => {
      if (!remoteTheme) return;
      setThemeConfig((prev) => {
        const updated: ThemeConfig = {
          ...prev,
          bgUrl: typeof remoteTheme.bgUrl === 'string' && remoteTheme.bgUrl ? remoteTheme.bgUrl : prev.bgUrl,
          bgOpacity: typeof remoteTheme.bgOpacity === 'number' && !isNaN(remoteTheme.bgOpacity) ? remoteTheme.bgOpacity : prev.bgOpacity,
          logoType: remoteTheme.logoType || prev.logoType,
          logoUrl: remoteTheme.logoUrl !== undefined ? remoteTheme.logoUrl : prev.logoUrl,
          logoText: remoteTheme.logoText !== undefined ? remoteTheme.logoText : prev.logoText,
          brandName: remoteTheme.brandName !== undefined ? remoteTheme.brandName : prev.brandName,
          slogan: remoteTheme.slogan !== undefined ? remoteTheme.slogan : prev.slogan,
          logoSize: typeof remoteTheme.logoSize === 'number' ? remoteTheme.logoSize : prev.logoSize,
          logoFit: remoteTheme.logoFit || prev.logoFit,
          logoShape: remoteTheme.logoShape || prev.logoShape,
          headerBgColor: remoteTheme.headerBgColor || prev.headerBgColor,
          activeButtonColor: remoteTheme.activeButtonColor || prev.activeButtonColor,
          activeButtonTextColor: remoteTheme.activeButtonTextColor || prev.activeButtonTextColor,
        };
        localStorage.setItem('pantos_theme_settings', JSON.stringify(updated));
        if (remoteTheme.bgUrl) localStorage.setItem('pantos_custom_bg', remoteTheme.bgUrl);
        if (remoteTheme.bgOpacity !== undefined) localStorage.setItem('pantos_bg_opacity', String(remoteTheme.bgOpacity));
        return updated;
      });
    });

    // Live-sync active season across every device
    const unsubActiveSeason = subscribeToActiveSeason((remoteActiveId) => {
      if (remoteActiveId) {
        setActiveSeasonId(remoteActiveId);
        localStorage.setItem('pantos_active_season_id', remoteActiveId);
        setSelectedSeasonId((prev) => (!prev ? remoteActiveId : prev));
      }
    });

    return () => {
      unsubLagaAmal();
      unsubMatches();
      unsubPlayers();
      unsubBackground();
      unsubActiveSeason();
    };
  }, []);

  // Set a season as the official Active Season across the app and Firestore
  const handleSetActiveSeason = async (seasonId: string) => {
    const targetSeason = seasons.find((s) => s.id === seasonId);
    if (!targetSeason) return;

    setActiveSeasonId(seasonId);
    setSelectedSeasonId(seasonId);
    localStorage.setItem('pantos_active_season_id', seasonId);

    // Update seasons list so only the activated season has isActive: true
    const updatedSeasons = seasons.map((s) => ({
      ...s,
      isActive: s.id === seasonId,
    }));
    setSeasons(updatedSeasons);
    localStorage.setItem('pantos_seasons_cache', JSON.stringify(updatedSeasons));

    try {
      await syncActiveSeasonToSupabase(seasonId);
      await syncLagaAmalToSupabase({ ...targetSeason, isActive: true });
      showSyncNotice(`Season "${targetSeason.title}" berhasil diaktifkan sebagai Active Season!`, false);
    } catch (e: any) {
      console.warn('Gagal sinkronisasi active season ke Supabase:', e);
      showSyncNotice(
        `Season "${targetSeason.title}" diaktifkan secara lokal. Supabase sync: ${e?.message || 'Tertunda'}`,
        false
      );
    }
  };

  // Update a season (both local, cache, backend & Supabase)
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

    // Sync to Supabase & API
    try {
      await syncLagaAmalToSupabase(recalc);
      fetch('/api/laga-amal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recalc),
      }).catch((e) => console.warn('API sync season:', e));
    } catch (err: any) {
      console.error('Sync season to Supabase failed:', err);
      showSyncNotice(
        `Perubahan klasemen tersimpan lokal, namun gagal disinkronkan ke Supabase: ${err?.message || 'Koneksi terputus'}.`
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
    const updatedPlayers = mergePlayerOverrides(buildPlayersFromSeason(updatedSeason), players);
    setPlayers(updatedPlayers);

    // Sync match and players to Supabase — kept in its OWN try/catch so a
    // network failure doesn't get mistaken for "backend unreachable".
    try {
      await syncMatchToSupabase(savedMatch);
      await syncPlayersBatchToSupabase(updatedPlayers);
      setLastSyncedAt(new Date());
    } catch (syncErr: any) {
      console.error('Error syncing match to Supabase:', syncErr);
      showSyncNotice(
        `Pertandingan tersimpan lokal, namun gagal disinkronkan ke Supabase: ${syncErr?.message || 'Koneksi terputus'}.`
      );
    }

    return true;
  };

  // Add new player (Create in CRUD)
  const handleAddPlayer = async (newPlayer: {
    name: string;
    status: 'Aktif' | 'Cabutan';
    tier: string;
    avatar_url?: string;
    julukan?: string;
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
          julukan: newPlayer.julukan,
          julukan_updated_at: newPlayer.julukan ? new Date().toISOString() : undefined,
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
          status: addedPlayer.status,
          tier: addedPlayer.tier,
          julukan: addedPlayer.julukan,
          julukan_updated_at: addedPlayer.julukan_updated_at,
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
      await syncPlayerToSupabase(addedPlayer);
      return true;
    } catch (err: any) {
      console.error('Error adding player:', err);
      showSyncNotice(
        `Pemain baru tersimpan lokal, namun gagal ke Supabase: ${err?.message || 'Koneksi terputus'}.`
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

      // 1. Delete from Supabase so it doesn't reappear on snapshot/refresh
      await deleteMatchFromSupabase(matchId);

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
              // sync reverted season to Supabase & API
              syncLagaAmalToSupabase(reverted).catch((err) => {
                console.error('Sync reverted season:', err);
                showSyncNotice(
                  `Statistik klasemen tersimpan lokal, namun gagal ke Supabase: ${err?.message || 'Koneksi terputus'}.`
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
      showSyncNotice(
        `Pertandingan dihapus dari tampilan, namun gagal di Supabase: ${err?.message || 'Koneksi terputus'}.`
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
        // Persist the regenerated analysis to Supabase too
        if (updatedMatch) {
          await syncMatchToSupabase(updatedMatch);
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
        await syncMatchToSupabase(updatedMatch);
      } catch (syncErr) {
        console.warn('Error syncing fallback analysis to Supabase:', syncErr);
      }
    }
  };

  // Delete an entire season/klasemen — admin only. This removes it from
  // Supabase (the real-time source of truth), the local backend store,
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

      // 1. Delete season doc from Supabase
      await deleteLagaAmalFromSupabase(seasonId);

      // 2. Cascade delete all matching matches from Supabase
      if (matchesToDelete.length > 0) {
        await deleteMatchesBatchFromSupabase(matchesToDelete.map((m) => m.id));
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
      showSyncNotice(
        `Klasemen dihapus dari tampilan, namun gagal di Supabase: ${err?.message || 'Koneksi terputus'}.`
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

      // 6. Persist to Supabase — this is the shared source of truth other
      // devices/sessions read from. Steps 2-4 above already updated this
      // device's local state + localStorage optimistically, so if this
      // step silently fails, this device would keep showing the new photo
      // (masking the failure) while everyone else never receives it —
      // exactly the "photo doesn't match across views" symptom. Surface it
      // instead of swallowing it.
      if (targetPlayer) {
        try {
          await syncPlayerToSupabase({
            ...targetPlayer,
            avatar_url: cleanUrl,
          });
        } catch (syncErr: any) {
          console.error('Error syncing avatar to Supabase:', syncErr);
          showSyncNotice(
            `Foto profil ${pName} tersimpan di perangkat ini, tapi gagal disinkronkan ke server: ${syncErr?.message || 'Koneksi terputus'}. Perangkat/pengguna lain mungkin belum melihat foto baru ini.`
          );
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error updating player avatar:', err);
      return false;
    }
  };

  // Update player status, tier, avatar, julukan or other profile details (Update in CRUD)
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

      // 2. Update seasons and localStorage cache so cross-device sync and page reloads never revert badge/tier!
      setSeasons((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          players: s.players.map((p) =>
            p.nickname.toLowerCase() === targetPlayer.name.toLowerCase()
              ? {
                  ...p,
                  ...(updates.status !== undefined && { status: updates.status }),
                  ...(updates.tier !== undefined && { tier: updates.tier }),
                  ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
                  // julukan is NOT applied across every season here — see the
                  // active-season-only update further below, which is the
                  // only season a manual julukan edit should ever touch.
                }
              : p
          ),
        }));
        localStorage.setItem('pantos_seasons_cache', JSON.stringify(updated));
        return updated;
      });

      // Update localStorage players cache
      const cached = localStorage.getItem('pantos_players_cache');
      let updatedCacheList: Player[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            updatedCacheList = parsed.map((p: Player) =>
              p.name.toLowerCase() === targetPlayer.name.toLowerCase() ? updatedPlayer : p
            );
          }
        } catch {}
      }
      if (!updatedCacheList.some((p) => p.name.toLowerCase() === targetPlayer.name.toLowerCase())) {
        updatedCacheList.push(updatedPlayer);
      }
      localStorage.setItem('pantos_players_cache', JSON.stringify(updatedCacheList));

      // 3. Persist to server API
      try {
        await fetch(`/api/players/${encodeURIComponent(String(playerId))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetPlayer.name, ...updates }),
        });
      } catch (err) {
        console.warn('Failed to update player details on backend:', err);
      }

      // 4. Persist to Supabase (both player document and active season)
      await syncPlayerToSupabase(updatedPlayer);

      const currentSeasonCopy = {
        ...activeSeason,
        players: activeSeason.players.map((p) =>
          p.nickname.toLowerCase() === targetPlayer.name.toLowerCase()
            ? {
                ...p,
                ...(updates.status !== undefined && { status: updates.status }),
                ...(updates.tier !== undefined && { tier: updates.tier }),
                ...(updates.avatar_url !== undefined && { avatar_url: updates.avatar_url }),
                ...(updates.julukan !== undefined && { julukan: updates.julukan }),
                ...(updates.julukan_updated_at !== undefined && { julukan_updated_at: updates.julukan_updated_at }),
              }
            : p
        ),
      };
      await syncLagaAmalToSupabase(recalculateSeasonStats(currentSeasonCopy));

      return true;
    } catch (err: any) {
      console.error('Error updating player details:', err);
      showSyncNotice(
        `Perubahan pemain tersimpan lokal, namun gagal ke Supabase: ${err?.message || 'Koneksi terputus'}.`
      );
      return false;
    }
  };

  // Delete player from database (Delete in CRUD)
  const handleDeletePlayer = async (
    playerId: number | string,
    playerName?: string
  ): Promise<boolean> => {
    try {
      const targetPlayer = players.find(
        (p) =>
          String(p.id) === String(playerId) ||
          (playerName && p.name.toLowerCase() === playerName.toLowerCase())
      );
      const pName = targetPlayer?.name || playerName || String(playerId);

      // 1. Remove from players state immediately
      setPlayers((prev) =>
        prev.filter(
          (p) => String(p.id) !== String(playerId) && p.name.toLowerCase() !== pName.toLowerCase()
        )
      );

      // 2. Remove from all seasons & active season
      setSeasons((prev) => {
        const updated = prev.map((s) => {
          const filtered = s.players.filter(
            (p) => p.nickname.toLowerCase() !== pName.toLowerCase()
          );
          return {
            ...s,
            players: filtered,
            activePlayersCount: filtered.length,
          };
        });
        localStorage.setItem('pantos_seasons_cache', JSON.stringify(updated));
        return updated;
      });

      // 3. Update localStorage players cache
      const cached = localStorage.getItem('pantos_players_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const updatedCache = parsed.filter(
              (p: any) =>
                String(p.id) !== String(playerId) &&
                String(p.name || '').toLowerCase() !== pName.toLowerCase()
            );
            localStorage.setItem('pantos_players_cache', JSON.stringify(updatedCache));
          }
        } catch {}
      }

      // 4. Delete on backend API
      try {
        await fetch(`/api/players/${encodeURIComponent(String(playerId))}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Backend player delete failed:', err);
      }

      // 5. Delete on Supabase
      await deletePlayerFromSupabase(playerId, pName);

      // 6. Sync updated season to Supabase
      const updatedSeason = {
        ...activeSeason,
        players: activeSeason.players.filter(
          (p) => p.nickname.toLowerCase() !== pName.toLowerCase()
        ),
        activePlayersCount: activeSeason.players.filter(
          (p) => p.nickname.toLowerCase() !== pName.toLowerCase()
        ).length,
      };
      await syncLagaAmalToSupabase(recalculateSeasonStats(updatedSeason));

      return true;
    } catch (err: any) {
      console.error('Error deleting player:', err);
      showSyncNotice(`Gagal menghapus pemain: ${err?.message || 'Terjadi kesalahan'}.`);
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
      // Send the player we already have (from Supabase) as a fallback
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

          // Persist into the ACTIVE SEASON only — julukan is season-specific,
          // so a manual regenerate must never be stamped onto other seasons.
          const seasonWithNewJulukan = {
            ...activeSeason,
            players: activeSeason.players.map((p) =>
              p.nickname.toLowerCase() === targetPlayer.name.toLowerCase()
                ? { ...p, julukan: data.julukan, julukan_updated_at: nowIso }
                : p
            ),
          };
          await handleUpdateSeason(seasonWithNewJulukan);

          // Sync to Supabase
          await syncPlayerToSupabase(updatedPlayer);

          return data.julukan;
        }
      }
      throw new Error('Backend generate-title endpoint returned ' + res.status);
    } catch (err) {
      console.warn('Error generating player title via backend, using local fallback:', err);
      // Backend unreachable — generate a heuristic julukan locally
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

      // Persist into the active season only (see note above — julukan is
      // per-season, never cross-season).
      const seasonWithFallbackJulukan = {
        ...activeSeason,
        players: activeSeason.players.map((p) =>
          p.nickname.toLowerCase() === targetPlayer.name.toLowerCase()
            ? { ...p, julukan: fallbackJulukan, julukan_updated_at: nowIso }
            : p
        ),
      };
      await handleUpdateSeason(seasonWithFallbackJulukan);

      try {
        await syncPlayerToSupabase(updatedPlayer);
      } catch (syncErr) {
        console.warn('Error syncing fallback julukan to Supabase:', syncErr);
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
      {/* Background Image Layer (Git raw / Custom Upload / URL) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
        style={{
          opacity: themeConfig.bgOpacity / 100,
          backgroundImage: `linear-gradient(to bottom, rgba(22, 19, 17, 0.30), rgba(22, 19, 17, 0.60)), url('${themeConfig.bgUrl}')`,
        }}
      />
      {/* Top Main Navigation */}
      <header
        className="sticky top-0 z-40 border-b border-[#332C25] backdrop-blur-md transition-colors duration-200"
        style={{ backgroundColor: `${themeConfig.headerBgColor}F2` }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {themeConfig.logoType === 'image' && themeConfig.logoUrl ? (
              <div
                className={`flex items-center justify-center shrink-0 transition-all ${
                  themeConfig.logoShape === 'circle'
                    ? 'rounded-full overflow-hidden border border-[#332C25] bg-[#161311]/60 shadow-md'
                    : themeConfig.logoShape === 'none'
                    ? 'bg-transparent'
                    : 'rounded-xl overflow-hidden border border-[#332C25] bg-[#161311]/60 shadow-md'
                }`}
                style={{
                  height: `${themeConfig.logoSize || 52}px`,
                  minWidth: themeConfig.logoShape === 'none' ? 'auto' : `${themeConfig.logoSize || 52}px`,
                  maxWidth: '220px',
                }}
              >
                <img
                  src={themeConfig.logoUrl}
                  alt={themeConfig.brandName}
                  className="h-full w-auto max-w-full transition-all"
                  style={{
                    maxHeight: `${themeConfig.logoSize || 52}px`,
                    objectFit: themeConfig.logoFit || 'contain',
                    imageRendering: 'auto',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div
                className="flex shrink-0 items-center justify-center rounded-xl shadow-md font-black text-base sm:text-lg transition-colors"
                style={{
                  height: `${themeConfig.logoSize || 48}px`,
                  width: `${themeConfig.logoSize || 48}px`,
                  backgroundColor: themeConfig.activeButtonColor,
                  color: themeConfig.activeButtonTextColor,
                }}
              >
                {themeConfig.logoText || 'LP'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-[#F2EDE4] truncate">
                  {themeConfig.brandName || 'FRATERNITE- LAGA AMAL'}
                </h1>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold border shrink-0"
                  style={{
                    backgroundColor: `${themeConfig.activeButtonColor}25`,
                    borderColor: `${themeConfig.activeButtonColor}50`,
                    color: themeConfig.activeButtonColor,
                  }}
                >
                  MLBB
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#9C948A] hidden sm:block truncate">
                {themeConfig.slogan || 'Sistem Papan Klasemen Season & Tracker Medali Komunitas Pantos'}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Background & Tema Settings button */}
            <button
              id="btn-bg-settings"
              onClick={() => setIsBgModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#332C25] bg-[#241F1B] px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#2A241E] transition-colors cursor-pointer min-h-[38px]"
              title="Atur Logo, Slogan, Warna Header, Tombol Aktif & Background"
            >
              <div
                className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: themeConfig.activeButtonColor }}
              />
              <span className="hidden md:inline">Background & Tema</span>
              <span className="md:hidden">Tema</span>
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
              style={
                tab === 'dashboard'
                  ? {
                      backgroundColor: themeConfig.activeButtonColor,
                      color: themeConfig.activeButtonTextColor,
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'dashboard'
                  ? 'shadow-md font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Trophy size={15} className="shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-match-history"
              onClick={() => setTab('matchHistory')}
              style={
                tab === 'matchHistory'
                  ? {
                      backgroundColor: themeConfig.activeButtonColor,
                      color: themeConfig.activeButtonTextColor,
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'matchHistory'
                  ? 'shadow-md font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <History size={15} className="shrink-0" />
              <span>Riwayat Pertandingan</span>
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                style={
                  tab === 'matchHistory'
                    ? { backgroundColor: 'rgba(0,0,0,0.2)', color: themeConfig.activeButtonTextColor }
                    : { backgroundColor: `${themeConfig.activeButtonColor}25`, color: themeConfig.activeButtonColor }
                }
              >
                {seasonMatches.length}
              </span>
            </button>

            <button
              id="nav-tab-laga-amal"
              onClick={() => setTab('lagaAmal')}
              style={
                tab === 'lagaAmal'
                  ? {
                      backgroundColor: themeConfig.activeButtonColor,
                      color: themeConfig.activeButtonTextColor,
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'lagaAmal'
                  ? 'shadow-md font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <Flame size={15} className="shrink-0" />
              <span>Klasemen Laga Amal</span>
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                style={
                  tab === 'lagaAmal'
                    ? { backgroundColor: 'rgba(0,0,0,0.2)', color: themeConfig.activeButtonTextColor }
                    : { backgroundColor: `${themeConfig.activeButtonColor}25`, color: themeConfig.activeButtonColor }
                }
              >
                {activeSeason.title.split('-')[1]?.trim() || (activeSeason.id ? activeSeason.id.toUpperCase() : 'Season')}
              </span>
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setTab('profile')}
              style={
                tab === 'profile'
                  ? {
                      backgroundColor: themeConfig.activeButtonColor,
                      color: themeConfig.activeButtonTextColor,
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                tab === 'profile'
                  ? 'shadow-md font-black'
                  : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
              }`}
            >
              <UserRound size={15} className="shrink-0" />
              <span>Profil Pemain</span>
            </button>

            {/* Database Pemain & Input Pertandingan are admin-only — hidden
                from the nav entirely for anyone not logged in as admin. */}
            {isAdmin && (
              <button
                id="nav-tab-players-crud"
                onClick={() => setTab('players')}
                style={
                  tab === 'players'
                    ? {
                        backgroundColor: themeConfig.activeButtonColor,
                        color: themeConfig.activeButtonTextColor,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                  tab === 'players'
                    ? 'shadow-md font-black'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                }`}
              >
                <Users size={15} className="shrink-0" />
                <span>Database Pemain</span>
                <span
                  className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                  style={
                    tab === 'players'
                      ? { backgroundColor: 'rgba(0,0,0,0.2)', color: themeConfig.activeButtonTextColor }
                      : { backgroundColor: `${themeConfig.activeButtonColor}25`, color: themeConfig.activeButtonColor }
                  }
                >
                  {players.length}
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                id="nav-tab-admin"
                onClick={() => setTab('admin')}
                style={
                  tab === 'admin'
                    ? {
                        backgroundColor: themeConfig.activeButtonColor,
                        color: themeConfig.activeButtonTextColor,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-[42px] active:scale-95 ${
                  tab === 'admin'
                    ? 'shadow-md font-black'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                }`}
              >
                <ClipboardList size={15} className="shrink-0" />
                <span>Input Pertandingan</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Non-blocking Supabase Banner / Notification */}
      {syncNotice && (
        <div className="sticky top-[61px] z-30 px-4 py-2 bg-gradient-to-r from-amber-950/95 to-[#2A1D13] border-b border-amber-500/40 text-xs text-[#F2EDE4] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span className="font-medium text-amber-200">{syncNotice.message}</span>
            <button
              onClick={() => {
                const btn = document.getElementById('btn-supabase-status');
                if (btn) btn.click();
              }}
              className="ml-2 text-xs text-amber-300 underline hover:text-amber-200 font-semibold cursor-pointer shrink-0"
            >
              Status Supabase
            </button>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
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
            activeSeasonId={activeSeasonId}
            onSetActiveSeason={handleSetActiveSeason}
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
            activeSeasonId={activeSeasonId}
            onSetActiveSeason={handleSetActiveSeason}
            matches={seasonMatches}
            onSelectMatch={(m) => setSelectedMatch(m)}
            onDeleteMatch={handleDeleteMatch}
            isAdmin={isAdmin}
          />
        )}

        {/* TAB 3: KLASEMEN LAGA AMAL (Multi-Season History) */}
        {tab === 'lagaAmal' && (
          <LagaAmalView
            seasons={seasons}
            activeSeasonId={activeSeasonId}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={(id) => setSelectedSeasonId(id)}
            onSetActiveSeason={handleSetActiveSeason}
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

        {/* TAB 4: INPUT MATCH (ADMIN) & DATABASE PEMAIN SUB-TAB — admin-only,
            never rendered for a non-admin session even if tab state ends up
            here (e.g. a logout race, or a deep link). */}
        {tab === 'admin' && !isAdmin && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#332C25] bg-[#1D1916] p-10 text-center">
            <Lock size={28} className="text-[#E8B33D]" />
            <h2 className="text-sm font-bold text-[#F2EDE4]">Halaman Khusus Admin</h2>
            <p className="max-w-xs text-xs text-[#9C948A]">
              Input pertandingan dan database pemain hanya bisa dilihat oleh admin. Masuk sebagai admin untuk mengaksesnya.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer shadow-sm"
            >
              <Lock size={13} />
              <span>Masuk Admin</span>
            </button>
          </div>
        )}
        {tab === 'admin' && isAdmin && (
          <div className="space-y-4">
            {/* Admin Sub-navigation Pill Bar */}
            <div className="flex items-center gap-2 rounded-2xl border border-[#332C25] bg-[#191513] p-1.5 max-w-md">
              <button
                type="button"
                onClick={() => setAdminSubTab('match')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  adminSubTab === 'match'
                    ? 'bg-[#E8B33D] text-[#161311] shadow'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                }`}
              >
                <ClipboardList size={15} />
                <span>Input Pertandingan</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminSubTab('players')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  adminSubTab === 'players'
                    ? 'bg-[#E8B33D] text-[#161311] shadow'
                    : 'text-[#9C948A] hover:text-[#F2EDE4] hover:bg-[#241F1B]'
                }`}
              >
                <Users size={15} />
                <span>Database Pemain (CRUD)</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    adminSubTab === 'players'
                      ? 'bg-[#161311]/20 text-[#161311]'
                      : 'bg-[#E8B33D]/20 text-[#E8B33D]'
                  }`}
                >
                  {players.length}
                </span>
              </button>
            </div>

            {adminSubTab === 'match' ? (
              <AdminInput
                players={players}
                heroes={heroes}
                matches={matches}
                seasons={seasons}
                activeSeasonId={activeSeasonId || selectedSeasonId}
                isAdmin={isAdmin}
                prefilledDraft={draftForAdmin}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onSaveMatch={handleSaveMatch}
                onAddPlayer={handleAddPlayer}
              />
            ) : (
              <PlayerCrudManager
                players={players}
                activeSeason={activeSeason}
                isAdmin={isAdmin}
                onAddPlayer={handleAddPlayer}
                onUpdatePlayer={handleUpdatePlayerDetails}
                onDeletePlayer={handleDeletePlayer}
                onGenerateJulukan={handleGeneratePlayerJulukan}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onSelectPlayer={(playerId) => handleViewPlayerProfile(playerId)}
              />
            )}
          </div>
        )}

        {/* TAB 5: DEDICATED DATABASE PEMAIN (CRUD) — admin-only */}
        {tab === 'players' && !isAdmin && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#332C25] bg-[#1D1916] p-10 text-center">
            <Lock size={28} className="text-[#E8B33D]" />
            <h2 className="text-sm font-bold text-[#F2EDE4]">Halaman Khusus Admin</h2>
            <p className="max-w-xs text-xs text-[#9C948A]">
              Input pertandingan dan database pemain hanya bisa dilihat oleh admin. Masuk sebagai admin untuk mengaksesnya.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#E8B33D] px-4 py-2 text-xs font-bold text-[#161311] hover:bg-[#F3C256] transition-colors cursor-pointer shadow-sm"
            >
              <Lock size={13} />
              <span>Masuk Admin</span>
            </button>
          </div>
        )}
        {tab === 'players' && isAdmin && (
          <PlayerCrudManager
            players={players}
            activeSeason={activeSeason}
            isAdmin={isAdmin}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayerDetails}
            onDeletePlayer={handleDeletePlayer}
            onGenerateJulukan={handleGeneratePlayerJulukan}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSelectPlayer={(playerId) => handleViewPlayerProfile(playerId)}
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
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              Supabase Database Live
            </span>
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
        <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} gap-1 max-w-md mx-auto`}>
          {/* 1. Dashboard */}
          <button
            id="mobile-btn-dashboard"
            type="button"
            onClick={() => {
              setTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95"
            style={tab === 'dashboard' ? { color: themeConfig.activeButtonColor } : { color: '#9C948A' }}
          >
            <div
              className="flex items-center justify-center h-7 w-12 rounded-full transition-all"
              style={tab === 'dashboard' ? { backgroundColor: `${themeConfig.activeButtonColor}25` } : undefined}
            >
              <Trophy
                size={18}
                style={tab === 'dashboard' ? { color: themeConfig.activeButtonColor } : undefined}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${tab === 'dashboard' ? 'font-black' : 'font-medium'}`}
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
            className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95"
            style={tab === 'matchHistory' ? { color: themeConfig.activeButtonColor } : { color: '#9C948A' }}
          >
            <div
              className="relative flex items-center justify-center h-7 w-12 rounded-full transition-all"
              style={tab === 'matchHistory' ? { backgroundColor: `${themeConfig.activeButtonColor}25` } : undefined}
            >
              <History
                size={18}
                style={tab === 'matchHistory' ? { color: themeConfig.activeButtonColor } : undefined}
              />
              {seasonMatches.length > 0 && (
                <span
                  className="absolute -top-0.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-black"
                  style={{
                    backgroundColor: themeConfig.activeButtonColor,
                    color: themeConfig.activeButtonTextColor,
                  }}
                >
                  {seasonMatches.length}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${tab === 'matchHistory' ? 'font-black' : 'font-medium'}`}
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
            className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95"
            style={tab === 'lagaAmal' ? { color: themeConfig.activeButtonColor } : { color: '#9C948A' }}
          >
            <div
              className="flex items-center justify-center h-7 w-12 rounded-full transition-all"
              style={tab === 'lagaAmal' ? { backgroundColor: `${themeConfig.activeButtonColor}25` } : undefined}
            >
              <Flame
                size={18}
                style={tab === 'lagaAmal' ? { color: themeConfig.activeButtonColor } : undefined}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${tab === 'lagaAmal' ? 'font-black' : 'font-medium'}`}
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
            className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95"
            style={tab === 'profile' ? { color: themeConfig.activeButtonColor } : { color: '#9C948A' }}
          >
            <div
              className="flex items-center justify-center h-7 w-12 rounded-full transition-all"
              style={tab === 'profile' ? { backgroundColor: `${themeConfig.activeButtonColor}25` } : undefined}
            >
              <UserRound
                size={18}
                style={tab === 'profile' ? { color: themeConfig.activeButtonColor } : undefined}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${tab === 'profile' ? 'font-black' : 'font-medium'}`}
            >
              Profil
            </span>
          </button>

          {/* 5. Input — admin-only, hidden entirely for non-admins */}
          {isAdmin && (
            <button
              id="mobile-btn-admin"
              type="button"
              onClick={() => {
                setTab('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95"
              style={tab === 'admin' ? { color: themeConfig.activeButtonColor } : { color: '#9C948A' }}
            >
              <div
                className="relative flex items-center justify-center h-7 w-12 rounded-full transition-all"
                style={tab === 'admin' ? { backgroundColor: `${themeConfig.activeButtonColor}25` } : undefined}
              >
                <ClipboardList
                  size={18}
                  style={tab === 'admin' ? { color: themeConfig.activeButtonColor } : undefined}
                />
                <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-[#191513]" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${tab === 'admin' ? 'font-black' : 'font-medium'}`}
              >
                Input
              </span>
            </button>
          )}
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

      {/* Background & Theme Settings Modal */}
      {isBgModalOpen && (
        <BackgroundSettingsModal
          isOpen={isBgModalOpen}
          themeConfig={themeConfig}
          onSaveTheme={handleSaveTheme}
          onClose={() => setIsBgModalOpen(false)}
        />
      )}
    </div>
  );
}
