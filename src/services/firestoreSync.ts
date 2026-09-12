import {
  collection,
  doc,
  setDoc,
  getDocs,
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
      if (!snapshot.empty) {
        const matchesList: Match[] = [];
        snapshot.forEach((docSnap) => {
          matchesList.push(docSnap.data() as Match);
        });
        matchesList.sort((a, b) => Number(b.id) - Number(a.id));
        onUpdate(matchesList);
      }
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

export async function syncPlayerToFirestore(player: Player): Promise<void> {
  const docRef = doc(db, 'players', String(player.id));
  await setDoc(docRef, sanitizeForFirestore(player), { merge: true });
}

export async function syncPlayersBatchToFirestore(players: Player[]): Promise<void> {
  const batch = writeBatch(db);
  players.forEach((p) => {
    const docRef = doc(db, 'players', String(p.id));
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

// ----------------- BULK INITIAL SEEDING -----------------

/**
 * Checks if Firestore collections are empty, and seeds them with initial data if so.
 */
export async function seedFirestoreIfEmpty(data: {
  players: Player[];
  matches: Match[];
  seasons: LagaAmalSeasonData[];
}): Promise<boolean> {
  try {
    const playersSnap = await getDocs(collection(db, 'players'));
    if (playersSnap.empty) {
      console.log('Firestore: Seeding initial players...');
      await syncPlayersBatchToFirestore(data.players);
    }

    const matchesSnap = await getDocs(collection(db, 'matches'));
    if (matchesSnap.empty) {
      console.log('Firestore: Seeding initial matches...');
      const matchBatch = writeBatch(db);
      data.matches.forEach((m) => {
        const docRef = doc(db, 'matches', String(m.id));
        matchBatch.set(docRef, sanitizeForFirestore(m));
      });
      await matchBatch.commit();
    }

    const lagaAmalSnap = await getDocs(collection(db, 'laga_amal_seasons'));
    if (lagaAmalSnap.empty && data.seasons && data.seasons.length > 0) {
      console.log('Firestore: Seeding initial Laga Amal seasons...');
      await syncSeasonsBatchToFirestore(data.seasons);
    }

    return true;
  } catch (err) {
    console.warn('Firestore initial seeding error:', err);
    return false;
  }
}

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
