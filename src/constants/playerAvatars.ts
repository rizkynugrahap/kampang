// Player Avatars Management, Normalization, and Cache

export interface AvatarPreset {
  name: string;
  url: string;
}

export const PRESET_PLAYER_AVATARS: AvatarPreset[] = [
  { name: 'Assassin Shadow', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AssassinShadow&backgroundColor=241f1b,332c25' },
  { name: 'Mage Arcane', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MageArcane&backgroundColor=b6e3f4,c0aede' },
  { name: 'Tank Titan', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TankTitan&backgroundColor=ffd5dc,ffdfbf' },
  { name: 'Marksman Sniper', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarksmanSniper&backgroundColor=c0aede,d1d4f9' },
  { name: 'Fighter Warrior', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FighterWarrior&backgroundColor=ffdfbf,ffd5dc' },
  { name: 'Support Angel', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SupportAngel&backgroundColor=b6e3f4,d1d4f9' },
  { name: 'Cyber Samurai', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSamurai&backgroundColor=241f1b' },
  { name: 'Gold Lord', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GoldLord&backgroundColor=e8b33d,b8764a' },
  { name: 'Neon Ninja', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonNinja&backgroundColor=1d1916' },
  { name: 'Valkyrie Grace', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ValkyrieGrace&backgroundColor=ffd5dc' },
];

const LOCAL_STORAGE_AVATAR_KEY = 'pantos_player_avatars';

// In-memory cache of resolved player avatars
const memoryAvatarMap = new Map<string, string>();

/**
 * Normalizes URLs from various providers (Google Drive, Dropbox, etc.) into direct image links
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();

  // Handle Google Drive share links
  if (clean.includes('drive.google.com')) {
    const fileIdMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  // Handle Dropbox share links
  if (clean.includes('dropbox.com')) {
    return clean.replace(/[?&]dl=0/, '?raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  return clean;
}

/**
 * Loads custom avatar mappings from localStorage
 */
function getStoredAvatars(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_AVATAR_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Registers player avatars into memory from loaded player rosters
 */
export function registerKnownPlayerAvatars(players: Array<{ name?: string; nickname?: string; avatar_url?: string }>): void {
  if (!players || !Array.isArray(players)) return;
  for (const p of players) {
    const pName = (p.name || p.nickname || '').trim().toLowerCase();
    if (pName && p.avatar_url && p.avatar_url.trim()) {
      const normalized = normalizeImageUrl(p.avatar_url);
      memoryAvatarMap.set(pName, normalized);
    }
  }
}

/**
 * Persists a custom player avatar to local storage and alerts listeners
 */
export function saveCustomPlayerAvatar(playerName: string, url: string): void {
  if (!playerName) return;
  const cleanName = playerName.trim().toLowerCase();
  const cleanUrl = normalizeImageUrl(url);

  memoryAvatarMap.set(cleanName, cleanUrl);

  try {
    const current = getStoredAvatars();
    if (cleanUrl) {
      current[cleanName] = cleanUrl;
      current[playerName.trim()] = cleanUrl;
    } else {
      delete current[cleanName];
      delete current[playerName.trim()];
    }
    localStorage.setItem(LOCAL_STORAGE_AVATAR_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save avatar to localStorage:', e);
  }

  // Notify components across window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pantos-avatar-updated', {
        detail: { playerName, avatarUrl: cleanUrl },
      })
    );
  }
}

/**
 * Resolves avatar URL for a player:
 * 1. Checks provided explicitUrl
 * 2. Checks in-memory cache
 * 3. Checks localStorage custom avatars
 * 4. Checks cached players in localStorage
 * 5. Returns deterministic consistent DiceBear seed avatar
 */
export function getPlayerAvatarUrl(name?: string, explicitUrl?: string): string {
  // 1. Explicit valid avatar URL provided
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim()) {
    const normalized = normalizeImageUrl(explicitUrl);
    if (name) {
      memoryAvatarMap.set(name.trim().toLowerCase(), normalized);
    }
    return normalized;
  }

  if (!name || !name.trim()) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=PantosPlayer&backgroundColor=241f1b';
  }

  const key = name.trim().toLowerCase();

  // 2. Memory cache lookup
  if (memoryAvatarMap.has(key)) {
    const cached = memoryAvatarMap.get(key);
    if (cached) return cached;
  }

  // 3. Stored avatars in localStorage
  const stored = getStoredAvatars();
  if (stored[key]) {
    const val = normalizeImageUrl(stored[key]);
    memoryAvatarMap.set(key, val);
    return val;
  }
  if (stored[name.trim()]) {
    const val = normalizeImageUrl(stored[name.trim()]);
    memoryAvatarMap.set(key, val);
    return val;
  }

  // 4. Cached players in localStorage (pantos_players_cache or pantos_seasons_cache)
  if (typeof window !== 'undefined') {
    try {
      const playersJson = localStorage.getItem('pantos_players_cache');
      if (playersJson) {
        const parsed = JSON.parse(playersJson);
        if (Array.isArray(parsed)) {
          const found = parsed.find((p: any) => (p.name || '').trim().toLowerCase() === key);
          if (found && found.avatar_url && found.avatar_url.trim()) {
            const val = normalizeImageUrl(found.avatar_url);
            memoryAvatarMap.set(key, val);
            return val;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 5. Deterministic fallback so identical name always renders the exact same avatar
  const seed = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=241f1b,1d1916`;
}
