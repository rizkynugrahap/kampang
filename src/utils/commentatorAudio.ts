/**
 * High-Fidelity MLBB Esports Commentator Audio Engine.
 * 
 * Features:
 * 1. Primary: Server-side Gemini AI Text-to-Speech (gemini-3.8-flash-lite-tts)
 *    with realistic human inflection, excitement, gasping, and hype caster tone.
 * 2. In-memory audio caching for instant replay.
 * 3. Secondary Fallback: Enhanced Web Speech API with natural neural Indonesian voice selection
 *    and punctuation rhythm tuning if the server/API key is unreachable.
 * 4. Web Audio API broadcast fanfare stinger before commentary starts.
 */

export type CasterVoiceId = 'Puck' | 'Fenrir' | 'Charon' | 'Kore';

export interface CasterPersona {
  id: CasterVoiceId;
  name: string;
  tagline: string;
  avatarEmoji: string;
}

export const CASTER_PERSONAS: CasterPersona[] = [
  {
    id: 'Puck',
    name: 'Caster Hype (Puck)',
    tagline: 'Berapi-api, penuh histeria & teriakan turnamen',
    avatarEmoji: '🔥',
  },
  {
    id: 'Fenrir',
    name: 'Caster Shoutcaster (Fenrir)',
    tagline: 'Suara lantang, tegas & penuh tensi tinggi',
    avatarEmoji: '⚡',
  },
  {
    id: 'Charon',
    name: 'Caster Analis Senior (Charon)',
    tagline: 'Gaya caster senior berbobot & mendalam',
    avatarEmoji: '🎙️',
  },
  {
    id: 'Kore',
    name: 'Caster Host (Kore)',
    tagline: 'Vokal ceria, energik & elegan',
    avatarEmoji: '👑',
  },
];

class CommentatorAudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCache = new Map<string, string>(); // text+voice -> dataUrl
  private naturalIndonesianVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();

    // Priority 1: Natural / Online Neural Indonesian voices (e.g. Microsoft Gadis Online Natural, Google Bahasa Indonesia)
    const naturalIndo = voices.find(
      (v) =>
        (v.lang === 'id-ID' || v.lang === 'id_ID' || v.lang.toLowerCase().startsWith('id')) &&
        (v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('online') ||
          v.name.toLowerCase().includes('google'))
    );

    // Priority 2: Any Indonesian voice
    const anyIndo =
      naturalIndo ||
      voices.find(
        (v) =>
          v.lang === 'id-ID' ||
          v.lang === 'id_ID' ||
          v.lang.toLowerCase().startsWith('id') ||
          v.name.toLowerCase().includes('indonesia')
      ) ||
      null;

    this.naturalIndonesianVoice = anyIndo;
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
   * Primary: Generate and play realistic AI Caster speech via Multi-Tier backend (Gemini -> Edge Neural -> Google).
   * If backend fails, transparently falls back to optimized browser speech.
   */
  public async playCasterCommentary(
    text: string,
    options: {
      mode?: 'full' | 'recap';
      onLoading?: () => void;
      onStart?: (isAiAudio: boolean, providerName?: string) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<void> {
    this.stop();

    const cleanText = this.cleanTextForCaster(text);
    if (!cleanText) return;

    const chosenMode = options.mode || 'full';
    const cacheKey = `${chosenMode}:${cleanText.slice(0, 140)}`;

    if (options.onLoading) options.onLoading();

    // 1. Check if audio is already cached in browser memory
    if (this.audioCache.has(cacheKey)) {
      const audioUrl = this.audioCache.get(cacheKey)!;
      await this.playBroadcastFanfare();
      this.playHtmlAudio(audioUrl, options, 'AI Caster (Tersimpan)');
      return;
    }

    // 2. Fetch Multi-Tier AI TTS audio from backend (Gemini -> Edge Neural -> Google)
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
          await this.playBroadcastFanfare();
          this.playHtmlAudio(data.audioUrl, options, data.providerName || 'AI Neural Caster');
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[Commentator Engine] Backend TTS unavailable, falling back to browser speech:', apiErr);
    }

    // 3. Fallback to Enhanced Browser Speech Synthesis
    await this.playBroadcastFanfare();
    this.playBrowserSpeechFallback(cleanText, options);
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

  private playBrowserSpeechFallback(
    text: string,
    options: {
      onStart?: (isAiAudio: boolean, providerName?: string) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (options.onError) options.onError(new Error('Browser tidak mendukung Speech Synthesis'));
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';

      if (!this.naturalIndonesianVoice) {
        this.initVoices();
      }
      if (this.naturalIndonesianVoice) {
        utterance.voice = this.naturalIndonesianVoice;
      }

      utterance.rate = 1.1;
      utterance.pitch = 1.05;

      utterance.onstart = () => {
        if (options.onStart) options.onStart(false, 'Suara Perangkat (Lokal)');
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (options.onError) options.onError(e);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      if (options.onError) options.onError(err);
    }
  }

  public pause(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public isPlaying(): boolean {
    if (this.currentAudioElement) {
      return !this.currentAudioElement.paused && !this.currentAudioElement.ended;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}

export const commentatorAudio = new CommentatorAudioManager();
