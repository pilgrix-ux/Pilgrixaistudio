# Pilgrix runtime configuration

Pilgrix now separates product configuration from the application bundle. Changes to approved runtime configuration do **not** require rebuilding the frontend.

## What can change at runtime

- App name and copy
- AI Lab headings, welcome text and composer placeholder
- Starter prompts
- Visible AI tools
- Bottom navigation labels and enabled/disabled destinations
- Theme colors
- Feature flags
- Plan labels
- Free edit allowance
- Plan storage and edit-capacity values used by the product configuration layer

## Storage

Runtime configuration is persisted in Supabase in `public.runtime_config` as JSONB. Run `server/runtime-config-schema.sql` once in the Supabase SQL editor.

When Supabase is not configured, the server uses safe defaults and the app remains functional in development.

## Security

The browser can read `GET /api/runtime-config` because it contains product configuration only. It never receives provider secrets.

Changes use `PATCH /api/runtime-config` and require an authenticated user whose Supabase `app_metadata.role`/`user_role` is `admin`, or whose user ID appears in the server-only `RUNTIME_CONFIG_ADMIN_USER_IDS` environment variable.

The Supabase service-role key stays server-side.

## Changing configuration

An administrator can patch configuration through the protected API. Example body:

```json
{
  "patch": {
    "theme": { "blue": "#2457D6" },
    "aiLab": { "composerPlaceholder": "Drop your footage and tell Pilgrix what to make..." },
    "features": { "trendResearch": true }
  }
}
```

The frontend fetches runtime configuration on load. The server also reads the runtime free-edit allowance for entitlement checks, so changing the free limit does not require a frontend rebuild or a server restart.

## Important boundary

Runtime configuration is for **product behavior and presentation**, not secrets or arbitrary code. Provider keys, authentication secrets, signing keys, database credentials and other sensitive values remain environment/server secrets.

## Deployment verification

Production deployments should be verified from the latest `main` commit before being treated as live. Failed historical deployments are retained for diagnosis and rollback rather than deleted.
