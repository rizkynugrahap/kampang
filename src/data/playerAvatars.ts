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
 * Returns a high-resolution avatar URL for any player name
 */
export function getPlayerAvatarUrl(playerName?: string, customAvatarUrl?: string): string {
  if (customAvatarUrl && customAvatarUrl.trim()) {
    return customAvatarUrl.trim();
  }
  if (!playerName || !playerName.trim()) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Player&backgroundColor=b6e3f4';
  }

  const cleanName = playerName.trim();
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
