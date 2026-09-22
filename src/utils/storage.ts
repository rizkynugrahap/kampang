/**
 * Utility for safe localStorage access with automatic QuotaExceededError handling.
 * Browsers enforce a strict ~5MB quota on localStorage. Large caches (such as
 * season stats, matches, and base64 avatars) can easily exceed this quota and throw
 * DOMException: QuotaExceededError. If unhandled, this crashes React into a whitescreen.
 */

const NON_ESSENTIAL_CACHE_KEYS = [
  'pantos_chat_messages',
  'pantos_seasons_cache',
  'pantos_matches_cache',
  'pantos_players_cache',
];

/**
 * Attempts to clear non-essential large caches to free up quota.
 */
export function pruneLocalStorageQuota(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of NON_ESSENTIAL_CACHE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Gagal membersihkan cache non-esensial:', e);
  }
}

/**
 * Safely sets an item in localStorage without ever throwing QuotaExceededError.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaError) {
      console.warn(`[SafeStorage] Kuota localStorage penuh saat menyimpan '${key}'. Membersihkan cache lama...`);
      // Free up space by purging bulky historical caches
      pruneLocalStorageQuota();

      // Retry once after pruning
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.warn(`[SafeStorage] Tidak dapat menyimpan '${key}' setelah pembersihan quota:`, retryErr);
        return false;
      }
    }

    console.warn(`[SafeStorage] Error saat menyimpan '${key}':`, err);
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Error saat membaca '${key}':`, err);
    return null;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Error saat menghapus '${key}':`, err);
  }
}

/**
 * Clears all Pantos-related caches in the browser and reloads.
 */
export function clearAllPantosStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pantos_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}
