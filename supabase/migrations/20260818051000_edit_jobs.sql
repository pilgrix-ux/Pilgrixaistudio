create table if not exists public.edit_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  instruction text not null,
  state text not null check (state in ('queued','analyzing','checking','planning','processing','rendering','completed','failed')),
  progress smallint not null default 0 check (progress between 0 and 100),
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

create index if not exists edit_jobs_user_updated_idx on public.edit_jobs (user_id, updated_at desc);
create index if not exists edit_jobs_state_idx on public.edit_jobs (state);

alter table public.edit_jobs enable row level security;

create policy "users can read their own edit jobs"
  on public.edit_jobs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can create their own edit jobs"
  on public.edit_jobs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own edit jobs"
  on public.edit_jobs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_edit_job_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists edit_jobs_updated_at on public.edit_jobs;
create trigger edit_jobs_updated_at
before update on public.edit_jobs
for each row execute function public.set_edit_job_updated_at();
