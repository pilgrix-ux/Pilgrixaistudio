# Conversation persistence

Pilgrix now uses an offline-first conversation persistence layer.

## Data flow

1. The UI writes to the existing local cache immediately, so closing the app does not lose the current conversation.
2. `conversationPersistence.ts` listens for chat changes and syncs them to `/api/conversations` in the background.
3. The Vercel API authenticates the Supabase access token before reading or writing data.
4. Conversations and messages are stored in Supabase and are scoped by the authenticated user's id.
5. On refresh/login, the server copy is hydrated into the local cache and pending local changes are replayed.
6. When offline, local data remains available and sync retries when the browser comes back online and every 15 seconds.
7. Image creations have a separate `image_creations` table and can be linked to a conversation with `saveImageCreation()`.

## Server environment

The API route needs the same Supabase server credentials used by the existing backend:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL` / `SUPABASE_JWT_SECRET` as required by `server/auth.mjs`

Never put the secret/service key in `VITE_*` variables or browser code. Supabase's secret/service keys bypass RLS and must stay server-side.

## Database

Apply the migrations under `supabase/migrations/` to the connected Supabase project. The tables are protected by RLS for direct authenticated access, while the server API performs an explicit JWT identity check before using its server-side key.
