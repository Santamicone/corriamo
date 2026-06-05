-- Sistema messaggistica interna
-- Esegui in Supabase Dashboard → SQL Editor

create table public.messages (
  id           uuid        default uuid_generate_v4() primary key,
  run_id       uuid        references public.runs(id) on delete set null,
  sender_id    uuid        references public.profiles(id) on delete cascade not null,
  recipient_id uuid        references public.profiles(id) on delete cascade not null,
  body         text        not null check (char_length(body) > 0),
  read_at      timestamptz default null,
  created_at   timestamptz default now()
);

alter table public.messages enable row level security;

-- Visibili solo a mittente e destinatario
create policy "Messages visible to participants"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Solo il mittente può inserire
create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Solo il destinatario può aggiornare (per marcare come letto)
create policy "Recipient can mark messages as read"
  on public.messages for update
  using (auth.uid() = recipient_id);

-- Indici per performance
create index messages_sender_idx    on public.messages(sender_id);
create index messages_recipient_idx on public.messages(recipient_id);
create index messages_run_idx       on public.messages(run_id);
create index messages_created_idx   on public.messages(created_at desc);
