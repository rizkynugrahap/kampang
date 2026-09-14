import React, { useState, useEffect } from 'react';
import { getPlayerAvatarUrl } from '../data/playerAvatars';
import { PlayerStatus, TeamShort, TeamName } from '../types';

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string;
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

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  status,
  team,
  className = '',
  showStatusDot = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [, setRevision] = useState(0);
  const resolvedUrl = getPlayerAvatarUrl(name, avatarUrl);

  // Reset error state when avatarUrl or resolvedUrl changes
  useEffect(() => {
    setHasError(false);
  }, [name, avatarUrl, resolvedUrl]);

  // Listen to global avatar updates for instant sync across all open tabs/components
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ playerName?: string }>;
      if (
        !customEvent.detail?.playerName ||
        customEvent.detail.playerName.trim().toLowerCase() === (name || '').trim().toLowerCase()
      ) {
        setHasError(false);
        setRevision((r) => r + 1);
      }
    };
    window.addEventListener('pantos-avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('pantos-avatar-updated', handleAvatarUpdate);
  }, [name]);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  // Determine team ring color
  const isPohon = team === 'Pohon' || team === 'Tim Pohon';
  const isLobby = team === 'Lobby' || team === 'Tim Lobby';

  const ringClass = isPohon
    ? 'border-[#4F7942] ring-1 ring-[#4F7942]/50'
    : isLobby
    ? 'border-[#C97A3D] ring-1 ring-[#C97A3D]/50'
    : 'border-[#3D352E]';

  const initials = (name || 'PL')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div
        className={`${sizeClass} rounded-full overflow-hidden bg-[#241F1B] border-2 ${ringClass} shadow-md flex items-center justify-center font-bold text-[#E8B33D] transition-transform duration-200 hover:scale-105`}
      >
        {!hasError && resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={name}
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
      {showStatusDot && status && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#161311] ${
            status === 'Aktif' ? 'bg-[#4F7942]' : 'bg-[#E8B33D]'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
