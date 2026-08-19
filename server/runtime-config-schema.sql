create table if not exists public.runtime_config (
  key text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.runtime_config (key, config)
values ('global', '{}'::jsonb)
on conflict (key) do nothing;

alter table public.runtime_config enable row level security;

-- No public policies are created intentionally. Runtime configuration is read/written
-- by the trusted server using SUPABASE_SERVICE_ROLE_KEY. Never expose that key to the client.
