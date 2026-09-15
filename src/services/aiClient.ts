/**
 * Client-side AI provider chain for Laga Amal Pantos.
 *
 * Replaces the old server-side Gemini integration. Everything here runs
 * in the browser:
 *
 *   1. Puter.js  — https://js.puter.com/v2/ — "AI without API keys".
 *      Loaded lazily on first use. No secrets, no server env vars.
 *   2. OpenRouter free-tier models — used only if the user has configured
 *      VITE_OPENROUTER_API_KEY (OpenRouter still requires a key, even for
 *      its free models, so this is an *optional* secondary backup, not a
 *      no-key option). Skipped entirely if no key is set.
 *   3. Heuristic generators (utils/matchAnalysis.ts, utils/julukan.ts) —
 *      always available, zero network calls, guarantees the UI never
 *      shows nothing.
 *
 * A simple client-side rate limiter sits in front of steps 1–2 so a burst
 * of clicks (e.g. "Generate ulang" mashed repeatedly, or an admin re-running
 * analysis on every match at once) can't hammer either provider.
 */

import { Match, Player } from '../types';
import { generateHeuristicMatchAnalysis } from '../utils/matchAnalysis';
import { generateHeuristicPlayerJulukan } from '../utils/julukan';

// ----------------------------------------------------------------------
// Rate limiter
// ----------------------------------------------------------------------
// Persisted in localStorage so limits survive reloads, but scoped to this
// browser only (matches the rest of the app's localStorage-cache pattern).

const RATE_LIMIT_KEY = 'pantos_ai_rate_limit_v1';
const MIN_INTERVAL_MS = 4_000; // at most one AI request every 4 seconds
const MAX_PER_DAY = 60; // generous ceiling per browser per day
const DAY_MS = 24 * 60 * 60 * 1000;

interface RateLimitState {
  lastCallAt: number;
  windowStart: number;
  countInWindow: number;
}

function readRateLimitState(): RateLimitState {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.lastCallAt === 'number' &&
        typeof parsed.windowStart === 'number' &&
        typeof parsed.countInWindow === 'number'
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt state, fall through to fresh state
  }
  return { lastCallAt: 0, windowStart: Date.now(), countInWindow: 0 };
}

function writeRateLimitState(state: RateLimitState) {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // best effort — localStorage may be unavailable (private mode, quota)
  }
}

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Throws RateLimitError if the caller should back off. Otherwise records
 * this call and lets it through. Call this ONCE per logical AI request
 * (not once per provider attempt inside the fallback chain).
 */
function checkAndRecordRateLimit(): void {
  const now = Date.now();
  let state = readRateLimitState();

  // Reset the daily window if it's stale
  if (now - state.windowStart > DAY_MS) {
    state = { lastCallAt: 0, windowStart: now, countInWindow: 0 };
  }

  const sinceLastCall = now - state.lastCallAt;
  if (state.lastCallAt > 0 && sinceLastCall < MIN_INTERVAL_MS) {
    throw new RateLimitError(
      'Tunggu sebentar sebelum meminta analisis AI lagi.',
      MIN_INTERVAL_MS - sinceLastCall
    );
  }

  if (state.countInWindow >= MAX_PER_DAY) {
    const retryAfterMs = state.windowStart + DAY_MS - now;
    throw new RateLimitError(
      'Batas permintaan AI harian untuk browser ini sudah tercapai.',
      Math.max(retryAfterMs, 0)
    );
  }

  state.lastCallAt = now;
  state.countInWindow += 1;
  writeRateLimitState(state);
}

// ----------------------------------------------------------------------
// Puter.js loader
// ----------------------------------------------------------------------

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          prompt: string,
          options?: {
            model?: string;
            temperature?: number;
            max_tokens?: number;
          }
        ) => Promise<any>;
      };
    };
  }
}

let puterLoadPromise: Promise<void> | null = null;

function loadPuterScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Puter.js hanya berjalan di browser'));
  }
  if (window.puter) {
    return Promise.resolve();
  }
  if (puterLoadPromise) {
    return puterLoadPromise;
  }

  puterLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-puter-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Puter.js')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.dataset.puterJs = 'true';
    script.onload = () => {
      if (window.puter) {
        resolve();
      } else {
        reject(new Error('Puter.js dimuat tapi window.puter tidak tersedia'));
      }
    };
    script.onerror = () => reject(new Error('Gagal memuat script Puter.js'));
    document.head.appendChild(script);
  });

  return puterLoadPromise;
}

