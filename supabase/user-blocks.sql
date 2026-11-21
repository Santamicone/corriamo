-- Blocco utenti per l'app mobile — SQL #42
--
-- ADDITIVO: una tabella nuova con RLS. Non modifica nulla di esistente.
-- Rollback: supabase/user-blocks-rollback.sql
--
-- Chi blocca un utente non vede più le sue corse, i suoi messaggi e le sue
-- notifiche nell'app. Il filtro è applicato dall'app (non dalle policy delle
-- altre tabelle): l'utente bloccato può ancora, ad esempio, chiedere di
-- partecipare alle corse di chi l'ha bloccato.

create table if not exists public.user_blocks (
  blocker_id uuid        not null references public.profiles(id) on delete cascade,
  blocked_id uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

-- Ognuno vede, crea e toglie solo i PROPRI blocchi (chi è stato bloccato non lo vede)
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete using (auth.uid() = blocker_id);
