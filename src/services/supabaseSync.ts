import { supabase } from '../lib/supabase';
import { Player, Match, LagaAmalSeasonData } from '../types';

export type Unsubscribe = () => void;

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

export function getPlayerDocId(player: Player): string {
  const slug = (player.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || String(player.id);
}

// ----------------- SUBSCRIPTIONS (REAL-TIME VIA SUPABASE) -----------------

export function subscribeToPlayers(
  onUpdate: (players: Player[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isMounted = true;

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase.from('players').select('*');
      if (error) throw error;
      if (!isMounted) return;

      if (data && data.length > 0) {
        const playersList: Player[] = data.map((row) => {
          const raw = row.data as Player;
          return {
            ...raw,
            id: raw?.id !== undefined ? raw.id : row.id,
          };
        });
        playersList.sort((a, b) => Number(a.id) - Number(b.id));
        onUpdate(playersList);
      } else {
        onUpdate([]);
      }
    } catch (err: any) {
      console.warn('Supabase players fetch error:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Immediate initial load
  fetchPlayers();

  // Realtime subscription channel
  const channel = supabase
    .channel('supabase-players-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
      fetchPlayers();
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase players realtime channel error');
      }
    });

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

export function subscribeToMatches(
  onUpdate: (matches: Match[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isMounted = true;

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*');
      if (error) throw error;
      if (!isMounted) return;

      if (data && data.length > 0) {
        const matchesList: Match[] = data.map((row) => {
          const raw = row.data as Match;
          return {
            ...raw,
            id: raw?.id !== undefined ? raw.id : Number(row.id),
          };
        });
        matchesList.sort((a, b) => Number(b.id) - Number(a.id));
        onUpdate(matchesList);
      } else {
        onUpdate([]);
      }
    } catch (err: any) {
      console.warn('Supabase matches fetch error:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  fetchMatches();

  const channel = supabase
    .channel('supabase-matches-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
      fetchMatches();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

export function subscribeToLagaAmal(
  onUpdate: (seasons: LagaAmalSeasonData[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isMounted = true;

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase.from('laga_amal_seasons').select('*');
      if (error) throw error;
      if (!isMounted) return;

      if (data && data.length > 0) {
        const seasonsList: LagaAmalSeasonData[] = data.map((row) => {
          const raw = row.data as LagaAmalSeasonData;
          return {
            ...raw,
            id: raw?.id || String(row.id),
          };
        });
        seasonsList.sort((a, b) => {
          const extractNum = (s: LagaAmalSeasonData) => {
            const match = (s?.title || '').match(/(\d+)/) || (s?.id || '').match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };
          const numA = extractNum(a);
          const numB = extractNum(b);
          if (numA !== numB) return numB - numA;
          return String(b?.title || b?.id || '').localeCompare(String(a?.title || a?.id || ''));
        });
        onUpdate(seasonsList);
      } else {
        onUpdate([]);
      }
    } catch (err: any) {
      console.warn('Supabase laga amal fetch error:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  fetchSeasons();

  const channel = supabase
    .channel('supabase-seasons-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'laga_amal_seasons' }, () => {
      fetchSeasons();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

// ----------------- BACKGROUND & THEME SETTINGS -----------------

export interface BackgroundSettings {
  bgUrl?: string;
  bgOpacity?: number;
  logoType?: 'text' | 'image';
  logoUrl?: string;
  logoText?: string;
  brandName?: string;
  slogan?: string;
  logoSize?: number;
  logoFit?: 'contain' | 'cover';
  logoShape?: 'rounded' | 'circle' | 'square' | 'none';
  headerBgColor?: string;
  activeButtonColor?: string;
  activeButtonTextColor?: string;
  updatedAt?: string;
}

export type ThemeSettings = BackgroundSettings;

export function subscribeToBackgroundSettings(
  callback: (settings: BackgroundSettings | null) => void
): Unsubscribe {
  let isMounted = true;

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_meta')
        .select('*')
        .eq('id', 'background_settings')
        .maybeSingle();

      if (error) throw error;
      if (!isMounted) return;

      if (data && data.data) {
        callback(data.data as BackgroundSettings);
      } else {
        callback(null);
      }
    } catch (err) {
      console.warn('Supabase background settings fetch error:', err);
      callback(null);
    }
  };

  fetchSettings();

  const channel = supabase
    .channel('supabase-meta-bg-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_meta', filter: 'id=eq.background_settings' }, () => {
      fetchSettings();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

export async function syncBackgroundSettingsToSupabase(settings: BackgroundSettings): Promise<void> {
  // First fetch existing to merge
  let current: Record<string, any> = {};
  try {
    const { data } = await supabase.from('app_meta').select('*').eq('id', 'background_settings').maybeSingle();
    if (data?.data) current = data.data;
  } catch (e) {
    // ignore
  }

  const merged = { ...current, ...settings, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from('app_meta').upsert({
    id: 'background_settings',
    data: merged,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// ----------------- ACTIVE SEASON SETTINGS -----------------

export interface ActiveSeasonSettings {
  seasonId: string;
  updatedAt?: string;
}

export function subscribeToActiveSeason(
  callback: (seasonId: string | null) => void
): Unsubscribe {
  let isMounted = true;

  const fetchActiveSeason = async () => {
    try {
      const { data, error } = await supabase
        .from('app_meta')
        .select('*')
        .eq('id', 'active_season')
        .maybeSingle();

      if (error) throw error;
      if (!isMounted) return;

      if (data?.data?.seasonId) {
        callback(data.data.seasonId);
      } else {
        callback(null);
      }
    } catch (err) {
      console.warn('Supabase active season fetch error:', err);
      callback(null);
    }
  };

  fetchActiveSeason();

  const channel = supabase
    .channel('supabase-meta-season-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_meta', filter: 'id=eq.active_season' }, () => {
      fetchActiveSeason();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

export async function syncActiveSeasonToSupabase(seasonId: string): Promise<void> {
  const payload = {
    seasonId,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('app_meta').upsert({
    id: 'active_season',
    data: payload,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// ----------------- WRITE & MUTATION METHODS -----------------

export async function syncPlayerToSupabase(player: Player): Promise<void> {
  const docId = getPlayerDocId(player);
  const { error } = await supabase.from('players').upsert({
    id: docId,
    data: player,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function syncPlayersBatchToSupabase(players: Player[]): Promise<void> {
  if (!players || players.length === 0) return;
  const rows = players.map((p) => ({
    id: getPlayerDocId(p),
    data: p,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('players').upsert(rows);
  if (error) throw error;
}

export async function syncMatchToSupabase(match: Match): Promise<void> {
  const { error } = await supabase.from('matches').upsert({
    id: String(match.id),
    data: match,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function syncLagaAmalToSupabase(season: LagaAmalSeasonData): Promise<void> {
  const { error } = await supabase.from('laga_amal_seasons').upsert({
    id: String(season.id),
    data: season,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function syncSeasonsBatchToSupabase(seasons: LagaAmalSeasonData[]): Promise<void> {
  if (!seasons || seasons.length === 0) return;
  const rows = seasons.map((s) => ({
    id: String(s.id),
    data: s,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('laga_amal_seasons').upsert(rows);
  if (error) throw error;
}

export async function deletePlayerFromSupabase(playerId: string | number, playerName?: string): Promise<void> {
  const rawSlug = (playerName || String(playerId))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  try {
    // Delete by primary key
    await supabase.from('players').delete().eq('id', rawSlug);
    await supabase.from('players').delete().eq('id', String(playerId));

    // Also remove any matching data.id or data.name
    const { data } = await supabase.from('players').select('id, data');
    if (data && data.length > 0) {
      const idsToDelete: string[] = [];
      data.forEach((d) => {
        const p = d.data as Partial<Player>;
        if (
          d.id === rawSlug ||
          d.id === String(playerId) ||
          String(p?.id) === String(playerId) ||
          (playerName && p?.name && p.name.toLowerCase() === playerName.toLowerCase())
        ) {
          idsToDelete.push(d.id);
        }
      });
      if (idsToDelete.length > 0) {
        await supabase.from('players').delete().in('id', idsToDelete);
      }
    }
  } catch (err) {
    console.warn('Supabase deletePlayer error:', err);
    throw err;
  }
}

export async function deleteLagaAmalFromSupabase(seasonId: string): Promise<void> {
  const { error } = await supabase.from('laga_amal_seasons').delete().eq('id', String(seasonId));
  if (error) throw error;
}

export async function deleteMatchFromSupabase(matchId: string | number): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', String(matchId));
  if (error) throw error;
}

export async function deleteMatchesBatchFromSupabase(matchIds: (string | number)[]): Promise<void> {
  if (!matchIds || matchIds.length === 0) return;
  const stringIds = matchIds.map(String);
  const { error } = await supabase.from('matches').delete().in('id', stringIds);
  if (error) throw error;
}

// ----------------- ADMIN ACCOUNTS -----------------

export interface AdminAccount {
  email: string;
  password: string;
  name: string;
}

const DEFAULT_ADMIN: AdminAccount = {
  email: 'admin@pantos.ml',
  password: 'pantos123',
  name: 'Admin Pantos',
};

export async function seedAdminIfEmpty(): Promise<void> {
  try {
    const { data, error } = await supabase.from('admins').select('*').limit(1);
    if (!error && (!data || data.length === 0)) {
      console.log('Supabase: Seeding default admin account...');
      await supabase.from('admins').insert({
        email: DEFAULT_ADMIN.email.toLowerCase(),
        password: DEFAULT_ADMIN.password,
        name: DEFAULT_ADMIN.name,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Supabase admin seeding error:', err);
  }
}

export async function verifyAdminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: { email: string; name: string }; error?: string }> {
  try {
    const normalizedEmail = (email || DEFAULT_ADMIN.email).trim().toLowerCase();

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase verifyAdminLogin error:', error);
      return { success: false, error: 'Gagal menghubungkan ke Supabase: ' + error.message };
    }

    if (!data) {
      return { success: false, error: 'Akun admin tidak ditemukan di database Supabase.' };
    }

    if (data.password !== password) {
      return { success: false, error: 'Password admin salah.' };
    }

    return {
      success: true,
      admin: {
        email: data.email,
        name: data.name || 'Admin Pantos',
      },
    };
  } catch (err: any) {
    console.error('Supabase admin login error:', err);
    return { success: false, error: 'Gagal login admin: ' + (err?.message || String(err)) };
  }
}

// ----------------- BULK SEEDING & SYNC -----------------

export async function seedPlayersIfEmpty(defaultPlayers: Player[]): Promise<void> {
  try {
    const { data, error } = await supabase.from('players').select('id').limit(1);
    if (!error && (!data || data.length === 0) && defaultPlayers && defaultPlayers.length > 0) {
      console.log('Supabase: Seeding initial players database...');
      await syncPlayersBatchToSupabase(defaultPlayers);
    }
  } catch (err) {
    console.warn('Supabase players seeding error:', err);
  }
}

export async function forceSyncAllToSupabase(data: {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
}): Promise<boolean> {
  try {
    if (data.players && data.players.length > 0) {
      await syncPlayersBatchToSupabase(data.players);
    }

    if (data.matches && data.matches.length > 0) {
      const matchRows = data.matches.map((m) => ({
        id: String(m.id),
        data: m,
        updated_at: new Date().toISOString(),
      }));
      const { error: matchErr } = await supabase.from('matches').upsert(matchRows);
      if (matchErr) throw matchErr;
    }

    if (data.seasons && data.seasons.length > 0) {
      await syncSeasonsBatchToSupabase(data.seasons);
    }

    return true;
  } catch (err) {
    console.error('Supabase force sync error:', err);
    throw err;
  }
}

// ----------------- BACKWARD COMPATIBILITY ALIASES -----------------
export const syncPlayerToFirestore = syncPlayerToSupabase;
export const syncPlayersBatchToFirestore = syncPlayersBatchToSupabase;
export const syncMatchToFirestore = syncMatchToSupabase;
export const syncLagaAmalToFirestore = syncLagaAmalToSupabase;
export const syncSeasonsBatchToFirestore = syncSeasonsBatchToSupabase;
export const deletePlayerFromFirestore = deletePlayerFromSupabase;
export const deleteLagaAmalFromFirestore = deleteLagaAmalFromSupabase;
export const deleteMatchFromFirestore = deleteMatchFromSupabase;
export const deleteMatchesBatchFromFirestore = deleteMatchesBatchFromSupabase;
export const syncBackgroundSettingsToFirestore = syncBackgroundSettingsToSupabase;
export const syncActiveSeasonToFirestore = syncActiveSeasonToSupabase;
export const forceSyncAllToFirestore = forceSyncAllToSupabase;
