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
 * Helper to build standard match result text and details
 */
export function buildMatchResultText(match: Match): {
  content: string;
  winner: string;
  mvpName: string;
  mvpHero: string;
  matchNum: string | number;
} {
  const winner = match.winner || 'Belum Ditentukan';
  const matchNum = match.matchNumber || match.id;

  // Find MVP from match rosters
  const allPlayers = [...(match.pohon || []), ...(match.lobby || [])];
  const mvpItem = allPlayers.find((p) => p.medal === 'MVP');
  const mvpName = mvpItem ? mvpItem.player_name : 'Semua Berjuang';
  const mvpHero = mvpItem ? mvpItem.hero_name : '';

  const content = `⚔️ Match #${matchNum} selesai! ${winner} menang 🏆 MVP: ${mvpName}${mvpHero ? ` (${mvpHero})` : ''}`;

  return { content, winner, mvpName, mvpHero, matchNum };
}

/**
 * Sends an automated system announcement when a match finishes
 */
export async function sendMatchResultSystemMessage(
  match: Match,
  seasonTitle?: string
): Promise<void> {
  const { content, winner, mvpName, mvpHero } = buildMatchResultText(match);

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
 * Updates an existing match result announcement message when a match is edited
 */
export async function updateMatchResultSystemMessage(
  updatedMatch: Match,
  previousMatch?: Match,
  seasonTitle?: string
): Promise<void> {
  const { content, winner, mvpName, mvpHero } = buildMatchResultText(updatedMatch);
  const targetId = previousMatch?.id ?? updatedMatch.id;
  const matchSeason = (seasonTitle || updatedMatch.season || '').toLowerCase().trim();

  const currentMessages = getLocalMessages();
  let modified = false;

  const updatedMessages = currentMessages.map((msg) => {
    if (!msg.isSystem || msg.systemType !== 'match_result') return msg;

    const msgMatchId = String(msg.matchData?.matchId ?? '');
    const isIdMatch = msgMatchId === String(targetId) || msgMatchId === String(updatedMatch.id);
    if (!isIdMatch) return msg;

    // Check season compatibility if both specify a season
    if (msg.matchData?.seasonName && matchSeason) {
      const msgSeason = msg.matchData.seasonName.toLowerCase().trim();
      const s1 = msgSeason.replace(/[^a-z0-9]/g, '');
      const s2 = matchSeason.replace(/[^a-z0-9]/g, '');
      if (s1 && s2 && s1 !== s2 && !s1.includes(s2) && !s2.includes(s1)) {
        return msg;
      }
    }

    modified = true;
    const updatedMsg: ChatMessage = {
      ...msg,
      content,
      matchData: {
        ...msg.matchData,
        matchId: updatedMatch.id,
        seasonName: seasonTitle || updatedMatch.season || msg.matchData?.seasonName,
        winner,
        mvpPlayer: mvpName,
        mvpHero,
      },
    };

    // Update in Supabase
    try {
      supabase
        .from('chat_messages')
        .update({
          content: updatedMsg.content,
          data: updatedMsg,
        })
        .eq('id', msg.id)
        .then(
          () => {},
          (e) => console.warn('Supabase update chat msg error:', e)
        );
    } catch (err) {
      // ignore
    }

    // Update in Firestore
    try {
      const docRef = doc(db, 'chat_messages', msg.id);
      updateDoc(docRef, JSON.parse(JSON.stringify(updatedMsg))).catch((e) =>
        console.warn('Firestore update chat msg error:', e)
      );
    } catch (err) {
      // ignore
    }

    return updatedMsg;
  });

  if (modified) {
    saveLocalMessages(updatedMessages);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pantos_chat_updated', { detail: updatedMessages }));
    }
  }

  // Also query Supabase rows directly to ensure messages outside local window are updated
  try {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      for (const row of data) {
        const raw = row.data as ChatMessage;
        if (
          raw?.isSystem &&
          raw?.systemType === 'match_result' &&
          (String(raw?.matchData?.matchId) === String(targetId) ||
            String(raw?.matchData?.matchId) === String(updatedMatch.id))
        ) {
          const updatedMsg: ChatMessage = {
            ...raw,
            content,
            matchData: {
              ...raw.matchData,
              matchId: updatedMatch.id,
              seasonName: seasonTitle || updatedMatch.season || raw.matchData?.seasonName,
              winner,
              mvpPlayer: mvpName,
              mvpHero,
            },
          };
          await supabase
            .from('chat_messages')
            .update({ content, data: updatedMsg })
            .eq('id', row.id);

          try {
            const docRef = doc(db, 'chat_messages', row.id);
            await updateDoc(docRef, JSON.parse(JSON.stringify(updatedMsg)));
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Remove match result announcement when a match is deleted
 */
export async function removeMatchResultSystemMessage(
  matchId: string | number
): Promise<void> {
  const currentMessages = getLocalMessages();
  const toDelete: string[] = [];

  const filtered = currentMessages.filter((msg) => {
    if (
      msg.isSystem &&
      msg.systemType === 'match_result' &&
      String(msg.matchData?.matchId) === String(matchId)
    ) {
      toDelete.push(msg.id);
      return false;
    }
    return true;
  });

  if (toDelete.length > 0) {
    saveLocalMessages(filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pantos_chat_updated', { detail: filtered }));
    }
    for (const msgId of toDelete) {
      deleteChatMessage(msgId).catch(() => {});
    }
  }
}

/**
 * Automatically self-heals and synchronizes any out-of-sync match_result messages
 * with the latest match data from the matches state.
 */
export async function syncAllMatchSystemMessages(matches: Match[]): Promise<void> {
  if (!matches || matches.length === 0) return;
  const currentMessages = getLocalMessages();
  let anyModified = false;

  const updatedMessages = currentMessages.map((msg) => {
    if (!msg.isSystem || msg.systemType !== 'match_result' || !msg.matchData?.matchId) {
      return msg;
    }

    const linkedMatch =
      matches.find((m) => {
        if (String(m.id) !== String(msg.matchData?.matchId)) return false;
        if (msg.matchData?.seasonName && m.season) {
          const s1 = m.season.toLowerCase().replace(/[^a-z0-9]/g, '');
          const s2 = msg.matchData.seasonName.toLowerCase().replace(/[^a-z0-9]/g, '');
          return s1 === s2 || s1.includes(s2) || s2.includes(s1);
        }
        return true;
      }) || matches.find((m) => String(m.id) === String(msg.matchData?.matchId));

    if (!linkedMatch) return msg;

    const { content, winner, mvpName, mvpHero } = buildMatchResultText(linkedMatch);
    const seasonName = linkedMatch.season || msg.matchData.seasonName;

    // Check if anything is out of sync
    const isDesynced =
      msg.content !== content ||
      msg.matchData.winner !== winner ||
      msg.matchData.mvpPlayer !== mvpName ||
      msg.matchData.mvpHero !== mvpHero ||
      msg.matchData.seasonName !== seasonName;

    if (!isDesynced) return msg;

    anyModified = true;
    const updatedMsg: ChatMessage = {
      ...msg,
      content,
      matchData: {
        ...msg.matchData,
        matchId: linkedMatch.id,
        seasonName,
        winner,
        mvpPlayer: mvpName,
        mvpHero,
      },
    };

    // Update in Supabase & Firestore
    try {
      supabase
        .from('chat_messages')
        .update({ content, data: updatedMsg })
        .eq('id', msg.id)
        .then(
          () => {},
          () => {}
        );
      const docRef = doc(db, 'chat_messages', msg.id);
      updateDoc(docRef, JSON.parse(JSON.stringify(updatedMsg))).catch(() => {});
    } catch (e) {
      // ignore
    }

    return updatedMsg;
  });

  if (anyModified) {
    saveLocalMessages(updatedMessages);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pantos_chat_updated', { detail: updatedMessages }));
    }
  }
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
