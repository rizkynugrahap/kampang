import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, Match, LagaAmalSeasonData } from '../types';

/**
 * Remove undefined values as Firestore rejects undefined fields
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (v === undefined ? null : v))
  );
}

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

// ----------------- SUBSCRIPTIONS (REAL-TIME) -----------------

export function subscribeToPlayers(
  onUpdate: (players: Player[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'players');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const playersList: Player[] = [];
        snapshot.forEach((docSnap) => {
          playersList.push(docSnap.data() as Player);
        });
        playersList.sort((a, b) => Number(a.id) - Number(b.id));
        onUpdate(playersList);
      }
    },
    (err) => {
      console.warn('Firestore players snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToMatches(
  onUpdate: (matches: Match[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'matches');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const matchesList: Match[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((docSnap) => {
          matchesList.push(docSnap.data() as Match);
        });
        matchesList.sort((a, b) => Number(b.id) - Number(a.id));
      }
      onUpdate(matchesList);
    },
    (err) => {
      console.warn('Firestore matches snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToLagaAmal(
  onUpdate: (seasons: LagaAmalSeasonData[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'laga_amal_seasons');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const seasonsList: LagaAmalSeasonData[] = [];
        snapshot.forEach((docSnap) => {
          seasonsList.push(docSnap.data() as LagaAmalSeasonData);
        });
        onUpdate(seasonsList);
      }
    },
    (err) => {
      console.warn('Firestore laga amal snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// ----------------- WRITE & MUTATION METHODS -----------------

// Player docs are keyed by a normalized version of their nickname rather
// than `player.id` — that id is just an array position (idx + 1) computed
// fresh from the season roster every load, so it can shift whenever the
// roster order changes (a new player added, roster re-sorted, etc). Keying
// by id meant a player's admin-set tier/badge could silently get written
// under a *different* Firestore document than the one it was read from
// previously, orphaning the old data.
function getPlayerDocId(player: Player): string {
  const slug = (player.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || String(player.id);
}

export async function syncPlayerToFirestore(player: Player): Promise<void> {
  const docRef = doc(db, 'players', getPlayerDocId(player));
  await setDoc(docRef, sanitizeForFirestore(player), { merge: true });
}

export async function syncPlayersBatchToFirestore(players: Player[]): Promise<void> {
  const batch = writeBatch(db);
  players.forEach((p) => {
    const docRef = doc(db, 'players', getPlayerDocId(p));
    batch.set(docRef, sanitizeForFirestore(p), { merge: true });
  });
  await batch.commit();
}

export async function syncMatchToFirestore(match: Match): Promise<void> {
  const docRef = doc(db, 'matches', String(match.id));
  await setDoc(docRef, sanitizeForFirestore(match), { merge: true });
}

export async function syncLagaAmalToFirestore(season: LagaAmalSeasonData): Promise<void> {
  const docRef = doc(db, 'laga_amal_seasons', String(season.id));
  await setDoc(docRef, sanitizeForFirestore(season), { merge: true });
}

export async function syncSeasonsBatchToFirestore(seasons: LagaAmalSeasonData[]): Promise<void> {
  const batch = writeBatch(db);
  seasons.forEach((s) => {
    const docRef = doc(db, 'laga_amal_seasons', String(s.id));
    batch.set(docRef, sanitizeForFirestore(s), { merge: true });
  });
  await batch.commit();
}

/**
 * Deletes a whole Laga Amal season/klasemen from Firestore. Admin-only —
 * the caller is responsible for checking permission before calling this.
 */
export async function deleteLagaAmalFromFirestore(seasonId: string): Promise<void> {
  const docRef = doc(db, 'laga_amal_seasons', String(seasonId));
  await deleteDoc(docRef);
}

/**
 * Deletes a single match from Firestore
 */
