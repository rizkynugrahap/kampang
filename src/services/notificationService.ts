import { safeGetItem, safeSetItem } from '../utils/storage';

const NOTIFICATION_SOUND_KEY = 'pantos_chat_notification_sound_enabled';
const NOTIFICATION_READ_PREFIX = 'pantos_chat_read_mentions_';

/**
 * Check if audio sound alert is enabled (defaults to true)
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const val = safeGetItem(NOTIFICATION_SOUND_KEY);
  return val === null ? true : val === 'true';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  safeSetItem(NOTIFICATION_SOUND_KEY, enabled ? 'true' : 'false');
}

/**
 * Synthesizes a crisp, pleasant dual-tone chime using Web Audio API.
 * Eliminates external file dependencies and works with zero network latency.
 */
export function playMentionChime(): void {
  if (!isNotificationSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Oscillator 1: High crisp ping (D5: 587Hz -> A5: 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);

    // Oscillator 2: Subtle harmonic sparkle (D6: 1174Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {
    // AudioContext blocked by browser policy until user gesture
  }
}

/**
 * Request permission for Desktop Web Notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    return 'denied';
  }
}

/**
 * Display a native browser desktop notification if permitted
 */
export function showBrowserNotification(
  senderName: string,
  content: string,
  senderAvatar?: string
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(`Laga Amal Pantos - @${senderName} menyebut Anda`, {
      body: content.slice(0, 140),
      icon: senderAvatar || '/icon.png',
      badge: '/icon.png',
      tag: `pantos-mention-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 8000);
  } catch (e) {
    // ignore
  }
}

/**
 * Get the set of message IDs marked as read for this player
 */
export function getReadMentionIds(playerName: string): Set<string> {
  if (!playerName || typeof window === 'undefined') return new Set();
  try {
    const raw = safeGetItem(`${NOTIFICATION_READ_PREFIX}${playerName.toLowerCase()}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * Mark a specific message mention as read
 */
export function markMentionAsRead(playerName: string, messageId: string): void {
  if (!playerName || !messageId || typeof window === 'undefined') return;
  try {
    const current = getReadMentionIds(playerName);
    current.add(messageId);
    // Keep max 200 items to avoid storage bloat
    const arr = Array.from(current).slice(-200);
    safeSetItem(`${NOTIFICATION_READ_PREFIX}${playerName.toLowerCase()}`, JSON.stringify(arr));
  } catch (e) {
    // ignore
  }
}

/**
 * Mark all given mention message IDs as read
 */
export function markAllMentionsAsRead(playerName: string, messageIds: string[]): void {
  if (!playerName || typeof window === 'undefined') return;
  try {
    const current = getReadMentionIds(playerName);
    messageIds.forEach((id) => current.add(id));
    const arr = Array.from(current).slice(-200);
    safeSetItem(`${NOTIFICATION_READ_PREFIX}${playerName.toLowerCase()}`, JSON.stringify(arr));
  } catch (e) {
    // ignore
  }
}
