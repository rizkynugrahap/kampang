// Player Avatars Management, Normalization, and Cache
import { safeSetItem, safeGetItem } from '../utils/storage';

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

// getPlayerAvatarUrl() runs once per rendered <PlayerAvatar>, and lists can
// render 15-20+ of them at once (e.g. the login player picker). Previously
// every single call re-read AND JSON.parse'd two localStorage blobs from
// scratch, so typing in the search box re-parsed the same JSON dozens of
// times per keystroke. These caches skip the JSON.parse when the raw
// localStorage string hasn't actually changed since the last read.
let storedAvatarsCache: { hasRead: boolean; raw: string | null; parsed: Record<string, string> } = {
  hasRead: false,
  raw: null,
  parsed: {},
};
let playersCacheCache: { hasRead: boolean; raw: string | null; parsed: any[] } = {
  hasRead: false,
  raw: null,
  parsed: [],
};

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
    const raw = safeGetItem(LOCAL_STORAGE_AVATAR_KEY);
    if (storedAvatarsCache.hasRead && raw === storedAvatarsCache.raw) {
      return storedAvatarsCache.parsed;
    }
    const parsed = raw ? JSON.parse(raw) : {};
    storedAvatarsCache = { hasRead: true, raw, parsed };
    return parsed;
  } catch (e) {
    return {};
  }
}

/**
 * Registers player avatars into memory from loaded player rosters
 */
export function registerKnownPlayerAvatars(players: Array<{ name?: string; nickname?: string; avatar_url?: string }>): void {
  if (!players || !Array.isArray(players)) return;
  const stored = getStoredAvatars();
  let hasChanges = false;

  for (const p of players) {
    const pName = (p.name || p.nickname || '').trim();
    if (pName && p.avatar_url && p.avatar_url.trim()) {
      const normalized = normalizeImageUrl(p.avatar_url);
      const cleanKey = pName.toLowerCase();

      // If stored avatar is already an uploaded image/custom, don't overwrite with default dicebear
      const storedVal = stored[cleanKey] || stored[pName];
      if (storedVal && normalized.includes('api.dicebear.com') && !storedVal.includes('api.dicebear.com')) {
        memoryAvatarMap.set(cleanKey, storedVal);
        continue;
      }

      memoryAvatarMap.set(cleanKey, normalized);

      // If it's a real uploaded/custom avatar, ensure it is persisted in local storage
      if (!normalized.includes('api.dicebear.com') && stored[cleanKey] !== normalized) {
        stored[cleanKey] = normalized;
        stored[pName] = normalized;
        hasChanges = true;
      }
    }
  }

  if (hasChanges && typeof window !== 'undefined') {
    try {
      const raw = JSON.stringify(stored);
      safeSetItem(LOCAL_STORAGE_AVATAR_KEY, raw);
      storedAvatarsCache = { hasRead: true, raw, parsed: stored };
    } catch (e) {
      // ignore
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
    const raw = JSON.stringify(current);
    safeSetItem(LOCAL_STORAGE_AVATAR_KEY, raw);
    storedAvatarsCache = { hasRead: true, raw, parsed: current };
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
  const cleanName = (name || '').trim();
  const key = cleanName.toLowerCase();
  const stored = getStoredAvatars();
  const storedCustom = cleanName ? (stored[key] || stored[cleanName]) : '';

  // 1. Explicit valid avatar URL provided
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim()) {
    const normalized = normalizeImageUrl(explicitUrl);
    // If the explicitUrl is a default dicebear URL, but the user has an actual custom avatar stored, prefer stored
    if (storedCustom && normalized.includes('api.dicebear.com') && !storedCustom.includes('api.dicebear.com')) {
      const customNorm = normalizeImageUrl(storedCustom);
      if (cleanName) memoryAvatarMap.set(key, customNorm);
      return customNorm;
    }

    if (cleanName) {
      memoryAvatarMap.set(key, normalized);
    }
    return normalized;
  }

  if (!cleanName) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=PantosPlayer&backgroundColor=241f1b';
  }

  // 2. Stored avatars in localStorage (uploaded photo or chosen preset)
  if (storedCustom) {
    const val = normalizeImageUrl(storedCustom);
    memoryAvatarMap.set(key, val);
    return val;
  }

  // 3. Memory cache lookup
  if (memoryAvatarMap.has(key)) {
    const cached = memoryAvatarMap.get(key);
    if (cached) return cached;
  }

  // 4. Cached players in localStorage (pantos_players_cache or pantos_seasons_cache)
  if (typeof window !== 'undefined') {
    try {
      const playersJson = safeGetItem('pantos_players_cache');
      let parsed: any[];
      if (playersCacheCache.hasRead && playersJson === playersCacheCache.raw) {
        parsed = playersCacheCache.parsed;
      } else {
        parsed = playersJson ? JSON.parse(playersJson) : [];
        playersCacheCache = { hasRead: true, raw: playersJson, parsed: Array.isArray(parsed) ? parsed : [] };
      }
      if (Array.isArray(parsed)) {
        const found = parsed.find((p: any) => (p.name || '').trim().toLowerCase() === key);
        if (found && found.avatar_url && found.avatar_url.trim()) {
          const val = normalizeImageUrl(found.avatar_url);
          memoryAvatarMap.set(key, val);
          return val;
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
