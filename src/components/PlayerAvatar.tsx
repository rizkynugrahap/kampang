import React, { useState, useEffect, useMemo } from 'react';
import { getPlayerAvatarUrl } from '../constants/playerAvatars';
import { PlayerStatus, TeamShort, TeamName } from '../types';

export interface PlayerAvatarProps {
  name?: string;
  nickname?: string;
  avatarUrl?: string;
  avatar_url?: string;
  player?: {
    name?: string;
    nickname?: string;
    avatar_url?: string;
    status?: PlayerStatus;
    team?: TeamShort | TeamName;
    tier?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: PlayerStatus;
  team?: TeamShort | TeamName;
  tier?: string;
  className?: string;
  showStatusDot?: boolean;
}

const SIZE_MAP = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
};

const PlayerAvatarComponent: React.FC<PlayerAvatarProps> = ({
  name,
  nickname,
  avatarUrl,
  avatar_url,
  player,
  size = 'md',
  status,
  team,
  tier,
  className = '',
  showStatusDot = false,
}) => {
  const effectiveName = (
    name ||
    nickname ||
    player?.name ||
    (player as any)?.nickname ||
    ''
  ).trim();

  const effectiveAvatarUrl = avatarUrl || avatar_url || player?.avatar_url;
  const effectiveStatus = status || player?.status;
  const effectiveTeam = team || player?.team;
  const effectiveTier = tier || player?.tier;

  const [hasError, setHasError] = useState(false);
  const [revision, setRevision] = useState(0);
  // getPlayerAvatarUrl() touches localStorage; memoize per name+url (and
  // revision, bumped when a global avatar-updated event fires) so it isn't
  // recomputed on every parent re-render (e.g. typing in a search box).
  const resolvedUrl = useMemo(
    () => getPlayerAvatarUrl(effectiveName, effectiveAvatarUrl),
    [effectiveName, effectiveAvatarUrl, revision]
  );

  // Reset error state when effectiveName, avatarUrl or resolvedUrl changes
  useEffect(() => {
    setHasError(false);
  }, [effectiveName, effectiveAvatarUrl, resolvedUrl]);

  // Listen to global avatar updates for instant sync across all open tabs/components
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ playerName?: string }>;
      if (
        !customEvent.detail?.playerName ||
        customEvent.detail.playerName.trim().toLowerCase() === effectiveName.toLowerCase()
      ) {
        setHasError(false);
        setRevision((r) => r + 1);
      }
    };
    window.addEventListener('pantos-avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('pantos-avatar-updated', handleAvatarUpdate);
  }, [effectiveName]);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  // Determine team ring color
  const isPohon = effectiveTeam === 'Pohon' || effectiveTeam === 'Tim Pohon';
  const isLobby = effectiveTeam === 'Lobby' || effectiveTeam === 'Tim Lobby';

  const ringClass = isPohon
    ? 'border-[#4F7942] ring-1 ring-[#4F7942]/50'
    : isLobby
    ? 'border-[#C97A3D] ring-1 ring-[#C97A3D]/50'
    : 'border-[#3D352E]';

  const initials = (effectiveName || 'PL')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL';

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div
        className={`${sizeClass} rounded-full overflow-hidden bg-[#241F1B] border-2 ${ringClass} shadow-md flex items-center justify-center font-bold text-[#E8B33D] transition-transform duration-200 hover:scale-105`}
      >
        {!hasError && resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={effectiveName || 'Player Avatar'}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover bg-[#1A1614]"
            loading="lazy"
          />
        ) : (
          <span className="select-none font-black">{initials}</span>
        )}
      </div>

      {/* Status Dot */}
      {showStatusDot && effectiveStatus && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#161311] ${
            effectiveStatus === 'Aktif' ? 'bg-[#4F7942]' : 'bg-[#E8B33D]'
          }`}
          title={`Status: ${effectiveStatus}`}
        />
      )}
    </div>
  );
};

// Memoized: avatar lists (e.g. the login player picker) can render 15-20+ of
// these at once, and re-rendering all of them on every keystroke of an
// unrelated search box was a big part of what made opening that list feel
// heavy. React.memo skips a re-render entirely when this player's own props
// haven't changed.
export const PlayerAvatar = React.memo(PlayerAvatarComponent);
