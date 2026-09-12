// Player Avatar Presets and Generator
// Provides high-resolution, stylized gaming avatars for each MLBB player in Laga Amal Pantos

export const PRESET_PLAYER_AVATARS: Record<string, string> = {
  'Mandor': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mandor&backgroundColor=b6e3f4,c0aede',
  'LAH MANDOOR': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mandor&backgroundColor=b6e3f4,c0aede',
  'Kelung': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kelung&backgroundColor=ffd5dc,ffdfbf',
  'KELUNG': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kelung&backgroundColor=ffd5dc,ffdfbf',
  'Gil': 'https://api.dicebear.com/7.x/adventurer/svg?seed=MrGil&backgroundColor=c0aede,d1d4f9',
  'Mr. GiL': 'https://api.dicebear.com/7.x/adventurer/svg?seed=MrGil&backgroundColor=c0aede,d1d4f9',
  'Ven': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ven&backgroundColor=ffdfbf,ffd5dc',
  'Hees': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hees&backgroundColor=b6e3f4,d1d4f9',
  'Doni': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Doni&backgroundColor=ffd5dc,b6e3f4',
  'Dignityzed': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Dignityzed&backgroundColor=ffdfbf,b6e3f4',
  'POCONG JEPRIE': 'https://api.dicebear.com/7.x/adventurer/svg?seed=PocongJeprie&backgroundColor=c0aede,ffd5dc',
  'YY': 'https://api.dicebear.com/7.x/adventurer/svg?seed=YYPantos&backgroundColor=b6e3f4,ffd5dc',
  'irvantaufiq12': 'https://api.dicebear.com/7.x/adventurer/svg?seed=IrvanTaufiq&backgroundColor=ffdfbf,c0aede',
  'Mr P Jay': 'https://api.dicebear.com/7.x/adventurer/svg?seed=MrPJay&backgroundColor=d1d4f9,b6e3f4',
  'Bau Bandeng !': 'https://api.dicebear.com/7.x/adventurer/svg?seed=BauBandeng&backgroundColor=c0aede,ffdfbf',
  'abcdeppp': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Abcdeppp&backgroundColor=ffd5dc,b6e3f4',
  'Portgas': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Portgas&backgroundColor=ffdfbf,d1d4f9',
  'Midzy': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midzy&backgroundColor=ffd5dc,c0aede',
  'Blackpink': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Blackpink&backgroundColor=ffd5dc,ffdfbf',
};

/**
 * Normalizes avatar image URLs, automatically converting GitHub blob links to direct raw image files
 */
export function normalizeImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (clean.includes('github.com') && clean.includes('/blob/')) {
    clean = clean.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return clean;
}

/**
 * Saves a player's custom avatar to persistent browser storage and notifies all components
 */
export function saveCustomPlayerAvatar(playerName: string, avatarUrl: string): void {
  if (!playerName || typeof window === 'undefined') return;
  try {
    const key = playerName.trim().toLowerCase();
    const cleanUrl = normalizeImageUrl(avatarUrl);
    const existingRaw = window.localStorage.getItem('pantos_custom_avatars');
    const customMap: Record<string, string> = existingRaw ? JSON.parse(existingRaw) : {};

    if (cleanUrl) {
      customMap[key] = cleanUrl;
    } else {
      delete customMap[key];
    }

    window.localStorage.setItem('pantos_custom_avatars', JSON.stringify(customMap));
    // Trigger notification event for immediate re-render across all open components
    window.dispatchEvent(new CustomEvent('pantos-avatar-updated', { detail: { playerName, avatarUrl: cleanUrl } }));
  } catch (err) {
    console.warn('Error saving custom avatar to localStorage:', err);
  }
}

/**
 * Returns a high-resolution avatar URL for any player name
 */
export function getPlayerAvatarUrl(playerName?: string, customAvatarUrl?: string): string {
  const normalizedCustom = normalizeImageUrl(customAvatarUrl);
  if (normalizedCustom) {
    return normalizedCustom;
  }
  if (!playerName || !playerName.trim()) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Player&backgroundColor=b6e3f4';
  }

  const cleanName = playerName.trim();

  // 1. Check persistent custom avatars in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedRaw = window.localStorage.getItem('pantos_custom_avatars');
      if (savedRaw) {
        const customMap = JSON.parse(savedRaw);
        const matchKey = Object.keys(customMap).find((k) => k.toLowerCase() === cleanName.toLowerCase());
        if (matchKey && customMap[matchKey] && typeof customMap[matchKey] === 'string' && customMap[matchKey].trim()) {
          return customMap[matchKey].trim();
        }
      }
    }
  } catch {
    // Ignore storage parse error
  }

  // 2. Check predefined preset avatars
  if (PRESET_PLAYER_AVATARS[cleanName]) {
    return PRESET_PLAYER_AVATARS[cleanName];
  }

  // Check normalized
  const lower = cleanName.toLowerCase();
  const match = Object.keys(PRESET_PLAYER_AVATARS).find(
    (k) => k.toLowerCase() === lower
  );
  if (match) {
    return PRESET_PLAYER_AVATARS[match];
  }

  // Dynamic deterministic avatar
  const seed = encodeURIComponent(cleanName);
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
