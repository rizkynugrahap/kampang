import React, { useState } from 'react';
import { getHeroIconUrl } from '../constants/mlbbHeroIcons';
import { Medal } from '../types';

interface HeroAvatarProps {
  heroName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  shape?: 'circle' | 'rounded' | 'square';
  medal?: Medal;
  role?: string;
}

const SIZE_MAP = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const MEDAL_BADGES: Record<Medal, { bg: string; text: string; label: string }> = {
  MVP: { bg: 'bg-[#E8B33D] text-[#161311] ring-1 ring-[#F3C256]', text: 'MVP', label: 'MVP' },
  Gold: { bg: 'bg-amber-600 text-white', text: 'GLD', label: 'Gold' },
  Silver: { bg: 'bg-slate-400 text-slate-900', text: 'SLV', label: 'Silver' },
  Coklat: { bg: 'bg-[#7A4B31] text-[#F2EDE4]', text: 'CKL', label: 'Coklat' },
};

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  heroName,
  size = 'md',
  className = '',
  showName = false,
  shape = 'rounded',
  medal,
  role,
}) => {
  const [hasError, setHasError] = useState(false);
  const iconUrl = getHeroIconUrl(heroName);

  const roundedClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'rounded'
      ? 'rounded-xl'
      : 'rounded-lg';

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const initials = (heroName || 'ML')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`relative shrink-0 ${sizeClass} ${roundedClass} overflow-hidden bg-[#241F1B] border border-[#3D352E] shadow-sm flex items-center justify-center font-bold text-[#E8B33D]`}>
        {iconUrl && !hasError ? (
          <img
            src={iconUrl}
            alt={heroName}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            loading="lazy"
          />
        ) : (
          <span className="select-none tracking-tight">{initials}</span>
        )}

        {/* Optional Medal Badge Overlay */}
        {medal && MEDAL_BADGES[medal] && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 px-1 py-0.2 rounded text-[8px] font-black uppercase shadow-xs ${MEDAL_BADGES[medal].bg}`}
            title={`Medali ${MEDAL_BADGES[medal].label}`}
          >
            {MEDAL_BADGES[medal].text}
          </div>
        )}
      </div>

      {showName && (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[#F2EDE4] truncate leading-tight">
            {heroName}
          </span>
          {role && (
            <span className="text-[10px] text-[#9C948A] uppercase tracking-wider">
              {role}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
