# External service slots

Pilgrix keeps external services behind server-side adapters. Real credentials are intentionally not included.

| Capability | Environment slot | Adapter location | Required now |
|---|---|---|---|
| Auth / OAuth | `AUTH_*`, provider credentials | `server/providers/auth/` | Later |
| Database / storage | `SUPABASE_*` / `MEDIA_STORAGE_PROVIDER` | `server/providers/storage/` | Later |
| Video understanding | `VISION_*`, `GEMINI_API_KEY` | `server/providers/vision/` | Later |
| Structured reasoning | `REASONING_*`, `OPENAI_API_KEY` | `server/providers/reasoning/` | Later |
| Media models | `MEDIA_MODELS_*`, `FAL_KEY` | `server/providers/media-models/` | Later |
| Speech / transcription | `SPEECH_*` | `server/providers/speech/` | Later |
| Search / trend research | `WEB_SEARCH_*` | `server/providers/search/` | Later |
| Rendering workers | `RENDER_WORKER_*`, FFmpeg paths | `server/providers/render/` | Later |
| Background queue | `QUEUE_*`, `REDIS_URL` | `server/providers/queue/` | Later |
| CDN / signed delivery | `CDN_*` | `server/providers/cdn/` | Later |
| Billing | `STRIPE_*` | `server/providers/billing/` | Later |
| Email | `EMAIL_*` | `server/providers/email/` | Later |
| SMS / phone verification | `SMS_*` | `server/providers/sms/` | Later |
| Error tracking | `ERROR_TRACKING_*` | `server/providers/errors/` | Later |
| Logs | `LOG_*` | `server/providers/logging/` | Later |
| Analytics | `ANALYTICS_*` | `server/providers/analytics/` | Optional |
| Support | `SUPPORT_*` | `server/providers/support/` | Optional |

## Rules

1. No provider secret may be imported by browser code.
2. The UI talks to Pilgrix APIs, never directly to providers.
3. Each provider has a small adapter interface so it can be replaced.
4. Missing configuration must produce an explicit `provider_not_configured` state; never fake completion.
5. Runtime product settings remain separate from secrets.
6. Real credentials are supplied later through deployment environment/secret management.
