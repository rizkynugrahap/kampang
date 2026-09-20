/**
 * Second AI provider used when Gemini is rate-limited or unavailable, so
 * "Generate Julukan" and match-analysis generation keep producing real
 * AI text instead of dropping straight to the static heuristic the moment
 * Gemini's free quota runs out.
 *
 * Puter.js (https://developer.puter.com) gives free access to many AI
 * models (GPT, Claude, Gemini, and more) under a "user-pays" model — no
 * API key billed to this app. Used from Node it still needs one thing:
 * a PUTER_AUTH_TOKEN environment variable, generated once at
 * https://puter.com/dashboard#account ("Create token") from a free Puter
 * account. Without that token set, every call here is a harmless no-op —
 * callers fall through to their existing heuristic fallback exactly like
 * before this file existed.
 *
 * Puter.js's Node runtime officially targets Node.js 24+. If the server
 * is running on an older Node version this import may fail at call time;
 * that failure is caught below and treated the same as "unavailable" —
 * it never breaks match saving or julukan generation.
 */

let puterClientPromise: Promise<any | null> | null = null;

function getPuterClient(): Promise<any | null> {
  if (puterClientPromise) return puterClientPromise;

  const token = process.env.PUTER_AUTH_TOKEN;
  if (!token) {
    puterClientPromise = Promise.resolve(null);
    return puterClientPromise;
  }

  puterClientPromise = import('@heyputer/puter.js/src/init.cjs')
    .then((mod: any) => {
      const init = mod.init || mod.default?.init;
      if (typeof init !== 'function') return null;
      return init(token);
    })
    .catch((err) => {
      console.warn('[Puter.js] Failed to initialize client:', err?.message || err);
      return null;
    });

  return puterClientPromise;
}

/**
 * Asks Puter.js's AI chat for a plain-text completion. Returns null (never
 * throws) whenever Puter isn't configured or the call fails, so callers can
 * simply do: `(await generateTextViaPuter(...)) ?? heuristicFallback()`.
 */
export async function generateTextViaPuter(
  promptText: string,
  systemInstruction?: string,
  model?: string
): Promise<string | null> {
  try {
    const puter = await getPuterClient();
    if (!puter) return null;

    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${promptText}` : promptText;
    const response = await puter.ai.chat(fullPrompt, model ? { model } : undefined);

    const text =
      typeof response === 'string'
        ? response
        : response?.message?.content?.toString?.() ?? response?.toString?.() ?? '';

    return text && text.trim() ? text.trim() : null;
  } catch (err: any) {
    console.warn('[Puter.js] AI fallback call failed:', err?.message || err);
    return null;
  }
}
