<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ba19a5c7-e267-4a21-ac70-dc0c29ee567c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Copy `.env.example` to `.env.local` and set `VITE_OPENROUTER_API_KEY`
   if you want an OpenRouter free-tier backup on top of the default Puter.js
   integration. No key is required to run the app — AI features work out of
   the box via Puter.js, with a local heuristic fallback if that's ever
   unavailable. See `src/services/aiClient.ts` for details.
3. Run the app:
   `npm run dev`
