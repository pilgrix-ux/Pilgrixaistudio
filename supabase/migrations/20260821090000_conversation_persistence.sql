-- Durable conversation + creation history
create table if not exists public.conversations (
  id text not null,
  user_id text not null,
  title text not null,
  preview text not null default '',
  attachment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.conversation_messages (
  id text not null,
  conversation_id text not null,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now(),
  primary key (id, user_id),
  foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete cascade
);

create table if not exists public.image_creations (
  id text not null,
  user_id text not null,
  conversation_id text,
  prompt text not null default '',
  image_url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, user_id),
  foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete set null
);

create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists conversation_messages_user_conversation_idx on public.conversation_messages(user_id, conversation_id, created_at);
create index if not exists image_creations_user_created_idx on public.image_creations(user_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.image_creations enable row level security;

drop policy if exists "Users can read their conversations" on public.conversations;
create policy "Users can read their conversations" on public.conversations for select to authenticated using (user_id = auth.uid()::text);
drop policy if exists "Users can write their conversations" on public.conversations;
create policy "Users can write their conversations" on public.conversations for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users can read their messages" on public.conversation_messages;
create policy "Users can read their messages" on public.conversation_messages for select to authenticated using (user_id = auth.uid()::text);
drop policy if exists "Users can write their messages" on public.conversation_messages;
create policy "Users can write their messages" on public.conversation_messages for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users can read their image creations" on public.image_creations;
create policy "Users can read their image creations" on public.image_creations for select to authenticated using (user_id = auth.uid()::text);
drop policy if exists "Users can write their image creations" on public.image_creations;
create policy "Users can write their image creations" on public.image_creations for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

grant select, insert, update, delete on public.conversations to authenticated, service_role;
grant select, insert, update, delete on public.conversation_messages to authenticated, service_role;
grant select, insert, update, delete on public.image_creations to authenticated, service_role;
