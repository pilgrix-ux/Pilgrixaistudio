create table if not exists public.user_video_usage (
  user_id uuid not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  video_count integer not null default 0 check (video_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table if not exists public.free_trial_risk_signals (
  signal_key text not null,
  signal_type text not null check (signal_type in ('device', 'network', 'account')),
  user_ids text[] not null default '{}',
  deleted_user_ids text[] not null default '{}',
  consumed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (signal_key)
);

create index if not exists idx_user_video_usage_plan
  on public.user_video_usage (plan, user_id);

create index if not exists idx_free_trial_risk_signal_type
  on public.free_trial_risk_signals (signal_type, signal_key);

alter table public.user_video_usage enable row level security;
alter table public.free_trial_risk_signals enable row level security;

create policy if not exists "Users can read their own usage"
  on public.user_video_usage
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own usage row"
  on public.user_video_usage
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own usage"
  on public.user_video_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can read their own risk signals"
  on public.free_trial_risk_signals
  for select
  using (auth.uid()::text = any (user_ids));

create policy if not exists "Backend may upsert risk signals"
  on public.free_trial_risk_signals
  for insert
  with check (true);

create policy if not exists "Backend may update risk signals"
  on public.free_trial_risk_signals
  for update
  using (true)
  with check (true);

create or replace function public.increment_video_usage(p_user_id uuid, p_allowed_limit integer default 3)
returns table (
  user_id uuid,
  video_count integer,
  remaining integer,
  limit_value integer,
  allowed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_usage integer;
begin
  insert into public.user_video_usage (user_id, plan, video_count, created_at, updated_at)
  values (p_user_id, 'free', 0, now(), now())
  on conflict (user_id) do nothing;

  select coalesce(video_count, 0)
    into current_usage
  from public.user_video_usage
  where user_id = p_user_id
  for update;

  if current_usage >= p_allowed_limit then
    return query
      select p_user_id, current_usage, greatest(p_allowed_limit - current_usage, 0), p_allowed_limit, false;
    return;
  end if;

  update public.user_video_usage
  set video_count = current_usage + 1,
      updated_at = now()
  where user_id = p_user_id
    and plan = 'free';

  return query
    select p_user_id, current_usage + 1, greatest(p_allowed_limit - (current_usage + 1), 0), p_allowed_limit, true;
end;
$$;

comment on table public.user_video_usage is 'Tracks per-user video-processing usage for the free-tier entitlement system. Paid plans must never increment this counter.';
comment on table public.free_trial_risk_signals is 'Minimal privacy-conscious record used to flag repeated account creation or suspicious device/network reuse that would reset a free trial.';
comment on function public.increment_video_usage is 'Atomic free-trial allowance check that ensures a user cannot consume the ending slot more than once.';
