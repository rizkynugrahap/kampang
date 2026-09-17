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
  Share2,
} from 'lucide-react';
import { Player, Hero } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { HeroAvatar } from './HeroAvatar';
import { MLBB_HEROES } from '../data/heroes';
import { casinoSound } from '../utils/casinoSound';

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

  // Selected 10 players
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>(() => {
    // Default pick top 10 active players
    return players.slice(0, 10).map((p) => p.name);
  });

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

  // Latest announcement banner (e.g. "Bang Jack akan main Mage — Eudora!")
  const [latestAnnouncement, setLatestAnnouncement] = useState<{
    player: string;
    role: MLBBHeroRole;
    hero: string;
  } | null>(null);

  // Copy success notification
  const [copySuccess, setCopySuccess] = useState(false);

  // Team shuffle spinning animation
  const [isTeamSpinning, setIsTeamSpinning] = useState(false);

  // Status of available roles for the currently selected player's team (ANTI-ROLE CLASH)
  const activeRoleStatus = useMemo(() => {
    const isLobby = lobbyTeam.some((p) => p.playerName === activePlayerForSpin);
    const teamSlots = isLobby ? lobbyTeam : pohonTeam;
    const teamName = isLobby ? 'Tim Lobby' : 'Tim Pohon';

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

  // Quick select 10 active players
  const handleQuickSelect10 = () => {
    const activeOnes = players.filter((p) => p.status === 'Aktif').map((p) => p.name);
    const cabutanOnes = players.filter((p) => p.status !== 'Aktif').map((p) => p.name);
    const combined = [...activeOnes, ...cabutanOnes].slice(0, 10);
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

        // Fisher-Yates shuffle
        const shuffled = [...selectedPlayerNames];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const lobby = shuffled.slice(0, 5).map((playerName) => ({ playerName }));
        const pohon = shuffled.slice(5, 10).map((playerName) => ({ playerName }));

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
        // The slot reel cycles visually through the valid available roles for this team
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
          const updatedSlot: PlayerDraftSlot = {
            playerName: targetPlayerName,
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

  // Copy draft to clipboard
  const handleCopyDraft = () => {
    let text = `🎮 *HASIL GACHA TEAM & HERO - LAGA AMAL PANTOS* 🎮\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🛋️ *TIM LOBBY:*\n`;
    lobbyTeam.forEach((slot, i) => {
      text += `${i + 1}. *${slot.playerName}* ➜ [${slot.role || 'Random'}] ${slot.hero || 'Belum Gacha'}\n`;
    });
    text += `\n🌳 *TIM POHON:*\n`;
    pohonTeam.forEach((slot, i) => {
      text += `${i + 1}. *${slot.playerName}* ➜ [${slot.role || 'Random'}] ${slot.hero || 'Belum Gacha'}\n`;
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
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-[#F2EDE4] uppercase flex items-center gap-2">
              <span>Gacha Hero Pick</span>
              <span className="rounded-md bg-[#E8B33D]/20 px-2 py-0.5 text-[11px] font-bold text-[#E8B33D] normal-case tracking-normal border border-[#E8B33D]/30">
                Slot Kasino MLBB
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#9C948A]">
            Konsep untuk dashboard Laga Amal Pantos — pilih pemain, spin, dapatkan role & hero acak.
          </p>
        </div>

        {/* Header Badges & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
              className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#1E1916] hover:bg-[#251F1B] px-3 py-1.5 text-xs font-semibold text-[#9C948A] hover:text-[#F2EDE4] transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: PILIH 10 PEMAIN & GACHA TIM POHON VS LOBBY */}
      {step === 'pick_players' && (
        <div className="mt-6 space-y-5">
          {/* Progress / Step Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8B33D]/50 bg-[#E8B33D]/10 px-3 py-1 text-xs font-bold text-[#E8B33D]">
            <span>Langkah 1 dari 2</span>
            <span>·</span>
            <span>
              {selectedPlayerNames.length === 10
                ? '✅ 10 Pemain Siap Di-Gacha ke Tim!'
                : `Pilih 10 Pemain (${selectedPlayerNames.length}/10)`}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#F2EDE4]">
                Tentukan 10 Pemain Yang Akan Bermain
              </h3>
              <p className="text-xs text-[#9C948A] mt-0.5">
                Klik kartu pemain untuk memilih/membatalkan. Setelah 10 pemain terpilih, putar slot untuk pembagian tim.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickSelect10}
                className="flex items-center gap-1.5 rounded-xl border border-[#332C25] bg-[#251F1B] hover:border-[#E8B33D]/60 hover:text-[#E8B33D] px-3 py-1.5 text-xs font-bold text-[#F2EDE4] transition-all"
              >
                <Users size={14} />
                <span>Pilih Cepat 10 Roster Aktif</span>
              </button>
              {selectedPlayerNames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayerNames([])}
                  className="rounded-xl border border-[#332C25] bg-[#161311] px-2.5 py-1.5 text-xs text-[#9C948A] hover:text-[#F2EDE4]"
                >
                  Bersihkan
                </button>
              )}
            </div>
          </div>

          {/* Player selection chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {players.map((p, idx) => {
              const isSelected = selectedPlayerNames.includes(p.name);
              return (
                <button
                  key={`gacha-player-${p.id || p.name}-${idx}`}
                  type="button"
                  onClick={() => togglePlayerSelection(p.name)}
                  className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#E8B33D] bg-[#2A2218] shadow-md shadow-[#E8B33D]/10'
                      : 'border-[#332C25] bg-[#181412] opacity-75 hover:opacity-100 hover:border-[#4A3F35]'
                  }`}
                >
                  <PlayerAvatar name={p.name} avatarUrl={p.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-[#F2EDE4]' : 'text-[#9C948A]'
                      }`}
                    >
                      {p.name}
                    </p>
                    <span className="text-[10px] text-[#9C948A] block">
                      {p.status === 'Aktif' ? 'Warga Pantos' : 'Cabutan'}
                    </span>
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

          {/* Action to Spin Teams */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#332C25]">
            <div className="text-xs text-[#9C948A]">
              Terpilih:{' '}
              <strong className={selectedPlayerNames.length === 10 ? 'text-[#E8B33D]' : 'text-amber-500'}>
                {selectedPlayerNames.length} / 10 Pemain
              </strong>
            </div>

            <button
              type="button"
              disabled={selectedPlayerNames.length !== 10 || isTeamSpinning}
              onClick={handleSpinTeams}
              className={`w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-wider transition-all shadow-xl ${
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
                  ? '🎰 Spin Acak Tim Pohon vs Lobby!'
                  : `Pilih ${10 - selectedPlayerNames.length} Pemain Lagi`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: GACHA HERO & ROLE (MATCHING SCREENSHOT LAYOUT) */}
      {step === 'draft_hero' && (
        <div className="mt-6 space-y-6">
          {/* Status Pill matching screenshot */}
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

          {/* Top Controls Row matching screenshot */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Player dropdown selector */}
            <div className="relative flex-1">
              <select
                id="gacha-player-select"
                value={activePlayerForSpin}
                onChange={(e) => setActivePlayerForSpin(e.target.value)}
                disabled={isSpinning}
                className="w-full appearance-none rounded-xl border border-[#332C25] bg-[#171412] px-4 py-3 pr-10 text-sm font-bold text-[#F2EDE4] focus:border-[#E8B33D] focus:outline-none cursor-pointer"
              >
                <optgroup label="🛋️ TIM LOBBY">
                  {lobbyTeam.map((slot, index) => (
                    <option key={`opt-lobby-${slot.playerName}-${index}`} value={slot.playerName}>
                      {slot.playerName} {slot.hero ? `(✅ ${slot.role} - ${slot.hero})` : '(🎲 Belum Roll)'}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🌳 TIM POHON">
                  {pohonTeam.map((slot, index) => (
                    <option key={`opt-pohon-${slot.playerName}-${index}`} value={slot.playerName}>
                      {slot.playerName} {slot.hero ? `(✅ ${slot.role} - ${slot.hero})` : '(🎲 Belum Roll)'}
                    </option>
                  ))}
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
                <span className="text-xs font-bold text-[#F2EDE4]">
                  {activeRoleStatus.teamName} — Giliran Spin:{' '}
                  <strong className="text-[#E8B33D]">{activePlayerForSpin || '-'}</strong>
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

          {/* THE CASINO SLOT REEL MACHINE (Matching exact 2-box design in screenshot) */}
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

              {/* Slot frame highlight shimmer */}
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

              {/* Slot frame highlight shimmer */}
              <div className="pointer-events-none absolute inset-0 border border-white/5 rounded-2xl" />
            </div>
          </div>

          {/* ANNOUNCEMENT BANNER MATCHING SCREENSHOT */}
          {latestAnnouncement && (
            <div
              id="gacha-announcement-banner"
              className="rounded-2xl border-2 border-dashed border-[#E8B33D]/50 bg-gradient-to-r from-[#2A2218] via-[#1E1916] to-[#2A2218] p-4 text-center shadow-lg transition-all animate-fade-in"
            >
              <div className="text-sm sm:text-base font-bold text-[#F2EDE4] flex flex-wrap items-center justify-center gap-2">
                <span>🎉</span>
                <span className="text-[#E8B33D] font-black">{latestAnnouncement.player}</span>
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
          )}

          {/* DRAFT RESULTS DISPLAY (TIM LOBBY & TIM POHON) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* TIM LOBBY */}
            <div className="rounded-2xl border border-[#332C25] bg-[#161311] p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛋️</span>
                  <h3 className="font-black text-sm sm:text-base text-[#F2EDE4] tracking-wide">
                    Tim Lobby
                  </h3>
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
                      {/* Left: Number + Player Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251F1B] border border-[#332C25] text-xs font-black text-[#E8B33D]">
                          {index + 1}
                        </span>
                        <PlayerAvatar name={slot.playerName} size="sm" />
                        <span className="text-xs sm:text-sm font-bold text-[#F2EDE4] truncate">
                          {slot.playerName}
                        </span>
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

            {/* TIM POHON */}
            <div className="rounded-2xl border border-[#332C25] bg-[#161311] p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#332C25] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌳</span>
                  <h3 className="font-black text-sm sm:text-base text-[#F2EDE4] tracking-wide">
                    Tim Pohon
                  </h3>
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
                      {/* Left: Number + Player Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251F1B] border border-[#332C25] text-xs font-black text-[#E8B33D]">
                          {index + 1}
                        </span>
                        <PlayerAvatar name={slot.playerName} size="sm" />
                        <span className="text-xs sm:text-sm font-bold text-[#F2EDE4] truncate">
                          {slot.playerName}
                        </span>
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
