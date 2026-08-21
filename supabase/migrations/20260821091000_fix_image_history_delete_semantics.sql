-- Image history is intentionally independent from conversation deletion.
alter table public.image_creations
  drop constraint if exists image_creations_conversation_id_user_id_fkey;

create index if not exists image_creations_user_conversation_idx
  on public.image_creations(user_id, conversation_id, created_at desc);