function extractPuterText(response: any): string {
  if (!response) return '';
  if (typeof response === 'string') return response;
  // puter.ai.chat can return { message: { content: '...' } } or a string
  // depending on model/version — handle both shapes defensively.
  if (typeof response.message?.content === 'string') return response.message.content;
  if (Array.isArray(response.message?.content)) {
    return response.message.content.map((c: any) => c?.text || '').join('');
  }
  if (typeof response.text === 'string') return response.text;
  return '';
}

async function callPuter(fullPrompt: string, maxTokens: number): Promise<string> {
  await loadPuterScript();
  if (!window.puter) {
    throw new Error('Puter.js tidak tersedia setelah dimuat');
  }
  const response = await window.puter.ai.chat(fullPrompt, {
    model: 'gpt-4o-mini',
    temperature: 0.8,
    max_tokens: maxTokens,
  });
  const text = extractPuterText(response).trim();
  if (!text) {
    throw new Error('Puter.js mengembalikan respons kosong');
  }
  return text;
}

// ----------------------------------------------------------------------
// OpenRouter free-tier fallback (optional — needs a key)
// ----------------------------------------------------------------------

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
];

function getOpenRouterKey(): string | undefined {
  try {
    // Vite exposes env vars prefixed with VITE_ on import.meta.env
    return (import.meta as any)?.env?.VITE_OPENROUTER_API_KEY || undefined;
  } catch {
    return undefined;
  }
}

async function callOpenRouter(
  systemInstruction: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error('OpenRouter tidak dikonfigurasi (VITE_OPENROUTER_API_KEY kosong)');
  }

  let lastErr: any;
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        lastErr = new Error(`OpenRouter ${model} gagal dengan status ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      lastErr = new Error(`OpenRouter ${model} mengembalikan respons kosong`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Semua model gratis OpenRouter gagal');
}

// ----------------------------------------------------------------------
// Public API — match analysis
// ----------------------------------------------------------------------

function buildMatchPrompt(match: Match): { system: string; user: string } {
  const winnerTeam = match.winner;
  const loserTeam = winnerTeam === 'Tim Pohon' ? 'Tim Lobby' : 'Tim Pohon';

  const winnerPlayers = (winnerTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal} - Skor ${p.score || '-'})`)
    .join(', ');

  const loserPlayers = (loserTeam === 'Tim Pohon' ? match.pohon : match.lobby)
    .map((p) => `${p.player_name} (${p.hero_name}/${p.medal} - Skor ${p.score || '-'})`)
    .join(', ');

  const user = `Match ${match.date}. ${winnerTeam} Menang. Tim Pemenang: ${winnerPlayers}. Tim Kalah (${loserTeam}): ${loserPlayers}.`;

  const system =
    'Kamu adalah komentator e-sport Mobile Legends yang sarkastik, jenaka, namun analitis khas tongkrongan gamer Pantos. ' +
    'Tugasmu menganalisis hasil pertandingan antara Tim Pohon dan Tim Lobby. ' +
    'Bahas siapa pemain kunci/MVP yang tampil gemilang, siapa yang "makan Coklat" (jadi semen / beban tim), ' +
    'serta dinamika hero yang dipakai. ' +
    'Gunakan istilah khas MLBB (laning, teamfight, blunder, lord, rotasi, kena culik, solo kill). ' +
    'Tulis dalam 2-3 paragraf ringkas, kocak tapi berbobot dalam bahasa Indonesia santai.';

  return { system, user };
}

export interface AiGenerationResult {
  text: string;
  source: 'puter' | 'openrouter' | 'heuristic';
  rateLimited?: boolean;
}

/**
 * Generates match commentary client-side, trying Puter.js first, then the
 * optional OpenRouter free-tier backup, then falling back to the local
 * heuristic generator. Never throws — always resolves with usable text.
 */
export async function generateMatchAnalysisClient(match: Match): Promise<AiGenerationResult> {
  const { system, user } = buildMatchPrompt(match);

  try {
    checkAndRecordRateLimit();
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.info('[AI] Rate limited, using heuristic analysis:', err.message);
      return { text: generateHeuristicMatchAnalysis(match), source: 'heuristic', rateLimited: true };
    }
    throw err;
  }

  try {
    const text = await callPuter(`${system}\n\n${user}`, 1024);
    return { text, source: 'puter' };
  } catch (puterErr) {
    console.info('[AI] Puter.js gagal untuk analisis pertandingan, mencoba OpenRouter:', puterErr);
  }

  try {
    const text = await callOpenRouter(system, user, 1024);
    return { text, source: 'openrouter' };
  } catch (openRouterErr) {
    console.info('[AI] OpenRouter fallback gagal juga, memakai heuristik:', openRouterErr);
  }

  return { text: generateHeuristicMatchAnalysis(match), source: 'heuristic' };
}

