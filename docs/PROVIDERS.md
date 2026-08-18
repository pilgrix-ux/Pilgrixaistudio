# Pilgrix provider integration checklist

The application is designed so external providers can be connected later without changing the client UI.

## Add credentials only in deployment secrets

Use `.env.example` as the checklist. Never commit real API keys.

- Supabase: storage, database, authenticated job persistence
- Gemini: video/visual understanding
- OpenAI: structured reasoning and edit planning
- Fal: specialist media models
- Speech provider: transcription when configured
- Stripe: billing and subscription webhooks

## Integration rule

Each provider must be called from server-side workers/routes only. Client code receives normalized Pilgrix data, never provider credentials or provider-specific secrets.

## Missing provider behavior

If a provider is not configured, the server should return a clear `provider_not_configured` state and keep the job resumable. It must never claim that analysis, editing, or rendering completed when the required provider is unavailable.

## Planned worker flow

`upload -> persistent job -> analysis adapters -> capability check -> structured edit plan -> media operation adapters -> FFmpeg/render worker -> stored MP4 -> chat preview`

Adapters should expose stable Pilgrix interfaces so providers can be swapped later without rewriting the UI or job model.
