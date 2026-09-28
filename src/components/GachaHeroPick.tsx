import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Dices,
  Users,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  Play,
  Search,
  Crown,
  Ticket,
  Scale,
  Sparkle,
  X,
} from 'lucide-react';
import { Player, Hero } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { MLBB_HEROES } from '../constants/heroes';
import { casinoSound } from '../utils/casinoSound';
import { registerKnownPlayerAvatars } from '../constants/playerAvatars';

export type MLBBHeroRole = 'Tank' | 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Support';

export const MLBB_ROLES: { name: MLBBHeroRole; icon: string; badgeClass: string; color: string }[] = [
  { name: 'Mage', icon: '🔮', badgeClass: 'border-purple-500/50 text-purple-300 bg-purple-950/40', color: '#c084fc' },
  { name: 'Assassin', icon: '🗡️', badgeClass: 'border-rose-500/50 text-rose-300 bg-rose-950/40', color: '#f43f5e' },
  { name: 'Fighter', icon: '⚔️', badgeClass: 'border-amber-500/50 text-amber-300 bg-amber-950/40', color: '#f59e0b' },
  { name: 'Tank', icon: '🛡️', badgeClass: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40', color: '#06b6d4' },
  { name: 'Marksman', icon: '🎯', badgeClass: 'border-yellow-500/50 text-yellow-300 bg-yellow-950/40', color: '#eab308' },
  { name: 'Support', icon: '💖', badgeClass: 'border-teal-500/50 text-teal-300 bg-teal-950/40', color: '#14b8a6' },
];

export interface PlayerDraftSlot {
  playerName: string;
  avatarUrl?: string;
  role?: MLBBHeroRole;
  hero?: string;
  heroAvatar?: string;
}

interface GachaHeroPickProps {
  players: Player[];
  heroes?: Hero[];
  onExportToAdmin?: (draft: {
    pohon: Array<{ player: string; hero: string }>;
    lobby: Array<{ player: string; hero: string }>;
  }) => void;
}

export const GachaHeroPick: React.FC<GachaHeroPickProps> = ({
  players,
  heroes = MLBB_HEROES,
  onExportToAdmin,
}) => {
  // Sound mute state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync and cache player avatars in global memory & storage
  useEffect(() => {
    if (players && players.length > 0) {
      registerKnownPlayerAvatars(players);
    }
  }, [players]);

  // Fast player lookup map (case-insensitive) for accurate profile photo & data access
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((p) => {
      if (p.name) map.set(p.name.trim().toLowerCase(), p);
      if (p.julukan) map.set(p.julukan.trim().toLowerCase(), p);
    });
    return map;
  }, [players]);

  // Separate Warga Pantos (Aktif) and Pemain Cabutan (Cabutan)
  const wargaPlayers = useMemo(() => {
    return players.filter((p) => p.status === 'Aktif');
  }, [players]);

  const cabutanPlayers = useMemo(() => {
    return players.filter((p) => p.status !== 'Aktif');
  }, [players]);

  // Filter & Search states for Step 1
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'warga' | 'cabutan'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fair team balance toggle: distributes cabutan evenly between Tim Kiri & Tim Kanan
  const [balanceCabutan, setBalanceCabutan] = useState(true);

  // Selected 10 players - prefer top 10 Warga Pantos initially if available
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>(() => {
    const aktif = players.filter((p) => p.status === 'Aktif');
    if (aktif.length >= 10) {
      return aktif.slice(0, 10).map((p) => p.name);
    }
    return players.slice(0, 10).map((p) => p.name);
  });

  // Selected counts breakdown
  const selectedWargaCount = useMemo(() => {
    return selectedPlayerNames.filter((name) => {
      const p = playerMap.get(name.trim().toLowerCase());
      return p ? p.status === 'Aktif' : true;
    }).length;
  }, [selectedPlayerNames, playerMap]);

  const selectedCabutanCount = useMemo(() => {
    return selectedPlayerNames.filter((name) => {
      const p = playerMap.get(name.trim().toLowerCase());
      return p ? p.status === 'Cabutan' : false;
    }).length;
  }, [selectedPlayerNames, playerMap]);

  // Teams state: Tim Pohon (5) and Tim Lobby (5)
  const [pohonTeam, setPohonTeam] = useState<PlayerDraftSlot[]>([]);
  const [lobbyTeam, setLobbyTeam] = useState<PlayerDraftSlot[]>([]);

  // Synchronous refs to prevent race conditions during rapid or auto spins
  const lobbyTeamRef = useRef<PlayerDraftSlot[]>([]);
  const pohonTeamRef = useRef<PlayerDraftSlot[]>([]);

  useEffect(() => {
    lobbyTeamRef.current = lobbyTeam;
  }, [lobbyTeam]);

  useEffect(() => {
    pohonTeamRef.current = pohonTeam;
  }, [pohonTeam]);

  // Active step: 'pick_players' | 'draft_hero'
  const [step, setStep] = useState<'pick_players' | 'draft_hero'>('pick_players');

  // Currently focused player to spin for in Step 2
  const [activePlayerForSpin, setActivePlayerForSpin] = useState<string>('');

  // Slot reel animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayRole, setDisplayRole] = useState<MLBBHeroRole>('Mage');
  const [displayHero, setDisplayHero] = useState<string>('Eudora');
  const [displayHeroAvatar, setDisplayHeroAvatar] = useState<string>('');

  // Latest announcement banner
  const [latestAnnouncement, setLatestAnnouncement] = useState<{
    player: string;
    role: MLBBHeroRole;
    hero: string;
  } | null>(null);

  // Copy success notification
  const [copySuccess, setCopySuccess] = useState(false);

  // Team shuffle spinning animation
  const [isTeamSpinning, setIsTeamSpinning] = useState(false);

  // Team composition stats for Step 2
  const pohonTeamStats = useMemo(() => {
    let warga = 0;
    let cabutan = 0;
    pohonTeam.forEach((s) => {
      const p = playerMap.get(s.playerName.trim().toLowerCase());
      if (p?.status === 'Cabutan') cabutan++;
      else warga++;
    });
    return { warga, cabutan };
  }, [pohonTeam, playerMap]);

  const lobbyTeamStats = useMemo(() => {
    let warga = 0;
    let cabutan = 0;
    lobbyTeam.forEach((s) => {
      const p = playerMap.get(s.playerName.trim().toLowerCase());
      if (p?.status === 'Cabutan') cabutan++;
      else warga++;
    });
    return { warga, cabutan };
  }, [lobbyTeam, playerMap]);

  // Status of available roles for the currently selected player's team (ANTI-ROLE CLASH)
  const activeRoleStatus = useMemo(() => {
    const isLobby = lobbyTeam.some((p) => p.playerName === activePlayerForSpin);
    const teamSlots = isLobby ? lobbyTeam : pohonTeam;
    const teamName = isLobby ? 'Tim Kanan' : 'Tim Kiri';

    // Roles taken by OTHER players in this same team
    const takenRolesInTeam = new Set<MLBBHeroRole>(
      teamSlots
        .filter((p) => p.playerName !== activePlayerForSpin && !!p.role)
        .map((p) => p.role as MLBBHeroRole)
    );

    // Roles available to be rolled by this player
    const availableRoles = MLBB_ROLES.filter((r) => !takenRolesInTeam.has(r.name));

    return {
      isLobby,
      teamName,
      takenRolesInTeam,
      availableRoles,
    };
  }, [lobbyTeam, pohonTeam, activePlayerForSpin]);

  // Map of hero to roles for fast lookup
  const heroesByRole = useMemo(() => {
    const map: Record<MLBBHeroRole, Hero[]> = {
      Tank: [],
      Fighter: [],
      Assassin: [],
      Mage: [],
      Marksman: [],
      Support: [],
    };
    heroes.forEach((h) => {
      if (h.role_primary && map[h.role_primary as MLBBHeroRole]) {
        map[h.role_primary as MLBBHeroRole].push(h);
      }
      if (h.role_secondary && map[h.role_secondary as MLBBHeroRole]) {
        map[h.role_secondary as MLBBHeroRole].push(h);
      }
    });
    return map;
  }, [heroes]);

  // Sync sound manager
  useEffect(() => {
    casinoSound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Total completed drafts
  const completedCount = useMemo(() => {
    const pCount = pohonTeam.filter((p) => !!p.hero).length;
    const lCount = lobbyTeam.filter((p) => !!p.hero).length;
    return pCount + lCount;
  }, [pohonTeam, lobbyTeam]);

  // List of all 10 drafted players combined
  const allTenPlayers = useMemo(() => {
    return [...lobbyTeam, ...pohonTeam];
  }, [lobbyTeam, pohonTeam]);

  // Set default active player when transitioning to draft
  useEffect(() => {
    if (step === 'draft_hero') {
      const firstUnpicked = allTenPlayers.find((p) => !p.hero);
      if (firstUnpicked) {
        setActivePlayerForSpin(firstUnpicked.playerName);
      } else if (allTenPlayers.length > 0 && !activePlayerForSpin) {
        setActivePlayerForSpin(allTenPlayers[0].playerName);
      }
    }
  }, [step, allTenPlayers, activePlayerForSpin]);

  // Toggle player selection for the 10 players
  const togglePlayerSelection = (name: string) => {
    if (selectedPlayerNames.includes(name)) {
      setSelectedPlayerNames((prev) => prev.filter((n) => n !== name));
    } else {
      if (selectedPlayerNames.length >= 10) return;
      setSelectedPlayerNames((prev) => [...prev, name]);
    }
  };

  // Quick select presets
  const handleQuickSelectOnlyWarga = () => {
    const activeOnes = wargaPlayers.slice(0, 10).map((p) => p.name);
    setSelectedPlayerNames(activeOnes);
  };

  const handleQuickSelectMixed = (wargaTarget = 8, cabutanTarget = 2) => {
    const w = wargaPlayers.slice(0, wargaTarget).map((p) => p.name);
    const c = cabutanPlayers.slice(0, cabutanTarget).map((p) => p.name);
    const combined = [...w, ...c].slice(0, 10);
    if (combined.length < 10) {
      const remainingWarga = wargaPlayers
        .filter((p) => !combined.includes(p.name))
        .map((p) => p.name);
      combined.push(...remainingWarga.slice(0, 10 - combined.length));
    }
    setSelectedPlayerNames(combined);
  };

  // Spin & Split 10 Players into Tim Pohon (5) & Tim Lobby (5)
  const handleSpinTeams = () => {
    if (selectedPlayerNames.length !== 10) return;

    setIsTeamSpinning(true);
    casinoSound.playReelTick(50);

    let tickCount = 0;
    const interval = setInterval(() => {
      tickCount++;
      casinoSound.playReelTick(tickCount * 10);
      if (tickCount >= 10) {
        clearInterval(interval);

        let lobbyNames: string[] = [];
        let pohonNames: string[] = [];

        if (balanceCabutan && selectedCabutanCount > 0) {
          // Fair distribution of Cabutan between both teams
          const selWarga: string[] = [];
          const selCabutan: string[] = [];

          selectedPlayerNames.forEach((name) => {
            const p = playerMap.get(name.trim().toLowerCase());
            if (p?.status === 'Cabutan') {
              selCabutan.push(name);
            } else {
              selWarga.push(name);
            }
          });

          // Shuffle both arrays
          const shuffledCabutan = [...selCabutan].sort(() => Math.random() - 0.5);
          const shuffledWarga = [...selWarga].sort(() => Math.random() - 0.5);

          const lobbyCabutan: string[] = [];
          const pohonCabutan: string[] = [];

          shuffledCabutan.forEach((name, idx) => {
            if (idx % 2 === 0) {
              lobbyCabutan.push(name);
            } else {
              pohonCabutan.push(name);
            }
          });

          // Fill remaining slots up to 5 each with Warga
          const neededForLobby = 5 - lobbyCabutan.length;
          const neededForPohon = 5 - pohonCabutan.length;

          const lobbyWarga = shuffledWarga.slice(0, neededForLobby);
          const pohonWarga = shuffledWarga.slice(neededForLobby, neededForLobby + neededForPohon);

          lobbyNames = [...lobbyCabutan, ...lobbyWarga].sort(() => Math.random() - 0.5);
          pohonNames = [...pohonCabutan, ...pohonWarga].sort(() => Math.random() - 0.5);
        } else {
          // Pure random shuffle
          const shuffled = [...selectedPlayerNames];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          lobbyNames = shuffled.slice(0, 5);
          pohonNames = shuffled.slice(5, 10);
        }

        const lobby = lobbyNames.map((playerName) => {
          const pObj = playerMap.get(playerName.trim().toLowerCase());
          return {
            playerName,
            avatarUrl: pObj?.avatar_url,
          };
        });
        const pohon = pohonNames.map((playerName) => {
          const pObj = playerMap.get(playerName.trim().toLowerCase());
          return {
            playerName,
            avatarUrl: pObj?.avatar_url,
          };
        });

        lobbyTeamRef.current = lobby;
        pohonTeamRef.current = pohon;
        setLobbyTeam(lobby);
        setPohonTeam(pohon);
        setIsTeamSpinning(false);
        setStep('draft_hero');
        setActivePlayerForSpin(lobby[0]?.playerName || '');
        casinoSound.playJackpot();
      }
    }, 100);
  };

  // Perform slot spin for a single player with strict team-level anti-role-clash
  const spinForPlayer = (targetPlayerName: string): Promise<void> => {
    return new Promise((resolve) => {
      if (isSpinning || !targetPlayerName) {
        resolve();
        return;
      }

      setIsSpinning(true);

      const currentLobby = lobbyTeamRef.current;
      const currentPohon = pohonTeamRef.current;
      const isLobby = currentLobby.some((p) => p.playerName === targetPlayerName);
      const teamSlots = isLobby ? currentLobby : currentPohon;

      // STRICT RULE: Roles already assigned to teammates in THIS team are EXCLUDED
      const takenRolesInThisTeam = new Set<MLBBHeroRole>(
        teamSlots
          .filter((p) => p.playerName !== targetPlayerName && !!p.role)
          .map((p) => p.role as MLBBHeroRole)
      );

      // Available roles for this specific team (excluding any role already rolled by teammates)
      const availableRoles = MLBB_ROLES.filter((r) => !takenRolesInThisTeam.has(r.name));
      const candidateRoles = availableRoles.length > 0 ? availableRoles : MLBB_ROLES;

      // Pick random role strictly from the unassigned roles in this team
      const chosenRoleObj = candidateRoles[Math.floor(Math.random() * candidateRoles.length)];
      const chosenRole = chosenRoleObj.name;

      // Heroes already picked across BOTH teams (no mirror pick)
      const pickedHeroNames = new Set(
        [...currentLobby, ...currentPohon]
          .filter((p) => p.playerName !== targetPlayerName && !!p.hero)
          .map((p) => p.hero)
      );

      // Pick hero matching chosenRole that has not been picked
      const heroPool = heroesByRole[chosenRole] || [];
      const availableHeroes = heroPool.filter((h) => !pickedHeroNames.has(h.name));
      const selectedHeroObj =
        availableHeroes.length > 0
          ? availableHeroes[Math.floor(Math.random() * availableHeroes.length)]
          : heroPool[Math.floor(Math.random() * heroPool.length)] || heroes[0];

      const targetHeroName = selectedHeroObj?.name || 'Eudora';
      const targetHeroAvatar = selectedHeroObj?.avatar_url || '';

      // Animate slot reel cycling
      let elapsed = 0;
      const spinInterval = setInterval(() => {
        elapsed += 80;
        const tempRole = candidateRoles[Math.floor(Math.random() * candidateRoles.length)].name;
        const tempHeroes = heroesByRole[tempRole] || heroes;
        const tempHero = tempHeroes[Math.floor(Math.random() * tempHeroes.length)];

        setDisplayRole(tempRole);
        if (tempHero) {
          setDisplayHero(tempHero.name);
          setDisplayHeroAvatar(tempHero.avatar_url || '');
        }

        casinoSound.playReelTick();

        if (elapsed >= 1100) {
          clearInterval(spinInterval);

          // Lock in final results
          setDisplayRole(chosenRole);
          setDisplayHero(targetHeroName);
          setDisplayHeroAvatar(targetHeroAvatar);

          // Update player slot in synchronous ref & React state
          const targetPlayerObj = playerMap.get(targetPlayerName.trim().toLowerCase());
          const updatedSlot: PlayerDraftSlot = {
            playerName: targetPlayerName,
            avatarUrl: targetPlayerObj?.avatar_url,
            role: chosenRole,
            hero: targetHeroName,
            heroAvatar: targetHeroAvatar,
          };

          if (isLobby) {
            const nextLobby = lobbyTeamRef.current.map((s) =>
              s.playerName === targetPlayerName ? updatedSlot : s
            );
            lobbyTeamRef.current = nextLobby;
            setLobbyTeam(nextLobby);
          } else {
            const nextPohon = pohonTeamRef.current.map((s) =>
              s.playerName === targetPlayerName ? updatedSlot : s
            );
            pohonTeamRef.current = nextPohon;
            setPohonTeam(nextPohon);
          }

          // Set announcement banner
          setLatestAnnouncement({
            player: targetPlayerName,
            role: chosenRole,
            hero: targetHeroName,
          });

          casinoSound.playJackpot();
          setIsSpinning(false);

          // Auto move to next unpicked player if any
          const currentCombined = [...lobbyTeamRef.current, ...pohonTeamRef.current];
          const nextUnpicked = currentCombined.find(
            (p) => p.playerName !== targetPlayerName && !p.hero
          );
          if (nextUnpicked) {
            setActivePlayerForSpin(nextUnpicked.playerName);
          }

          resolve();
        }
      }, 80);
    });
  };

  // Auto spin all remaining unpicked players sequentially
  const handleAutoSpinAll = async () => {
    if (isSpinning) return;

    const currentCombined = [...lobbyTeamRef.current, ...pohonTeamRef.current];
    const unpicked = currentCombined.filter((p) => !p.hero);
    const targets = unpicked.length > 0 ? unpicked : currentCombined;

    for (const p of targets) {
      setActivePlayerForSpin(p.playerName);
      await spinForPlayer(p.playerName);
      await new Promise((res) => setTimeout(res, 300));
    }
  };

  // Reset all
  const handleReset = () => {
    setStep('pick_players');
    lobbyTeamRef.current = [];
    pohonTeamRef.current = [];
    setPohonTeam([]);
    setLobbyTeam([]);
    setLatestAnnouncement(null);
    setActivePlayerForSpin('');
  };

  // Copy draft to clipboard with Warga / Cabutan annotations
  const handleCopyDraft = () => {
    let text = `🎮 *HASIL GACHA TEAM & HERO - LAGA AMAL PANTOS* 🎮\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⬅️ *TIM KIRI:* (${pohonTeamStats.warga} Warga Pantos, ${pohonTeamStats.cabutan} Cabutan)\n`;
    pohonTeam.forEach((slot, i) => {
      const p = playerMap.get(slot.playerName.trim().toLowerCase());
      const tag = p?.status === 'Cabutan' ? '[Cabutan]' : '[Warga Pantos]';
      text += `${i + 1}. *${slot.playerName}* ${tag} ➜ [${slot.role || 'Random'}] ${slot.hero || 'Belum Gacha'}\n`;
    });
    text += `\n➡️ *TIM KANAN:* (${lobbyTeamStats.warga} Warga Pantos, ${lobbyTeamStats.cabutan} Cabutan)\n`;
    lobbyTeam.forEach((slot, i) => {
      const p = playerMap.get(slot.playerName.trim().toLowerCase());
      const tag = p?.status === 'Cabutan' ? '[Cabutan]' : '[Warga Pantos]';
      text += `${i + 1}. *${slot.playerName}* ${tag} ➜ [${slot.role || 'Random'}] ${slot.hero || 'Belum Gacha'}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔥 Siap bertanding di Land of Dawn!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Send draft to Admin Input form
  const handleApplyToAdmin = () => {
    if (!onExportToAdmin) return;
    onExportToAdmin({
      pohon: pohonTeam.map((p) => ({ player: p.playerName, hero: p.hero || 'Kadita' })),
      lobby: lobbyTeam.map((p) => ({ player: p.playerName, hero: p.hero || 'Kadita' })),
    });
  };

  // Filtered lists based on search query
  const filteredWarga = useMemo(() => {
    if (!searchQuery.trim()) return wargaPlayers;
    const q = searchQuery.toLowerCase().trim();
    return wargaPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.julukan && p.julukan.toLowerCase().includes(q)) ||
        (p.tier && p.tier.toLowerCase().includes(q))
    );
  }, [wargaPlayers, searchQuery]);

  const filteredCabutan = useMemo(() => {
    if (!searchQuery.trim()) return cabutanPlayers;
    const q = searchQuery.toLowerCase().trim();
    return cabutanPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.julukan && p.julukan.toLowerCase().includes(q)) ||
        (p.tier && p.tier.toLowerCase().includes(q))
    );
  }, [cabutanPlayers, searchQuery]);

  // Active role config for slot rendering
  const activeRoleConfig =
    MLBB_ROLES.find((r) => r.name === displayRole) || MLBB_ROLES[0];

  return (
    <div
      id="gacha-hero-pick-container"
      className="mt-12 rounded-3xl border-2 border-[#E8B33D]/40 bg-gradient-to-b from-[#1E1916] via-[#161210] to-[#0E0C0A] p-4 sm:p-7 shadow-2xl relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#E8B33D]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#332C25] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">🎰</span>
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-[#F2EDE4] uppercase flex items-center gap-2 flex-wrap">
              <span>Gacha Hero Pick</span>
              <span className="rounded-md bg-[#E8B33D]/20 px-2 py-0.5 text-[11px] font-bold text-[#E8B33D] normal-case tracking-normal border border-[#E8B33D]/30">
                Slot Kasino MLBB
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#9C948A]">
            Dashboard Laga Amal Pantos — pilih pemain (Warga Pantos & Cabutan terpisah rapi), spin acak tim, dan role & hero anti-bentrok.
          </p>
        </div>

        {/* Header Badges & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-[#E8B33D]/50 bg-[#251F1B] text-[#E8B33D]'
                : 'border-[#332C25] bg-[#161311] text-[#9C948A]'
            }`}
            title={soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio ON' : 'Audio MUTE'}</span>
          </button>

          {step === 'draft_hero' && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#1E1916] hover:bg-[#251F1B] px-3 py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Ganti Pemain</span>
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: PILIH 10 PEMAIN DENGAN PEMISAHAN WARGA PANTOS VS CABUTAN */}
      {step === 'pick_players' && (
        <div className="mt-6 space-y-6">
          {/* Status & Progress Summary Bar */}
          <div className="rounded-2xl border border-[#332C25] bg-[#171311] p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-1 text-xs font-bold text-[#E8B33D]">
                <span>Langkah 1 dari 2</span>
                <span>·</span>
                <span>
                  {selectedPlayerNames.length === 10
                    ? '✅ 10 Pemain Siap Di-Spin ke Tim!'
                    : `Pilih 10 Pemain (${selectedPlayerNames.length}/10)`}
                </span>
              </span>

              {/* Roster tally pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#332C25] bg-[#221C18] px-3 py-1 text-xs">
                <span className="flex items-center gap-1 text-[#E8B33D] font-bold">
                  <Crown size={12} />
                  <span>{selectedWargaCount} Warga Pantos</span>
                </span>
                <span className="text-[#332C25] font-black">|</span>
                <span className="flex items-center gap-1 text-purple-300 font-bold">
                  <Ticket size={12} />
                  <span>{selectedCabutanCount} Pemain Cabutan</span>
                </span>
              </div>
            </div>

            {/* Quick Actions & Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleQuickSelectOnlyWarga}
                className="flex items-center gap-1.5 rounded-xl border border-[#E8B33D]/40 bg-[#251F1B] hover:border-[#E8B33D] hover:text-[#E8B33D] px-2.5 py-1.5 text-xs font-bold text-[#F2EDE4] transition-all cursor-pointer"
                title="Pilih otomatis 10 Warga Pantos"
              >
                <Crown size={13} className="text-[#E8B33D]" />
                <span>Pilih 10 Warga</span>
              </button>

              {cabutanPlayers.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickSelectMixed(8, 2)}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-[#231A29] hover:border-purple-400 hover:text-purple-200 px-2.5 py-1.5 text-xs font-bold text-purple-300 transition-all cursor-pointer"
                  title="Pilih campuran: 8 Warga Pantos + 2 Pemain Cabutan"
                >
                  <Scale size={13} />
                  <span>8 Warga + 2 Cabutan</span>
                </button>
              )}

              {selectedPlayerNames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayerNames([])}
                  className="rounded-xl border border-[#332C25] bg-[#161311] hover:bg-[#251F1B] px-2.5 py-1.5 text-xs text-[#9C948A] hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>
          </div>

          {/* Search & Category Filter Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#161311] p-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-[#E8B33D] text-[#161311] shadow'
                    : 'text-[#9C948A] hover:text-[#F2EDE4]'
                }`}
              >
                <Users size={13} />
                <span>Semua ({players.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('warga')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'warga'
                    ? 'bg-[#E8B33D] text-[#161311] shadow'
                    : 'text-[#9C948A] hover:text-[#E8B33D]'
                }`}
              >
                <Crown size={13} />
                <span>Warga Pantos ({wargaPlayers.length})</span>
                <span className="rounded-full bg-[#161311]/30 px-1.5 py-0.2 text-[10px]">
                  {selectedWargaCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('cabutan')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'cabutan'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-[#9C948A] hover:text-purple-300'
                }`}
              >
                <Ticket size={13} />
                <span>Pemain Cabutan ({cabutanPlayers.length})</span>
                <span className="rounded-full bg-[#161311]/30 px-1.5 py-0.2 text-[10px]">
                  {selectedCabutanCount}
                </span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C948A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pemain..."
                className="w-full rounded-xl border border-[#332C25] bg-[#161311] pl-9 pr-8 py-2 text-xs text-[#F2EDE4] placeholder-[#9C948A] focus:border-[#E8B33D] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#F2EDE4]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* DUAL SECTIONS: SEPARATED WARGA PANTOS & PEMAIN CABUTAN */}
          <div className="space-y-6">
            {/* SECTION 1: WARGA PANTOS */}
            {(categoryFilter === 'all' || categoryFilter === 'warga') && (
              <div className="rounded-2xl border-2 border-[#E8B33D]/30 bg-[#161311]/70 p-4 sm:p-5 space-y-3.5 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-[#E8B33D]/10 blur-2xl" />

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#332C25] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8B33D]/20 text-[#E8B33D] border border-[#E8B33D]/40">
                      <Crown size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-[#F2EDE4] uppercase tracking-wide">
                          Warga Pantos
                        </h3>
                        <span className="rounded-full bg-[#E8B33D]/15 border border-[#E8B33D]/40 px-2 py-0.5 text-[10px] font-bold text-[#E8B33D]">
                          Roster Utama
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9C948A]">
                        Pemain inti dan anggota resmi komunitas Pantos MLBB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-semibold text-[#9C948A]">
                      Terpilih:{' '}
                      <strong className="text-[#E8B33D]">{selectedWargaCount}</strong> / {wargaPlayers.length}
                    </span>
                  </div>
                </div>

                {/* Grid of Warga Cards */}
                {filteredWarga.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#9C948A]">
                    {searchQuery
                      ? `Tidak ditemukan Warga Pantos dengan nama "${searchQuery}"`
                      : 'Belum ada pemain terdaftar sebagai Warga Pantos di season ini.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {filteredWarga.map((p, idx) => {
                      const isSelected = selectedPlayerNames.includes(p.name);
                      return (
                        <button
                          key={`gacha-warga-${p.id || p.name}-${idx}`}
                          type="button"
                          onClick={() => togglePlayerSelection(p.name)}
                          className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'border-[#E8B33D] bg-gradient-to-r from-[#2C2319] to-[#211A13] shadow-md shadow-[#E8B33D]/15 ring-1 ring-[#E8B33D]/40'
                              : 'border-[#332C25] bg-[#181412] opacity-80 hover:opacity-100 hover:border-[#E8B33D]/40 hover:bg-[#1E1916]'
                          }`}
                        >
                          <PlayerAvatar
                            name={p.name}
                            avatarUrl={p.avatar_url}
                            player={p}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-[#F2EDE4]' : 'text-[#9C948A]'
                              }`}
                            >
                              {p.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-[#E8B33D] bg-[#E8B33D]/15 px-1 py-0.2 rounded border border-[#E8B33D]/30">
                                Warga
                              </span>
                              {p.tier && (
                                <span className="text-[9px] text-[#9C948A] truncate">
                                  {p.tier}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8B33D] text-[#161311]">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: PEMAIN CABUTAN */}
            {(categoryFilter === 'all' || categoryFilter === 'cabutan') && (
              <div className="rounded-2xl border-2 border-purple-500/30 bg-[#161218]/70 p-4 sm:p-5 space-y-3.5 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-purple-600/10 blur-2xl" />

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#332C25] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-950/60 text-purple-300 border border-purple-500/40">
                      <Ticket size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-[#F2EDE4] uppercase tracking-wide">
                          Pemain Cabutan
                        </h3>
                        <span className="rounded-full bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          Pemain Tamu / Cadangan
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9C948A]">
                        Pemain pinjaman, tamu undangan, atau pelengkap slot dari luar warga Pantos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-semibold text-[#9C948A]">
                      Terpilih:{' '}
                      <strong className="text-purple-300">{selectedCabutanCount}</strong> / {cabutanPlayers.length}
                    </span>
                  </div>
                </div>

                {/* Grid of Cabutan Cards */}
                {filteredCabutan.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#9C948A] rounded-xl border border-dashed border-[#332C25] bg-[#141016]">
                    {searchQuery ? (
                      `Tidak ditemukan Pemain Cabutan dengan kata kunci "${searchQuery}"`
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-[#9C948A]">Belum ada pemain berstatus Cabutan</p>
                        <p className="text-[11px] text-[#9C948A]/70">
                          Semua pemain saat ini berstatus Warga Pantos. Anda dapat mengubah status pemain menjadi Cabutan di menu Admin / Kelola Pemain.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {filteredCabutan.map((p, idx) => {
                      const isSelected = selectedPlayerNames.includes(p.name);
                      return (
                        <button
                          key={`gacha-cabutan-${p.id || p.name}-${idx}`}
                          type="button"
                          onClick={() => togglePlayerSelection(p.name)}
                          className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'border-purple-500 bg-gradient-to-r from-[#291B33] to-[#1E1426] shadow-md shadow-purple-500/15 ring-1 ring-purple-500/40'
                              : 'border-[#332C25] bg-[#181412] opacity-80 hover:opacity-100 hover:border-purple-500/40 hover:bg-[#1E1724]'
                          }`}
                        >
                          <PlayerAvatar
                            name={p.name}
                            avatarUrl={p.avatar_url}
                            player={p}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-[#F2EDE4]' : 'text-[#9C948A]'
                              }`}
                            >
                              {p.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-purple-300 bg-purple-950/80 px-1 py-0.2 rounded border border-purple-500/40">
                                Cabutan
                              </span>
                              {p.tier && (
                                <span className="text-[9px] text-[#9C948A] truncate">
                                  {p.tier}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer: Spin Teams + Fair Balance Option */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[#332C25]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="text-xs text-[#9C948A]">
                Total Terpilih:{' '}
                <strong className={selectedPlayerNames.length === 10 ? 'text-[#E8B33D]' : 'text-amber-500'}>
                  {selectedPlayerNames.length} / 10 Pemain
                </strong>
                {selectedPlayerNames.length === 10 && (
                  <span className="block text-[11px] text-[#9C948A] mt-0.5">
                    ({selectedWargaCount} Warga Pantos, {selectedCabutanCount} Pemain Cabutan)
                  </span>
                )}
              </div>

              {/* Fair balance toggle */}
              {selectedCabutanCount > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none bg-[#1A1613] border border-[#332C25] hover:border-[#E8B33D]/50 px-3 py-1.5 rounded-xl transition-colors">
                  <input
                    type="checkbox"
                    checked={balanceCabutan}
                    onChange={(e) => setBalanceCabutan(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#E8B33D] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5">
                    <Scale size={13} className="text-[#E8B33D]" />
                    <span>Bagi Rata Cabutan di Kedua Tim</span>
                  </span>
                  <span className="text-[10px] text-[#9C948A] hidden md:inline">
                    (Fair Split)
                  </span>
                </label>
              )}
            </div>

            <button
              type="button"
              disabled={selectedPlayerNames.length !== 10 || isTeamSpinning}
              onClick={handleSpinTeams}
              className={`flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-wider transition-all shadow-xl ${
                selectedPlayerNames.length === 10 && !isTeamSpinning
                  ? 'bg-gradient-to-r from-[#E8B33D] via-[#F59E0B] to-[#D97706] text-[#161311] hover:brightness-110 active:scale-95 shadow-[#E8B33D]/20 cursor-pointer'
                  : 'bg-[#251F1B] text-[#9C948A] border border-[#332C25] cursor-not-allowed opacity-60'
              }`}
            >
              <Dices size={18} className={isTeamSpinning ? 'animate-spin' : ''} />
              <span>
                {isTeamSpinning
                  ? 'Mengacak Pembagian Tim...'
                  : selectedPlayerNames.length === 10
                  ? '🎰 Spin Acak Tim Kiri vs Kanan!'
                  : `Pilih ${10 - selectedPlayerNames.length} Pemain Lagi`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: GACHA HERO & ROLE (WITH PROMINENT WARGA VS CABUTAN LABELS) */}
      {step === 'draft_hero' && (
        <div className="mt-6 space-y-6">
          {/* Status Pill & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8B33D]/60 bg-[#E8B33D]/10 px-3.5 py-1 text-xs font-bold text-[#E8B33D]">
              <span>
                {completedCount === 10
                  ? 'Selesai — 10 pemain sudah dapat role & hero'
                  : `Draft Sedang Berjalan — ${completedCount}/10 pemain sudah dapat role & hero`}
              </span>
            </div>

            <div className="text-xs text-[#9C948A]">
              Tersisa <span className="font-bold text-[#E8B33D]">{10 - completedCount}</span> pemain
            </div>
          </div>

          {/* Top Controls Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Player dropdown selector with profile photo & Warga/Cabutan badge */}
            <div className="relative flex-1 flex items-center">
              <div className="pointer-events-none absolute left-3 z-10 flex items-center">
                <PlayerAvatar
                  name={activePlayerForSpin}
                  avatarUrl={playerMap.get(activePlayerForSpin.trim().toLowerCase())?.avatar_url}
                  player={playerMap.get(activePlayerForSpin.trim().toLowerCase())}
                  size="xs"
                />
              </div>
              <select
                id="gacha-player-select"
                value={activePlayerForSpin}
                onChange={(e) => setActivePlayerForSpin(e.target.value)}
                disabled={isSpinning}
                className="w-full appearance-none rounded-xl border border-[#332C25] bg-[#171412] pl-10 pr-10 py-3 text-sm font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
              >
                <optgroup label="🛋️ TIM LOBBY (KANAN)">
                  {lobbyTeam.map((slot, index) => {
                    const p = playerMap.get(slot.playerName.trim().toLowerCase());
                    const tag = p?.status === 'Cabutan' ? '[Cabutan]' : '[Warga]';
                    return (
                      <option key={`opt-lobby-${slot.playerName}-${index}`} value={slot.playerName}>
                        {tag} {slot.playerName} {slot.hero ? `(✅ ${slot.role} - ${slot.hero})` : '(🎲 Belum Roll)'}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="🌳 TIM POHON (KIRI)">
                  {pohonTeam.map((slot, index) => {
                    const p = playerMap.get(slot.playerName.trim().toLowerCase());
                    const tag = p?.status === 'Cabutan' ? '[Cabutan]' : '[Warga]';
                    return (
                      <option key={`opt-pohon-${slot.playerName}-${index}`} value={slot.playerName}>
                        {tag} {slot.playerName} {slot.hero ? `(✅ ${slot.role} - ${slot.hero})` : '(🎲 Belum Roll)'}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9C948A]">
                <ChevronDown size={16} />
              </div>
            </div>

            {/* Spin Slot button */}
            <button
              type="button"
              disabled={isSpinning || !activePlayerForSpin}
              onClick={() => spinForPlayer(activePlayerForSpin)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8B33D] to-[#D97706] px-5 py-3 text-sm font-black text-[#161311] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E8B33D]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={15} fill="currentColor" />
              <span>{isSpinning ? 'Sedang Memutar Slot...' : 'Spin Slot'}</span>
            </button>

            {/* Auto Spin All button */}
            <button
              type="button"
              disabled={isSpinning}
              onClick={handleAutoSpinAll}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#E8B33D]/40 bg-[#241E1A] hover:bg-[#2F2722] px-4 py-3 text-sm font-bold text-[#E8B33D] hover:text-[#F2EDE4] transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={15} />
              <span>Spin Semua Otomatis</span>
            </button>

            {/* Reset Draft */}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#332C25] bg-[#171412] hover:bg-[#251F1B] px-3.5 py-3 text-sm font-semibold text-[#9C948A] hover:text-[#F2EDE4] transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>

          {/* Anti-Bentrok 1 Tim Live Role Indicator */}
          <div className="rounded-2xl border border-[#E8B33D]/30 bg-[#161210] p-3 sm:p-4 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#332C25]/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8B33D]/15 px-2.5 py-1 text-xs font-black text-[#E8B33D] border border-[#E8B33D]/40">
                  <ShieldAlert size={14} className="text-[#E8B33D]" />
                  <span>SISTEM ANTI-BENTROK 1 TIM</span>
                </span>
                <span className="text-xs font-bold text-[#F2EDE4] flex items-center gap-1.5 flex-wrap">
                  <span>{activeRoleStatus.teamName} — Giliran Spin:</span>
                  {activePlayerForSpin && (() => {
                    const ap = playerMap.get(activePlayerForSpin.trim().toLowerCase());
                    const isWarga = ap ? ap.status === 'Aktif' : true;
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#251F1B] border border-[#E8B33D]/40 px-2 py-0.5">
                        <PlayerAvatar
                          name={activePlayerForSpin}
                          avatarUrl={ap?.avatar_url}
                          player={ap}
                          size="xs"
                        />
                        <strong className="text-[#E8B33D]">{activePlayerForSpin}</strong>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                            isWarga
                              ? 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/40'
                              : 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                          }`}
                        >
                          {isWarga ? 'Warga' : 'Cabutan'}
                        </span>
                      </span>
                    );
                  })()}
                  {!activePlayerForSpin && <strong className="text-[#E8B33D]">-</strong>}
                </span>
              </div>
              <div className="text-[11px] text-[#9C948A]">
                Role tersedia di tim ini:{' '}
                <strong className="text-[#E8B33D]">
                  {activeRoleStatus.availableRoles.length}
                </strong>{' '}
                / 6 role
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
              <span className="text-[11px] font-semibold text-[#9C948A] mr-1">
                Ketersediaan Role:
              </span>
              {MLBB_ROLES.map((r) => {
                const isTaken = activeRoleStatus.takenRolesInTeam.has(r.name);
                return (
                  <span
                    key={`role-indicator-${r.name}`}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border transition-all ${
                      isTaken
                        ? 'border-[#332C25] bg-[#1F1916] text-[#9C948A]/40 line-through opacity-40 select-none'
                        : `${r.badgeClass} ring-1 ring-white/10 shadow-sm`
                    }`}
                    title={
                      isTaken
                        ? `${r.name} sudah dipakai rekan di ${activeRoleStatus.teamName} (dikecualikan)`
                        : `${r.name} tersedia untuk di-roll`
                    }
                  >
                    <span>{r.icon}</span>
                    <span>{r.name}</span>
                    {isTaken ? (
                      <span className="text-[9px] no-underline font-normal text-rose-400">
                        ✕
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#E8B33D] font-normal">●</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* THE CASINO SLOT REEL MACHINE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LEFT SLOT: ROLE */}
            <div className="rounded-2xl border-2 border-[#332C25] bg-[#151210] p-5 text-center shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9C948A] mb-3">
                ROLE
              </span>

              <div className="flex flex-col items-center justify-center gap-2">
                <span
                  className={`text-3xl sm:text-4xl transition-transform duration-75 ${
                    isSpinning ? 'scale-125 animate-bounce' : 'scale-100'
                  }`}
                >
                  {activeRoleConfig.icon}
                </span>
                <span className="text-lg sm:text-xl font-black text-[#F2EDE4] tracking-wide">
                  {displayRole}
                </span>
              </div>

              <div className="pointer-events-none absolute inset-0 border border-white/5 rounded-2xl" />
            </div>

            {/* RIGHT SLOT: HERO */}
            <div className="rounded-2xl border-2 border-[#332C25] bg-[#151210] p-5 text-center shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9C948A] mb-3">
                HERO
              </span>

              <div className="flex flex-col items-center justify-center gap-2">
                {displayHeroAvatar ? (
                  <img
                    src={displayHeroAvatar}
                    alt={displayHero}
                    referrerPolicy="no-referrer"
                    className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-[#E8B33D] object-cover shadow-lg transition-transform duration-75 ${
                      isSpinning ? 'rotate-12 scale-110' : 'scale-100'
                    }`}
                  />
                ) : (
                  <HeroAvatar heroName={displayHero} size="md" />
                )}
                <span className="text-lg sm:text-xl font-black text-[#F2EDE4] tracking-wide">
                  {displayHero}
                </span>
              </div>

              <div className="pointer-events-none absolute inset-0 border border-white/5 rounded-2xl" />
            </div>
          </div>

          {/* ANNOUNCEMENT BANNER */}
          {latestAnnouncement && (() => {
            const annPlayer = playerMap.get(latestAnnouncement.player.trim().toLowerCase());
            const isWarga = annPlayer ? annPlayer.status === 'Aktif' : true;
            return (
              <div
                id="gacha-announcement-banner"
                className="rounded-2xl border-2 border-dashed border-[#E8B33D]/50 bg-gradient-to-r from-[#2A2218] via-[#1E1916] to-[#2A2218] p-4 text-center shadow-lg transition-all animate-fade-in"
              >
                <div className="text-sm sm:text-base font-bold text-[#F2EDE4] flex flex-wrap items-center justify-center gap-2">
                  <span>🎉</span>
                  <PlayerAvatar
                    name={latestAnnouncement.player}
                    avatarUrl={annPlayer?.avatar_url}
                    player={annPlayer}
                    size="xs"
                  />
                  <span className="text-[#E8B33D] font-black">{latestAnnouncement.player}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                      isWarga
                        ? 'border-[#E8B33D]/40 bg-[#E8B33D]/15 text-[#E8B33D]'
                        : 'border-purple-500/40 bg-purple-950/40 text-purple-300'
                    }`}
                  >
                    {isWarga ? '👑 Warga Pantos' : '🎟️ Cabutan'}
                  </span>
                  <span>akan main</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      MLBB_ROLES.find((r) => r.name === latestAnnouncement.role)?.badgeClass ||
                      'border-[#332C25] text-purple-400'
                    }`}
                  >
                    <span>{MLBB_ROLES.find((r) => r.name === latestAnnouncement.role)?.icon}</span>
                    <span>{latestAnnouncement.role}</span>
                  </span>
                  <span>—</span>
                  <span className="text-[#E8B33D] font-black underline decoration-2 underline-offset-4">
                    {latestAnnouncement.hero}!
                  </span>
                </div>
              </div>
            );
          })()}

          {/* DRAFT RESULTS DISPLAY (TIM KIRI & TIM KANAN) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* TIM KIRI (POHON) */}
            <div className="rounded-2xl border border-[#332C25] bg-[#161311] p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⬅️</span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[#F2EDE4] tracking-wide">
                      Tim Kiri
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#9C948A]">
                      <span className="text-[#E8B33D] font-bold">{pohonTeamStats.warga} Warga</span>
                      <span>·</span>
                      <span className="text-purple-300 font-bold">{pohonTeamStats.cabutan} Cabutan</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-[#251F1B] border border-[#332C25] px-2.5 py-0.5 text-[11px] font-bold text-[#9C948A]">
                  {pohonTeam.filter((p) => !!p.hero).length} / 5 Picked
                </span>
              </div>

              <div className="space-y-2">
                {pohonTeam.map((slot, index) => {
                  const roleConfig = slot.role
                    ? MLBB_ROLES.find((r) => r.name === slot.role)
                    : null;
                  const isCurrent = activePlayerForSpin === slot.playerName;
                  const playerObj = playerMap.get(slot.playerName.trim().toLowerCase());
                  const playerAvatarUrl = slot.avatarUrl || playerObj?.avatar_url;
                  const isCabutan = playerObj?.status === 'Cabutan';

                  return (
                    <div
                      key={`pohon-slot-${slot.playerName}-${index}`}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:px-3 transition-all ${
                        isCurrent
                          ? 'border-[#E8B33D] bg-[#221B16] shadow-sm'
                          : slot.hero
                          ? 'border-[#332C25] bg-[#1C1815]'
                          : 'border-dashed border-[#332C25]/80 bg-[#14110F]'
                      }`}
                    >
                      {/* Left: Number + Player Name + Warga/Cabutan Badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251F1B] border border-[#332C25] text-xs font-black text-[#E8B33D]">
                          {index + 1}
                        </span>
                        <PlayerAvatar
                          name={slot.playerName}
                          avatarUrl={playerAvatarUrl}
                          player={playerObj}
                          size="sm"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-[#F2EDE4] truncate">
                              {slot.playerName}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border shrink-0 ${
                                isCabutan
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                  : 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/40'
                              }`}
                            >
                              {isCabutan ? 'Cabutan' : 'Warga'}
                            </span>
                          </div>
                          {playerObj?.tier && (
                            <span className="text-[10px] text-[#9C948A] truncate">
                              {playerObj.tier}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Role & Hero */}
                      <div className="flex items-center gap-2 shrink-0">
                        {slot.hero ? (
                          <>
                            {roleConfig && (
                              <span
                                className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${roleConfig.badgeClass}`}
                              >
                                <span>{roleConfig.icon}</span>
                                <span>{roleConfig.name}</span>
                              </span>
                            )}
                            <div className="flex items-center gap-1.5">
                              {slot.heroAvatar && (
                                <img
                                  src={slot.heroAvatar}
                                  alt={slot.hero}
                                  referrerPolicy="no-referrer"
                                  className="h-6 w-6 rounded-full border border-[#E8B33D]/50 object-cover"
                                />
                              )}
                              <span className="text-xs sm:text-sm font-bold text-[#F2EDE4]">
                                {slot.hero}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePlayerForSpin(slot.playerName);
                                spinForPlayer(slot.playerName);
                              }}
                              className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241F] hover:text-[#E8B33D] transition-colors cursor-pointer"
                              title="Re-roll hero & role untuk pemain ini"
                            >
                              <Dices size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePlayerForSpin(slot.playerName);
                              spinForPlayer(slot.playerName);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-[#E8B33D]/40 bg-[#251F1B] px-2.5 py-1 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D] hover:text-[#161311] transition-all cursor-pointer"
                          >
                            <Play size={11} fill="currentColor" />
                            <span>Gacha</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIM KANAN (LOBBY) */}
            <div className="rounded-2xl border border-[#332C25] bg-[#161311] p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">➡️</span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[#F2EDE4] tracking-wide">
                      Tim Kanan
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#9C948A]">
                      <span className="text-[#E8B33D] font-bold">{lobbyTeamStats.warga} Warga</span>
                      <span>·</span>
                      <span className="text-purple-300 font-bold">{lobbyTeamStats.cabutan} Cabutan</span>
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-[#251F1B] border border-[#332C25] px-2.5 py-0.5 text-[11px] font-bold text-[#9C948A]">
                  {lobbyTeam.filter((p) => !!p.hero).length} / 5 Picked
                </span>
              </div>

              <div className="space-y-2">
                {lobbyTeam.map((slot, index) => {
                  const roleConfig = slot.role
                    ? MLBB_ROLES.find((r) => r.name === slot.role)
                    : null;
                  const isCurrent = activePlayerForSpin === slot.playerName;
                  const playerObj = playerMap.get(slot.playerName.trim().toLowerCase());
                  const playerAvatarUrl = slot.avatarUrl || playerObj?.avatar_url;
                  const isCabutan = playerObj?.status === 'Cabutan';

                  return (
                    <div
                      key={`lobby-slot-${slot.playerName}-${index}`}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:px-3 transition-all ${
                        isCurrent
                          ? 'border-[#E8B33D] bg-[#221B16] shadow-sm'
                          : slot.hero
                          ? 'border-[#332C25] bg-[#1C1815]'
                          : 'border-dashed border-[#332C25]/80 bg-[#14110F]'
                      }`}
                    >
                      {/* Left: Number + Player Name + Warga/Cabutan Badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251F1B] border border-[#332C25] text-xs font-black text-[#E8B33D]">
                          {index + 1}
                        </span>
                        <PlayerAvatar
                          name={slot.playerName}
                          avatarUrl={playerAvatarUrl}
                          player={playerObj}
                          size="sm"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-[#F2EDE4] truncate">
                              {slot.playerName}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border shrink-0 ${
                                isCabutan
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                  : 'bg-[#E8B33D]/15 text-[#E8B33D] border-[#E8B33D]/40'
                              }`}
                            >
                              {isCabutan ? 'Cabutan' : 'Warga'}
                            </span>
                          </div>
                          {playerObj?.tier && (
                            <span className="text-[10px] text-[#9C948A] truncate">
                              {playerObj.tier}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Role & Hero */}
                      <div className="flex items-center gap-2 shrink-0">
                        {slot.hero ? (
                          <>
                            {roleConfig && (
                              <span
                                className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${roleConfig.badgeClass}`}
                              >
                                <span>{roleConfig.icon}</span>
                                <span>{roleConfig.name}</span>
                              </span>
                            )}
                            <div className="flex items-center gap-1.5">
                              {slot.heroAvatar && (
                                <img
                                  src={slot.heroAvatar}
                                  alt={slot.hero}
                                  referrerPolicy="no-referrer"
                                  className="h-6 w-6 rounded-full border border-[#E8B33D]/50 object-cover"
                                />
                              )}
                              <span className="text-xs sm:text-sm font-bold text-[#F2EDE4]">
                                {slot.hero}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePlayerForSpin(slot.playerName);
                                spinForPlayer(slot.playerName);
                              }}
                              className="rounded-lg p-1.5 text-[#9C948A] hover:bg-[#2A241F] hover:text-[#E8B33D] transition-colors cursor-pointer"
                              title="Re-roll hero & role untuk pemain ini"
                            >
                              <Dices size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePlayerForSpin(slot.playerName);
                              spinForPlayer(slot.playerName);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-[#E8B33D]/40 bg-[#251F1B] px-2.5 py-1 text-xs font-bold text-[#E8B33D] hover:bg-[#E8B33D] hover:text-[#161311] transition-all cursor-pointer"
                          >
                            <Play size={11} fill="currentColor" />
                            <span>Gacha</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: COPY RESULTS & EXPORT TO ADMIN */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#332C25]">
            <p className="text-[11px] text-[#9C948A] text-center sm:text-left">
              Data hero & role disinkronkan resmi dari Mobile Legends: Bang Bang (https://www.mobilelegends.com/hero).
            </p>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-[#332C25] bg-[#221B16] hover:bg-[#2C231D] hover:border-[#E8B33D]/50 px-4 py-2.5 text-xs font-bold text-[#F2EDE4] transition-colors cursor-pointer"
              >
                {copySuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copySuccess ? 'Hasil Tersalin ke Clipboard!' : 'Salin Hasil Draft (WA/Discord)'}</span>
              </button>

              {onExportToAdmin && (
                <button
                  type="button"
                  onClick={handleApplyToAdmin}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E8B33D] to-[#D97706] px-4 py-2.5 text-xs font-black text-[#161311] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#E8B33D]/20 cursor-pointer"
                >
                  <span>Bawa ke Form Admin Match</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