// ----------------------------------------------------------------------
// Public API — player julukan
// ----------------------------------------------------------------------

interface SeasonPlayerStatLike {
  mvp?: number;
  coklat?: number;
  antam?: number;
  silver?: number;
  winRate?: number;
  avgScore?: number;
}

function buildJulukanPrompt(
  player: Player,
  seasonStat?: SeasonPlayerStatLike,
  topHeroes: string[] = []
): string {
  const mvp = seasonStat ? seasonStat.mvp : player.medals.MVP;
  const antam = seasonStat ? seasonStat.antam : player.medals.Gold;
  const silver = seasonStat ? seasonStat.silver : player.medals.Silver;
  const coklat = seasonStat ? seasonStat.coklat : player.medals.Coklat;
  const winRate = seasonStat ? seasonStat.winRate : player.winRate || 50;
  const avgScore = seasonStat ? seasonStat.avgScore : player.avgScore || 7.5;
  const tier = player.tier || 'Legend';
  const status = player.status || 'Aktif';

  return `
Buatlah 1 (satu) JULUKAN / GELAR PANTOS (hanya 2 sampai 5 kata, tanpa tanda kutip, tanpa penjelasan tambahan) yang kocak, bernuansa meme Mobile Legends / e-sport komunitas santai "Laga Amal Pantos" untuk pemain:
Nama: "${player.name}"
Tier: ${tier} (Status: ${status})
MVP: ${mvp} kali
Antam (Gold): ${antam} kali
Silver: ${silver} kali
Coklat (Beban/Feeder): ${coklat} kali
Win Rate: ${winRate}%
Rata-rata Skor: ${avgScore}
Hero Favorit: ${topHeroes.join(', ') || 'Fleksibel'}

Panduan julukan:
- Bahasa Indonesia santai khas tongkrongan gamer MLBB (istilah: penggendong, tulang punggung, semen, feeder, lord, mekanik, sedekah bintang, penunggu lobby, preman lane).
- Jika banyak MVP: beri julukan dewa carry / tulang punggung retak.
- Jika banyak Coklat: julukan jenaka donatur poin / pelindung kelas semen / sedekah bintang.
- Jika seimbang/solid: julukan spesialis pendamping / pilar rahasia / anti-tumbang.
- Kembalikan HANYA teks julukannya saja. Contoh output: "Sang Penggendong Patah Tulang" atau "Duta Coklat Kelas Semen" atau "Preman Goldlane Anti Tumbang".
`;
}

function cleanJulukanText(raw: string): string {
  let cleaned = raw.trim().replace(/^["']|["']$/g, '').replace(/^[-*•]\s*/, '');
  if (cleaned.length > 50) cleaned = cleaned.slice(0, 50);
  return cleaned;
}

const JULUKAN_SYSTEM =
  'Kamu adalah generator julukan lucu untuk komunitas gamer Mobile Legends "Laga Amal Pantos". Jawab hanya dengan julukannya, tanpa embel-embel.';

/**
 * Generates a player nickname/title client-side, same provider chain as
 * generateMatchAnalysisClient. Never throws.
 */
export async function generatePlayerJulukanClient(
  player: Player,
  seasonStat?: SeasonPlayerStatLike,
  topHeroes: string[] = []
): Promise<AiGenerationResult> {
  const prompt = buildJulukanPrompt(player, seasonStat, topHeroes);

  try {
    checkAndRecordRateLimit();
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.info('[AI] Rate limited, using heuristic julukan:', err.message);
      return {
        text: generateHeuristicPlayerJulukan(player, seasonStat, topHeroes),
        source: 'heuristic',
        rateLimited: true,
      };
    }
    throw err;
  }

  try {
    const text = await callPuter(prompt, 100);
    return { text: cleanJulukanText(text), source: 'puter' };
  } catch (puterErr) {
    console.info('[AI] Puter.js gagal untuk julukan, mencoba OpenRouter:', puterErr);
  }

  try {
    const text = await callOpenRouter(JULUKAN_SYSTEM, prompt, 100);
    return { text: cleanJulukanText(text), source: 'openrouter' };
  } catch (openRouterErr) {
    console.info('[AI] OpenRouter fallback gagal juga, memakai heuristik:', openRouterErr);
  }

  return { text: generateHeuristicPlayerJulukan(player, seasonStat, topHeroes), source: 'heuristic' };
}
