create table if not exists public.user_video_usage (
  user_id uuid not null primary key,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  video_count integer not null default 0 check (video_count >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.processed_video_requests (
  request_id text primary key, user_id uuid not null, video_count integer not null, created_at timestamptz not null default now()
);
create index if not exists idx_user_video_usage_plan on public.user_video_usage (plan, user_id);
alter table public.user_video_usage enable row level security;
alter table public.processed_video_requests enable row level security;

create or replace function public.get_video_usage(p_user_id uuid, p_allowed_limit integer default 3)
returns table (user_id uuid, video_count integer, remaining integer, limit_value integer)
language sql security definer set search_path = public as $$
select p_user_id, coalesce(u.video_count,0), greatest(p_allowed_limit-coalesce(u.video_count,0),0), p_allowed_limit from public.user_video_usage u where u.user_id=p_user_id
union all select p_user_id,0,p_allowed_limit,p_allowed_limit where not exists(select 1 from public.user_video_usage where user_id=p_user_id);
$$;

create or replace function public.consume_video_once(p_user_id uuid, p_request_id text, p_allowed_limit integer default 3)
returns table (user_id uuid, video_count integer, remaining integer, limit_value integer, allowed boolean, idempotent boolean)
language plpgsql security definer set search_path = public as $$
declare current_usage integer; existing_count integer;
begin
  if p_request_id is not null then select p.video_count into existing_count from public.processed_video_requests p where p.request_id=p_request_id and p.user_id=p_user_id; if found then return query select p_user_id, existing_count, greatest(p_allowed_limit-existing_count,0), p_allowed_limit, true, true; return; end if; end if;
  insert into public.user_video_usage(user_id,plan,video_count) values(p_user_id,'free',0) on conflict(user_id) do nothing;
  select video_count into current_usage from public.user_video_usage where user_id=p_user_id for update;
  if current_usage >= p_allowed_limit then return query select p_user_id,current_usage,0,p_allowed_limit,false,false; return; end if;
  update public.user_video_usage set video_count=current_usage+1,updated_at=now() where user_id=p_user_id and plan='free';
  if p_request_id is not null then insert into public.processed_video_requests(request_id,user_id,video_count) values(p_request_id,p_user_id,current_usage+1) on conflict(request_id) do nothing; end if;
  return query select p_user_id,current_usage+1,greatest(p_allowed_limit-current_usage-1,0),p_allowed_limit,true,false;
end;
$$;

revoke all on public.user_video_usage from anon, authenticated;
revoke all on public.processed_video_requests from anon, authenticated;
comment on table public.user_video_usage is 'Server-authoritative free-video consumption.';
comment on table public.processed_video_requests is 'Server-side idempotency keys preventing duplicate free-video consumption.';
