create table if not exists public.edit_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  instruction text not null,
  state text not null check (state in ('queued','analyzing','checking','planning','processing','rendering','completed','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  source_media jsonb not null default '[]'::jsonb,
  reference_media jsonb not null default '[]'::jsonb,
  analysis jsonb,
  capability_report jsonb,
  edit_plan jsonb,
  output jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists edit_jobs_user_updated_idx on public.edit_jobs(user_id, updated_at desc);
create index if not exists edit_jobs_state_idx on public.edit_jobs(state, updated_at);

alter table public.edit_jobs enable row level security;

create policy "users can read own edit jobs"
  on public.edit_jobs for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.edit_jobs from anon, authenticated;
grant select on public.edit_jobs to authenticated;
grant all on public.edit_jobs to service_role;
