import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage, ChatReaction, Match } from '../types';
import { getPlayerDocId } from '../utils/playerId';

const LOCAL_STORAGE_CHAT_KEY = 'pantos_community_chat_messages';
const LOCAL_STORAGE_PINS_KEY = 'pantos_player_pins_cache';

// Helper to get local cache
function getLocalMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(messages));
  } catch (e) {
    // ignore
  }
}

function getLocalPins(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PINS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalPin(docId: string, pin: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalPins();
    current[docId] = pin;
    localStorage.setItem(LOCAL_STORAGE_PINS_KEY, JSON.stringify(current));
  } catch (e) {
    // ignore
  }
}

/**
 * Subscribe to Lobby Chat messages in real-time
 */
export function subscribeToChatMessages(
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // Emit local cache immediately so UI loads with 0ms delay
  const cached = getLocalMessages();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const colRef = collection(db, 'chat_messages');
  // Order by timestamp ascending for standard chat flow
  const q = query(colRef, orderBy('timestamp', 'asc'), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ChatMessage;
        messages.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);

      saveLocalMessages(messages);
      onUpdate(messages);
    },
    (err) => {
      console.warn('Firestore chat snapshot error, serving from local cache:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Send a message to the Lobby Chat
 */
export async function sendChatMessage(
  message: Omit<ChatMessage, 'id' | 'createdAt' | 'timestamp'>
): Promise<string> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const fullMessage: ChatMessage = {
    ...message,
    id: messageId,
    createdAt: now.toISOString(),
    timestamp: now.getTime(),
    reactions: message.reactions || {},
    isPinned: message.isPinned || false,
  };

  // Optimistic update
  const current = getLocalMessages();
  const updated = [...current, fullMessage];
  saveLocalMessages(updated);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await setDoc(docRef, JSON.parse(JSON.stringify(fullMessage)));
  } catch (err) {
    console.error('Failed to sync chat message to Firestore:', err);
  }

  return messageId;
}

/**
 * Sends an automated system announcement when a match finishes
 */
export async function sendMatchResultSystemMessage(
  match: Match,
  seasonTitle?: string
): Promise<void> {
  const winner = match.winner || 'Belum Ditentukan';
  const matchNum = match.id;
  
  // Find MVP from match rosters
  const allPlayers = [...(match.pohon || []), ...(match.lobby || [])];
  const mvpItem = allPlayers.find((p) => p.medal === 'MVP');
  const mvpName = mvpItem ? mvpItem.player_name : 'Semua Berjuang';
  const mvpHero = mvpItem ? mvpItem.hero_name : '';

  const content = `⚔️ Match #${matchNum} selesai! ${winner} menang 🏆 MVP: ${mvpName}${mvpHero ? ` (${mvpHero})` : ''}`;

  await sendChatMessage({
    senderName: 'Laga Amal Bot',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LagaAmalBot&backgroundColor=e8b33d',
    senderTier: 'Sistem',
    senderJulukan: 'Wasit Resmi Laga Amal Pantos',
    content,
    isSystem: true,
    systemType: 'match_result',
    matchData: {
      matchId: match.id,
      seasonName: seasonTitle || match.season,
      winner,
      mvpPlayer: mvpName,
      mvpHero,
    },
  });
}

/**
 * Toggle emoji reaction on a message
 */
export async function toggleEmojiReaction(
  messageId: string,
  emoji: string,
  playerName: string
): Promise<void> {
  const currentMessages = getLocalMessages();
  const msgIndex = currentMessages.findIndex((m) => m.id === messageId);
  if (msgIndex === -1) return;

  const targetMsg = { ...currentMessages[msgIndex] };
  const reactions = { ...(targetMsg.reactions || {}) };
  const currentReaction: ChatReaction = reactions[emoji] || { emoji, count: 0, users: [] };

  const userIndex = currentReaction.users.indexOf(playerName);
  let updatedUsers: string[];

  if (userIndex >= 0) {
    // Remove reaction
    updatedUsers = currentReaction.users.filter((u) => u !== playerName);
  } else {
    // Add reaction
    updatedUsers = [...currentReaction.users, playerName];
  }

  if (updatedUsers.length === 0) {
    delete reactions[emoji];
  } else {
    reactions[emoji] = {
      emoji,
      count: updatedUsers.length,
      users: updatedUsers,
    };
  }

  targetMsg.reactions = reactions;
  currentMessages[msgIndex] = targetMsg;
  saveLocalMessages(currentMessages);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await updateDoc(docRef, {
      [`reactions.${emoji}`]: updatedUsers.length > 0
        ? { emoji, count: updatedUsers.length, users: updatedUsers }
        : null,
    });
  } catch (err) {
    console.warn('Failed to update reaction on Firestore, local applied:', err);
  }
}

