/**
 * High-Fidelity MLBB Esports Commentator Audio Engine.
 * 
 * Features:
 * 1. Primary: Server-side Gemini AI Text-to-Speech (gemini-3.8-flash-lite-tts)
 *    with realistic human inflection, excitement, gasping, and hype caster tone.
 * 2. Automatic cloud database (Firestore) upload & instant playback caching.
 * 3. Rate-limit detection & countdown estimator: when cloud AI is rate-limited,
 *    it gracefully stops and notifies the user with the estimated reset time.
 *    ROBOT VOICE IS STRICTLY ELIMINATED as requested.
 * 4. Web Audio API broadcast fanfare stinger before commentary starts.
 */

import {
  saveCommentatorAudioToFirestore,
  getCommentatorAudioFromFirestore,
} from '../services/firestoreSync';

export type CasterVoiceId = 'Puck';

export interface CasterPersona {
  id: CasterVoiceId;
  name: string;
  tagline: string;
  avatarEmoji: string;
}

export const MAIN_CASTER: CasterPersona = {
  id: 'Puck',
  name: 'Caster Utama MPL (Gaya Paling Gokil)',
  tagline: 'Berapi-api, penuh histeria, ketawa & teriakan turnamen MLBB',
  avatarEmoji: '🔥',
};

export const CASTER_PERSONAS: CasterPersona[] = [MAIN_CASTER];

export interface RateLimitState {
  isLimited: boolean;
  message: string;
  retryAfterSeconds: number;
  resetTimestamp: number;
  resetTimeFormatted: string;
}

export interface CommentatorPlayOptions {
  matchId?: number | string;
  mode?: 'full' | 'recap';
  forceRegenerate?: boolean;
  onLoading?: () => void;
  onStart?: (isAiAudio: boolean, providerName?: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onRateLimit?: (rateLimit: RateLimitState) => void;
}

class CommentatorAudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private currentAudioElement: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // cacheKey -> dataUrl
  private activeRateLimit: RateLimitState | null = null;
  private rateLimitListeners = new Set<(state: RateLimitState | null) => void>();

  public getRateLimitStatus(): RateLimitState | null {
    if (this.activeRateLimit && this.activeRateLimit.resetTimestamp <= Date.now()) {
      this.activeRateLimit = null;
    }
    return this.activeRateLimit;
  }

  public subscribeRateLimit(cb: (state: RateLimitState | null) => void): () => void {
    this.rateLimitListeners.add(cb);
    cb(this.getRateLimitStatus());
    return () => {
      this.rateLimitListeners.delete(cb);
    };
  }

  private notifyRateLimit(limit: RateLimitState | null) {
    this.activeRateLimit = limit;
    this.rateLimitListeners.forEach((cb) => {
      try {
        cb(limit);
      } catch {}
    });
  }