export async function deleteMatchFromFirestore(matchId: string | number): Promise<void> {
  const docRef = doc(db, 'matches', String(matchId));
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Direct doc delete error:', e);
  }

  // Also query by numeric or string id in case doc ID differs
  try {
    const numId = Number(matchId);
    const snap = await getDocs(collection(db, 'matches'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (
          String(d.id) === String(matchId) ||
          String(data.id) === String(matchId) ||
          (!isNaN(numId) && data.id === numId)
        ) {
          batch.delete(d.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Query fallback deleteMatchFromFirestore:', err);
  }
}

/**
 * Deletes a batch of matches from Firestore
 */
export async function deleteMatchesBatchFromFirestore(matchIds: (string | number)[]): Promise<void> {
  if (!matchIds || matchIds.length === 0) return;
  const idSet = new Set(matchIds.map((id) => String(id)));

  // Try direct batch deletion
  try {
    const batch = writeBatch(db);
    matchIds.forEach((id) => {
      const directDocRef = doc(db, 'matches', String(id));
      batch.delete(directDocRef);
    });
    await batch.commit();
  } catch (e) {
    console.warn('Batch direct delete error:', e);
  }

  // Also ensure any matches matching by data.id are deleted
  try {
    const snap = await getDocs(collection(db, 'matches'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (idSet.has(String(d.id)) || (data.id !== undefined && idSet.has(String(data.id)))) {
          batch.delete(d.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Batch query delete fallback:', err);
  }
}

// ----------------- BACKGROUND SETTINGS (app-wide, Firestore-synced) -----------------

export interface BackgroundSettings {
  bgUrl?: string;
  bgOpacity?: number;
}

const BACKGROUND_DOC_ID = 'background_settings';

/**
 * Live-subscribes to the shared background/opacity settings document, so a
 * change made on one device (or by any admin) reflects on every other
 * device in real time — this used to only live in each browser's own
 * localStorage, which is why it never "traveled" between devices.
 */
export function subscribeToBackgroundSettings(
  callback: (settings: BackgroundSettings | null) => void
): Unsubscribe {
  const docRef = doc(db, 'app_meta', BACKGROUND_DOC_ID);
  return onSnapshot(
    docRef,
    (snap) => {
      callback(snap.exists() ? (snap.data() as BackgroundSettings) : null);
    },
    (err) => {
      console.warn('Firestore background settings subscription error:', err);
      callback(null);
    }
  );
}

/**
 * Persists background/opacity settings to Firestore (merged — passing just
 * one field won't wipe the other) so they're permanent across refreshes
 * and shared across every device, not just the browser that set them.
 */
export async function syncBackgroundSettingsToFirestore(settings: BackgroundSettings): Promise<void> {
  const docRef = doc(db, 'app_meta', BACKGROUND_DOC_ID);
  await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
}

// ----------------- ADMIN LOGIN (Firestore-only) -----------------

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

/**
 * Seeds the `admins` collection with a default account the first time the
 * app runs against an empty Firestore, so login keeps working out of the
 * box. Safe to call every load — it's a no-op once at least one admin
 * document exists.
 */
export async function seedAdminIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    if (snap.empty) {
      console.log('Firestore: Seeding default admin account...');
      const docRef = doc(db, 'admins', DEFAULT_ADMIN.email.toLowerCase());
      await setDoc(docRef, DEFAULT_ADMIN);
    }
  } catch (err) {
    console.warn('Firestore admin seeding error:', err);
  }
}

/**
 * Verifies admin login credentials directly against Firestore — this is
 * now the single source of truth for login, replacing the old hardcoded
 * backend check.
 */
export async function verifyAdminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: { email: string; name: string }; error?: string }> {
  try {
    const normalizedEmail = (email || DEFAULT_ADMIN.email).trim().toLowerCase();

    // Fast path: the account is stored with its email as the document id.
    const docSnap = await getDocs(
      query(collection(db, 'admins'), where('email', '==', normalizedEmail))
    );

    if (docSnap.empty) {
      return { success: false, error: 'Akun admin tidak ditemukan di Firestore.' };
    }

    const account = docSnap.docs[0].data() as AdminAccount;
    if (account.password !== password) {
      return { success: false, error: 'Password admin salah.' };
    }

    return { success: true, admin: { email: account.email, name: account.name } };
  } catch (err) {
    console.error('Firestore admin login error:', err);
    return { success: false, error: 'Gagal menghubungkan ke Firestore.' };
  }
}

// ----------------- BULK INITIAL SEEDING -----------------

/**
 * Force sync all current data to Firestore
 */
export async function forceSyncAllToFirestore(data: {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
}): Promise<boolean> {
  try {
    await syncPlayersBatchToFirestore(data.players);

    const matchBatch = writeBatch(db);
    data.matches.forEach((m) => {
      const docRef = doc(db, 'matches', String(m.id));
      matchBatch.set(docRef, sanitizeForFirestore(m), { merge: true });
    });
    await matchBatch.commit();

    if (data.seasons && data.seasons.length > 0) {
      await syncSeasonsBatchToFirestore(data.seasons);
    }

    return true;
  } catch (err) {
    console.error('Firestore force sync error:', err);
    throw err;
  }
}

// ----------------- COMMENTATOR AUDIO STORAGE IN FIRESTORE -----------------

function computeTextHash(str: string): string {
  let hash = 0;
  const clean = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export interface StoredAudioResult {
  audioUrl: string;
  provider: string;
  providerName: string;
}

/**
 * Saves generated commentator audio directly to Firestore so it persists permanently and can be replayed infinitely
 */
export async function saveCommentatorAudioToFirestore(params: {
  matchId?: number | string;
  mode: 'full' | 'recap';
  audioUrl: string;
  provider: string;
  providerName: string;
  text: string;
}): Promise<void> {
  if (!params.audioUrl) return;

  try {
    const textHash = computeTextHash(params.text);
    const docId = params.matchId
      ? `match_${params.matchId}_${params.mode}`
      : `text_${textHash}_${params.mode}`;

    const docRef = doc(db, 'commentator_audios', docId);

    // If audioUrl is large (> 700,000 characters), split across subcollection parts
    const CHUNK_SIZE = 700000;
    if (params.audioUrl.length > CHUNK_SIZE) {
      const totalParts = Math.ceil(params.audioUrl.length / CHUNK_SIZE);
      await setDoc(
        docRef,
        {
          id: docId,
          matchId: params.matchId ? String(params.matchId) : null,
          mode: params.mode,
          provider: params.provider,
          providerName: params.providerName,
          textHash,
          hasParts: true,
          totalParts,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      for (let i = 0; i < totalParts; i++) {
        const partRef = doc(db, 'commentator_audios', docId, 'parts', String(i));
        await setDoc(partRef, {
          index: i,
          data: params.audioUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        });
      }
    } else {
      await setDoc(
        docRef,
        {
          id: docId,
          matchId: params.matchId ? String(params.matchId) : null,
          mode: params.mode,
          audioUrl: params.audioUrl,
          provider: params.provider,
          providerName: params.providerName,
          textHash,
          hasParts: false,
          totalParts: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Also update match doc in 'matches' collection if matchId is given
    if (params.matchId) {
      try {
        const matchRef = doc(db, 'matches', String(params.matchId));
        const fieldName =
          params.mode === 'recap' ? 'commentator_audio_recap' : 'commentator_audio_full';
        await setDoc(
          matchRef,
          {
            [fieldName]: params.audioUrl.length <= CHUNK_SIZE ? params.audioUrl : `ref:${docId}`,
            commentator_provider: params.providerName,
          },
          { merge: true }
        );
      } catch (mErr) {
        console.warn('Could not update match with audio:', mErr);
      }
    }
  } catch (err) {
    console.warn('saveCommentatorAudioToFirestore error:', err);
  }
}

/**
 * Retrieves saved commentator audio from Firestore database
 */
export async function getCommentatorAudioFromFirestore(params: {
  matchId?: number | string;
  mode: 'full' | 'recap';
  text: string;
}): Promise<StoredAudioResult | null> {
  try {
    const textHash = computeTextHash(params.text);

    // 1. Try match docId if matchId provided
    const docIdsToTry: string[] = [];
    if (params.matchId) {
      docIdsToTry.push(`match_${params.matchId}_${params.mode}`);
    }
    docIdsToTry.push(`text_${textHash}_${params.mode}`);

    for (const docId of docIdsToTry) {
      const docRef = doc(db, 'commentator_audios', docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.hasParts && data.totalParts > 1) {
          const partsSnap = await getDocs(
            collection(db, 'commentator_audios', docId, 'parts')
          );
          const partsList: { index: number; data: string }[] = [];
          partsSnap.forEach((pDoc) => {
            partsList.push(pDoc.data() as any);
          });
          partsList.sort((a, b) => a.index - b.index);
          const fullAudioUrl = partsList.map((p) => p.data).join('');
          if (fullAudioUrl) {
            return {
              audioUrl: fullAudioUrl,
              provider: data.provider || 'gemini',
              providerName: (data.providerName || 'AI Caster') + ' (Tersimpan di Database)',
            };
          }
        } else if (data.audioUrl) {
          return {
            audioUrl: data.audioUrl,
            provider: data.provider || 'gemini',
            providerName: (data.providerName || 'AI Caster') + ' (Tersimpan di Database)',
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('getCommentatorAudioFromFirestore error:', err);
    return null;
  }
}
