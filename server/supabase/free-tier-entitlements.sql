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

create index if not exists idx_user_video_usage_plan on public.user_video_usage (plan, user_id);
create index if not exists idx_free_trial_risk_signal_type on public.free_trial_risk_signals (signal_type, signal_key);
alter table public.user_video_usage enable row level security;
alter table public.free_trial_risk_signals enable row level security;

create or replace function public.get_video_usage(p_user_id uuid, p_allowed_limit integer default 3)
returns table (user_id uuid, video_count integer, remaining integer, limit_value integer)
language sql security definer set search_path = public as $$
  select p_user_id, coalesce(u.video_count, 0), greatest(p_allowed_limit - coalesce(u.video_count, 0), 0), p_allowed_limit
  from (select p_user_id as user_id) ids left join public.user_video_usage u on u.user_id = ids.user_id;
$$;

create or replace function public.increment_video_usage(p_user_id uuid, p_allowed_limit integer default 3)
returns table (user_id uuid, video_count integer, remaining integer, limit_value integer, allowed boolean)
language plpgsql security definer set search_path = public as $$
declare current_usage integer;
begin
  insert into public.user_video_usage (user_id, plan, video_count, created_at, updated_at)
  values (p_user_id, 'free', 0, now(), now()) on conflict (user_id) do nothing;
  select coalesce(video_count, 0) into current_usage from public.user_video_usage where user_id = p_user_id for update;
  if current_usage >= p_allowed_limit then return query select p_user_id, current_usage, greatest(p_allowed_limit - current_usage, 0), p_allowed_limit, false; return; end if;
  update public.user_video_usage set video_count = current_usage + 1, updated_at = now() where user_id = p_user_id and plan = 'free';
  return query select p_user_id, current_usage + 1, greatest(p_allowed_limit - current_usage - 1, 0), p_allowed_limit, true;
end;
$$;

revoke all on public.user_video_usage from anon, authenticated;
revoke all on public.free_trial_risk_signals from anon, authenticated;
comment on table public.user_video_usage is 'Server-authoritative per-user video-processing usage for the free tier.';
comment on function public.get_video_usage is 'Server-side read of the authoritative free-video counter.';
comment on function public.increment_video_usage is 'Atomic server-side free-trial allowance check and consumption.';