  private getAudioContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * MLBB Esports Broadcast Fanfare Stinger
   */
  public playBroadcastFanfare(): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      try {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Fanfare)
        const duration = 0.11;

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * duration);

          gain.gain.setValueAtTime(0, now + idx * duration);
          gain.gain.linearRampToValueAtTime(0.14, now + idx * duration + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * duration);
          osc.stop(now + idx * duration + duration + 0.18);
        });

        // Gong low resonance
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(130.81, now + notes.length * duration * 0.7);
        subOsc.frequency.exponentialRampToValueAtTime(65.4, now + notes.length * duration * 0.7 + 0.4);

        subGain.gain.setValueAtTime(0.12, now + notes.length * duration * 0.7);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * duration * 0.7 + 0.45);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        subOsc.start(now + notes.length * duration * 0.7);
        subOsc.stop(now + notes.length * duration * 0.7 + 0.45);

        setTimeout(() => {
          resolve();
        }, 500);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Prepares and punctuates text to maximize natural human caster rhythm
   */
  public cleanTextForCaster(text: string): string {
    if (!text) return '';
    return text
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
      .replace(/[-—_]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks if an audio commentary is already uploaded and saved in Firestore database
   */
  public async checkStoredAudio(
    matchId?: number | string,
    text?: string,
    mode: 'full' | 'recap' = 'full'
  ): Promise<boolean> {
    if (!text && !matchId) return false;
    try {
      const cleanText = text ? this.cleanTextForCaster(text) : '';
      const cached = await getCommentatorAudioFromFirestore({
        matchId,
        mode,
        text: cleanText,
      });
      return !!cached?.audioUrl;
    } catch {
      return false;
    }
  }

  /**
   * Primary: Generate and play realistic AI Caster speech via Multi-Tier backend (Gemini -> Edge Neural -> Google).
   * Automatically checks Firestore database first so audio can be replayed infinitely without consuming AI limits.
   * If rate-limited, immediately halts without switching to robotic voices and alerts the user with an estimate timer.
   */
  public async playCasterCommentary(
    text: string,
    options: CommentatorPlayOptions = {}
  ): Promise<void> {
    this.stop();

    const cleanText = this.cleanTextForCaster(text);
    if (!cleanText) return;

    const chosenMode = options.mode || 'full';
    const cacheKey = `${options.matchId || ''}:${chosenMode}:${cleanText.slice(0, 140)}`;

    if (options.onLoading) options.onLoading();

    // 1. Check if audio is already cached in browser memory (instant replay, 0 AI tokens)
    if (!options.forceRegenerate && this.audioCache.has(cacheKey)) {
      const audioUrl = this.audioCache.get(cacheKey)!;
      await this.playBroadcastFanfare();
      this.playHtmlAudio(audioUrl, options, 'AI Caster (Tersimpan di Memori)');
      return;
    }

    // 2. Check Firestore Database for permanently uploaded audio (0 AI tokens)
    if (!options.forceRegenerate) {
      try {
        const storedAudio = await getCommentatorAudioFromFirestore({
          matchId: options.matchId,
          mode: chosenMode,
          text: cleanText,
        });

        if (storedAudio && storedAudio.audioUrl) {
          this.audioCache.set(cacheKey, storedAudio.audioUrl);
          await this.playBroadcastFanfare();
          this.playHtmlAudio(
            storedAudio.audioUrl,
            options,
            storedAudio.providerName || 'AI Caster (Tersimpan di Database)'
          );
          return;
        }
      } catch (dbErr) {
        console.warn('[Commentator Engine] Check Firestore audio error:', dbErr);
      }
    }

    // 3. Check if active rate limit cooldown is still running
    const currentLimit = this.getRateLimitStatus();
    if (!options.forceRegenerate && currentLimit && currentLimit.resetTimestamp > Date.now()) {
      const secondsLeft = Math.ceil((currentLimit.resetTimestamp - Date.now()) / 1000);
      const updatedLimit: RateLimitState = {
        ...currentLimit,
        retryAfterSeconds: secondsLeft,
      };
      if (options.onRateLimit) options.onRateLimit(updatedLimit);
      if (options.onError) options.onError(new Error(updatedLimit.message));
      return;
    }

    // 4. Fetch Multi-Tier AI TTS audio from backend (Gemini -> Edge Neural -> Google)
    try {
      const res = await fetch('/api/commentator/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          mode: chosenMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audioUrl) {
          this.audioCache.set(cacheKey, data.audioUrl);
          this.notifyRateLimit(null); // Clear any past limit

          // IMMEDIATELY upload to Firestore Database so it is saved and can be replayed infinitely!
          saveCommentatorAudioToFirestore({
            matchId: options.matchId,
            mode: chosenMode,
            audioUrl: data.audioUrl,
            provider: data.provider || 'gemini',
            providerName: data.providerName || 'AI Caster',
            text: cleanText,
          }).catch((uploadErr) => {
            console.warn('[Commentator Engine] Failed to upload audio to Firestore:', uploadErr);
          });

          await this.playBroadcastFanfare();
          this.playHtmlAudio(data.audioUrl, options, data.providerName || 'AI Neural Caster');
          return;
        }
      }

      // Handle rate limit response (HTTP 429 or server rate limit response)
      let limitInfo: RateLimitState | null = null;
      try {
        const errJson = await res.json();
        if (errJson && (errJson.isRateLimited || res.status === 429)) {
          limitInfo = {
            isLimited: true,
            message:
              errJson.message ||
              'Kapasitas generate suara AI Caster sedang limit. Mohon coba lagi beberapa saat lagi.',
            retryAfterSeconds: errJson.retryAfterSeconds || 60,
            resetTimestamp: errJson.resetTimestamp || Date.now() + 60000,
            resetTimeFormatted:
              errJson.resetTimeFormatted ||
              new Date(Date.now() + 60000).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
          };
        }
      } catch {}

      if (!limitInfo) {
        const cooldown = 60;
        const resetTs = Date.now() + cooldown * 1000;
        limitInfo = {
          isLimited: true,
          message:
            'Kapasitas generate suara AI Caster sedang mencapai batas limit rate. Silakan coba lagi nanti.',
          retryAfterSeconds: cooldown,
          resetTimestamp: resetTs,
          resetTimeFormatted: new Date(resetTs).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
      }

      this.notifyRateLimit(limitInfo);
      if (options.onRateLimit) options.onRateLimit(limitInfo);
      if (options.onError) options.onError(new Error(limitInfo.message));

      // Strictly stop here. Do not play robot speech!
      return;
    } catch (apiErr: any) {
      console.warn('[Commentator Engine] Request error:', apiErr);
      const cooldown = 60;
      const resetTs = Date.now() + cooldown * 1000;
      const genericLimit: RateLimitState = {
        isLimited: true,
        message: 'Koneksi ke AI Caster terputus atau sedang limit. Silakan coba lagi nanti.',
        retryAfterSeconds: cooldown,
        resetTimestamp: resetTs,
        resetTimeFormatted: new Date(resetTs).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
      this.notifyRateLimit(genericLimit);
      if (options.onRateLimit) options.onRateLimit(genericLimit);
      if (options.onError) options.onError(new Error(genericLimit.message));
    }
  }

  private playHtmlAudio(
    audioUrl: string,
    options: {
      onStart?: (isAiAudio: boolean, providerName?: string) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
    providerName = 'AI Neural Caster'
  ) {
    try {
      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;

      audio.onplay = () => {
        if (options.onStart) options.onStart(true, providerName);
      };

      audio.onended = () => {
        this.currentAudioElement = null;
        if (options.onEnd) options.onEnd();
      };

      audio.onerror = (e) => {
        this.currentAudioElement = null;
        if (options.onError) options.onError(e);
      };

      audio.play().catch((err) => {
        console.warn('Audio play autoplay restricted or failed:', err);
        if (options.onError) options.onError(err);
      });
    } catch (err) {
      if (options.onError) options.onError(err);
    }
  }

  public pause(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    }
  }

  public resume(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.play().catch(() => {});
    }
  }

  public stop(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
  }

  public isPlaying(): boolean {
    if (this.currentAudioElement) {
      return !this.currentAudioElement.paused && !this.currentAudioElement.ended;
    }
    return false;
  }
}

export const commentatorAudio = new CommentatorAudioManager();
