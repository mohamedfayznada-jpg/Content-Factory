# AI setup for Content Factory

## What is implemented now
- The Content Studio calls the server-side `/api/generate` endpoint.
- The endpoint uses the Google Gemini Developer API for text generation (posts, ideas, plans, short-form video scripts).
- API credentials are read only from server-side environment variables. They are not included in browser code.
- Provider errors and rate limits are surfaced in the UI instead of silently generating fake AI output.

## Enable text generation
1. Create or copy an API key from Google AI Studio: https://aistudio.google.com/apikey
2. Open the Vercel project settings for Content Factory.
3. Go to Settings → Environment Variables.
4. Add `GEMINI_API_KEY` with the key value for Preview and Production.
5. Optionally add `GEMINI_MODEL` (default: `gemini-2.5-flash`; choose a model enabled for your account and current API tier).
6. Redeploy the project after saving environment variables.

Do not paste API keys into GitHub, HTML, client-side JavaScript, issues, or chat messages. Keep the key in Vercel's environment settings.

## Free tier and capability limits
Google's API free tier has model-specific quotas, eligibility, and rate limits that can change. Review the current official pricing/availability page: https://ai.google.dev/gemini-api/docs/pricing

This first integration generates text only. A text model can write prompts and production plans, but it does not automatically generate image/audio/video files. Those need separate media endpoints/models, asynchronous job handling, storage, and usage/quota checks. Do not describe image, audio, or video generation as enabled until those integrations are implemented and tested. Some video and image models may require paid usage.

## Planned media adapters
- Image generation/editing: separate provider adapter and asset storage.
- Text-to-speech: separate speech endpoint returning audio bytes or a file URL.
- Video generation: asynchronous jobs with progress polling and persistent output storage.
- Optional local/open-weight providers: only where hosting, hardware, licensing, latency, and quotas are acceptable.

## Production hardening before public launch
- Add authentication and per-user quotas before exposing generation publicly.
- Add request-size limits, rate limiting, abuse prevention, logging without secrets, and cancellation/timeouts.
- Store generated assets and drafts in persistent storage.
- Verify API terms and data-use settings before sending private client content.
