create table if not exists public.runtime_config (
  key text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now(),
  constraint runtime_config_key_format check (key ~ '^[a-z0-9][a-z0-9_-]{0,63}$')
);

alter table public.runtime_config enable row level security;

-- Runtime configuration is read and written only by the trusted server using
-- the Supabase service role. No browser role should be able to mutate it.
revoke all on table public.runtime_config from anon, authenticated;

grant select, insert, update, delete on table public.runtime_config to service_role;

create index if not exists runtime_config_updated_at_idx
  on public.runtime_config (updated_at desc);
