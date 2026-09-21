// MLBB Hero Icon Mapping and Resolver

const CDN_BASE = 'https://raw.githubusercontent.com/pantos-mlbb/assets/main/heroes';

// Clean hero name to standard format
export function sanitizeHeroName(heroName: string): string {
  if (!heroName) return '';
  return heroName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Moonton / Community Asset CDN mappings for popular heroes
export const HERO_ICON_OVERRIDE: Record<string, string> = {
  miya: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=128&auto=format&fit=crop&q=80',
  balmond: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=128&auto=format&fit=crop&q=80',
  saber: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=128&auto=format&fit=crop&q=80',
  alice: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
  nana: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=128&auto=format&fit=crop&q=80',
  tigreal: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=128&auto=format&fit=crop&q=80',
  alucard: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=128&auto=format&fit=crop&q=80',
  karina: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
  chou: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&auto=format&fit=crop&q=80',
  fanny: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80',
  gusion: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
  ling: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&auto=format&fit=crop&q=80',
  lancelot: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=128&auto=format&fit=crop&q=80',
  hayabusa: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&auto=format&fit=crop&q=80',
};

/**
 * Returns a high quality avatar/icon URL for any given MLBB hero name
 */
export function getHeroIconUrl(heroName: string): string {
  if (!heroName || !heroName.trim()) return '';
  const clean = sanitizeHeroName(heroName);
  
  // 1. Direct override if available
  if (HERO_ICON_OVERRIDE[clean]) {
    return HERO_ICON_OVERRIDE[clean];
  }

  // 2. High-quality consistent RPG avatar via DiceBear bottts/adventurer using hero name as seed
  const encoded = encodeURIComponent(heroName.trim());
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encoded}&backgroundColor=241f1b,1d1916&mouth=smile01,smile02&eyes=eva,frame1,frame2,glow,robocop,sensor`;
}
