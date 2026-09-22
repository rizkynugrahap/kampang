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
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatReaction, Match } from '../types';
import { getPlayerDocId } from '../utils/playerId';
import { safeSetItem, safeGetItem } from '../utils/storage';

const LOCAL_STORAGE_CHAT_KEY = 'pantos_community_chat_messages';
const LOCAL_STORAGE_PINS_KEY = 'pantos_player_pins_cache';

// Helper to get local cache
function getLocalMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetItem(LOCAL_STORAGE_CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    safeSetItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(messages));
  } catch (e) {
    // ignore
  }
}

function getLocalPins(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = safeGetItem(LOCAL_STORAGE_PINS_KEY);
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
    safeSetItem(LOCAL_STORAGE_PINS_KEY, JSON.stringify(current));
  } catch (e) {
    // ignore
  }
}

/**
 * Subscribe to Lobby Chat messages in real-time.
 * Synchronizes with Supabase Realtime, Firestore, and localStorage.
 */
export function subscribeToChatMessages(
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // 1. Emit local cache immediately for instant UI
  const cached = getLocalMessages();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  let isSubscribed = true;

  // Function to fetch latest messages from Supabase
  const fetchFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0 && isSubscribed) {
        const msgs: ChatMessage[] = data.map((row: any) => {
          const raw = row.data as ChatMessage;
          return {
            ...raw,
            id: raw?.id || row.id,
          };
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        saveLocalMessages(msgs);
        onUpdate(msgs);
      }
    } catch (e) {
      // ignore if Supabase table not created yet
    }
  };

  fetchFromSupabase();

  // 2. Supabase Realtime channel
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel('supabase-chat-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchFromSupabase();
        }
      )
      .subscribe();
  } catch (e) {
    // ignore
  }

  // 3. Firestore fallback / sync listener
  let firestoreUnsub: Unsubscribe = () => {};
  try {
    const colRef = collection(db, 'chat_messages');
    const q = query(colRef, orderBy('timestamp', 'asc'), limit(200));

    firestoreUnsub = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const messages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ChatMessage;
          messages.push({
            ...data,
            id: docSnap.id,
          });
        });

        if (messages.length > 0) {
          messages.sort((a, b) => a.timestamp - b.timestamp);
          saveLocalMessages(messages);
          onUpdate(messages);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (e) {
    // ignore
  }

  return () => {
    isSubscribed = false;
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
    firestoreUnsub();
  };
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

  // Sync to Supabase
  try {
    await supabase.from('chat_messages').upsert({
      id: messageId,
      sender_name: fullMessage.senderName,
      content: fullMessage.content,
      data: fullMessage,
      created_at: fullMessage.createdAt,
    });
  } catch (err) {
    console.warn('Could not sync chat message to Supabase:', err);
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await setDoc(docRef, JSON.parse(JSON.stringify(fullMessage)));
  } catch (err) {
    console.warn('Could not sync chat message to Firestore:', err);
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
    updatedUsers = currentReaction.users.filter((u) => u !== playerName);
  } else {
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

  // Sync to Supabase
  try {
    await supabase.from('chat_messages').upsert({
      id: messageId,
      sender_name: targetMsg.senderName,
      content: targetMsg.content,
      data: targetMsg,
    });
  } catch (err) {
    // ignore
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await updateDoc(docRef, {
      [`reactions.${emoji}`]: updatedUsers.length > 0
        ? { emoji, count: updatedUsers.length, users: updatedUsers }
        : null,
    });
  } catch (err) {
    // ignore
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

  const targetMsg = updated.find((m) => m.id === messageId);

  // Sync to Supabase
  if (targetMsg) {
    try {
      await supabase.from('chat_messages').upsert({
        id: messageId,
        sender_name: targetMsg.senderName,
        content: targetMsg.content,
        data: targetMsg,
      });
    } catch (err) {
      // ignore
    }
  }

  // Sync to Firestore
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await updateDoc(docRef, {
      isPinned,
      pinnedAt: isPinned ? new Date().toISOString() : null,
      pinnedBy: isPinned ? adminName : null,
    });
  } catch (err) {
    // ignore
  }
}

/**
 * Delete a chat message
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const currentMessages = getLocalMessages();
  const updated = currentMessages.filter((m) => m.id !== messageId);
  saveLocalMessages(updated);

  // Delete from Supabase
  try {
    await supabase.from('chat_messages').delete().eq('id', messageId);
  } catch (err) {
    // ignore
  }

  // Delete from Firestore
  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await deleteDoc(docRef);
  } catch (err) {
    // ignore
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

  // 1. Try Supabase first
  try {
    const { data, error } = await supabase
      .from('player_pins')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (!error && data) {
      if (data.pin === cleanPin) {
        saveLocalPin(docId, cleanPin);
        return { success: true, isNewPin: false };
      } else {
        return { success: false, error: 'PIN salah. Silakan coba lagi.' };
      }
    } else if (!error && !data) {
      // New PIN in Supabase
      await supabase.from('player_pins').upsert({
        id: docId,
        player_name: playerName.trim(),
        pin: cleanPin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      saveLocalPin(docId, cleanPin);
      return { success: true, isNewPin: true };
    }
  } catch (err) {
    // ignore if table not set up yet
  }

  // 2. Fallback to Firestore
  try {
    const docRef = doc(db, 'player_pins', docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
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
    // 3. Fallback to local storage cache
    const localPins = getLocalPins();
    if (localPins[docId]) {
      if (localPins[docId] === cleanPin) {
        return { success: true, isNewPin: false };
      }
      return { success: false, error: 'PIN salah. Silakan coba lagi.' };
    } else {
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

  // Update in Supabase
  try {
    await supabase.from('player_pins').upsert({
      id: docId,
      player_name: playerName.trim(),
      pin: cleanNew,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // ignore
  }

  // Update in Firestore
  try {
    const docRef = doc(db, 'player_pins', docId);
    await setDoc(
      docRef,
      {
        playerName: playerName.trim(),
        pin: cleanNew,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    // ignore
  }

  saveLocalPin(docId, cleanNew);
  return { success: true };
}

/**
 * Checks whether a player already has a PIN configured
 */
export async function checkHasPin(playerName: string): Promise<boolean> {
  const docId = getPlayerDocId({ name: playerName });

  // 1. Check Supabase
  try {
    const { data } = await supabase
      .from('player_pins')
      .select('id')
      .eq('id', docId)
      .maybeSingle();
    if (data) return true;
  } catch (e) {
    // ignore
  }

  // 2. Check Firestore
  try {
    const docRef = doc(db, 'player_pins', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return true;
  } catch (e) {
    // ignore
  }

  // 3. Check local
  const localPins = getLocalPins();
  return !!localPins[docId];
}