/**
 * Pin or Unpin a message
 */
export async function pinChatMessage(
  messageId: string,
  isPinned: boolean,
  adminName: string
): Promise<void> {
  const currentMessages = getLocalMessages();
  const updated = currentMessages.map((m) => {
    if (m.id === messageId) {
      return {
        ...m,
        isPinned,
        pinnedAt: isPinned ? new Date().toISOString() : undefined,
        pinnedBy: isPinned ? adminName : undefined,
      };
    }
    return m;
  });
  saveLocalMessages(updated);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await updateDoc(docRef, {
      isPinned,
      pinnedAt: isPinned ? new Date().toISOString() : null,
      pinnedBy: isPinned ? adminName : null,
    });
  } catch (err) {
    console.warn('Failed to toggle pin on Firestore:', err);
  }
}

/**
 * Delete a chat message
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const currentMessages = getLocalMessages();
  const updated = currentMessages.filter((m) => m.id !== messageId);
  saveLocalMessages(updated);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete chat message from Firestore:', err);
  }
}

// ----------------- PLAYER PIN AUTHENTICATION -----------------

/**
 * Verify or initialize a player's PIN
 */
export async function verifyOrSetPlayerPin(
  playerName: string,
  enteredPin: string
): Promise<{ success: boolean; isNewPin?: boolean; error?: string }> {
  if (!playerName || !playerName.trim()) {
    return { success: false, error: 'Pilih nama pemain terlebih dahulu.' };
  }
  const cleanPin = enteredPin.trim();
  if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8) {
    return { success: false, error: 'PIN harus terdiri dari 4-8 karakter/angka.' };
  }

  const docId = getPlayerDocId({ name: playerName });

  try {
    const docRef = doc(db, 'player_pins', docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // First time user sets PIN
      await setDoc(docRef, {
        playerName: playerName.trim(),
        pin: cleanPin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      saveLocalPin(docId, cleanPin);
      return { success: true, isNewPin: true };
    }

    const data = docSnap.data();
    if (data.pin === cleanPin) {
      saveLocalPin(docId, cleanPin);
      return { success: true, isNewPin: false };
    } else {
      return { success: false, error: 'PIN salah. Silakan coba lagi.' };
    }
  } catch (err) {
    console.warn('Firestore PIN check failed, falling back to local storage cache:', err);
    const localPins = getLocalPins();
    if (localPins[docId]) {
      if (localPins[docId] === cleanPin) {
        return { success: true, isNewPin: false };
      }
      return { success: false, error: 'PIN salah. Silakan coba lagi.' };
    } else {
      // Save locally
      saveLocalPin(docId, cleanPin);
      return { success: true, isNewPin: true };
    }
  }
}

/**
 * Change existing player PIN
 */
export async function changePlayerPin(
  playerName: string,
  oldPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  const cleanNew = newPin.trim();
  if (!cleanNew || cleanNew.length < 4 || cleanNew.length > 8) {
    return { success: false, error: 'PIN baru harus 4-8 digit.' };
  }

  const check = await verifyOrSetPlayerPin(playerName, oldPin);
  if (!check.success) {
    return { success: false, error: 'PIN lama salah.' };
  }

  const docId = getPlayerDocId({ name: playerName });
  try {
    const docRef = doc(db, 'player_pins', docId);
    await setDoc(docRef, {
      playerName: playerName.trim(),
      pin: cleanNew,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    saveLocalPin(docId, cleanNew);
    return { success: true };
  } catch (err: any) {
    saveLocalPin(docId, cleanNew);
    return { success: true };
  }
}

/**
 * Checks whether a player already has a PIN configured
 */
export async function checkHasPin(playerName: string): Promise<boolean> {
  const docId = getPlayerDocId({ name: playerName });
  try {
    const docRef = doc(db, 'player_pins', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return true;
  } catch (e) {
    // ignore
  }
  const localPins = getLocalPins();
  return !!localPins[docId];
}
