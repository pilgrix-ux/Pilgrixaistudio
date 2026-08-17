create table if not exists public.server_security_state (
  state_key text primary key,
  state_value jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_server_security_state_expires_at
  on public.server_security_state (expires_at);

alter table public.server_security_state enable row level security;

create or replace function public.server_security_state_upsert(
  p_state_key text,
  p_state_value jsonb,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.server_security_state (state_key, state_value, expires_at, updated_at)
  values (p_state_key, p_state_value, p_expires_at, now())
  on conflict (state_key) do update
    set state_value = excluded.state_value,
        expires_at = excluded.expires_at,
        updated_at = now();
end;
$$;

create or replace function public.server_security_state_delete(p_state_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.server_security_state where state_key = p_state_key;
end;
$$;

comment on table public.server_security_state is 'Server-only persistent security state for OTP, abuse signals, and rate limiting. Never expose this table to browser clients.';
revoke all on public.server_security_state from anon, authenticated;
