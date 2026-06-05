-- Sistema notifiche in-app
-- Esegui in Supabase Dashboard → SQL Editor

-- ═══════════════════════════════════
-- TABELLA
-- ═══════════════════════════════════
create table public.notifications (
  id         uuid        default uuid_generate_v4() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  type       text        not null,          -- vedi tipi sotto
  title      text        not null,
  body       text,
  run_id     uuid        references public.runs(id) on delete cascade,
  actor_id   uuid        references public.profiles(id) on delete set null,
  read       boolean     default false,
  show_after timestamptz default now(),     -- per i promemoria: mostra solo da questa data
  created_at timestamptz default now()
);

-- Tipi validi:
-- 'nuova_richiesta'      → organizzatore: qualcuno vuole partecipare
-- 'richiesta_approvata'  → partecipante: iscrizione confermata
-- 'richiesta_rifiutata'  → partecipante: iscrizione non accettata
-- 'nuovo_messaggio'      → destinatario: nuovo messaggio ricevuto
-- 'promemoria_corsa'     → partecipante: corsa domani (show_after = run_datetime - 24h)
-- 'corsa_annullata'      → partecipanti approvati: corsa cancellata

create index notifications_user_idx       on public.notifications(user_id);
create index notifications_show_after_idx on public.notifications(user_id, show_after);
create index notifications_read_idx       on public.notifications(user_id, read) where not read;

-- ═══════════════════════════════════
-- RLS
-- ═══════════════════════════════════
alter table public.notifications enable row level security;

create policy "Users see only their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own as read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Insert solo via trigger (SECURITY DEFINER) — gli utenti non inseriscono direttamente
create policy "No direct insert"
  on public.notifications for insert
  with check (false);


-- ═══════════════════════════════════
-- TRIGGER 1: nuova richiesta di partecipazione
-- ═══════════════════════════════════
create or replace function public.notify_new_participation()
returns trigger language plpgsql security definer as $$
declare
  v_run     record;
  v_actor   record;
begin
  select * into v_run   from public.runs     where id = new.run_id;
  select * into v_actor from public.profiles where id = new.user_id;

  -- Notifica all'organizzatore
  insert into public.notifications (user_id, type, title, body, run_id, actor_id)
  values (
    v_run.organizer_id,
    'nuova_richiesta',
    v_actor.full_name || ' vuole partecipare',
    v_run.title || ' — ' || v_run.city,
    new.run_id,
    new.user_id
  );
  return new;
end;
$$;

drop trigger if exists on_new_participation on public.participations;
create trigger on_new_participation
  after insert on public.participations
  for each row execute procedure public.notify_new_participation();


-- ═══════════════════════════════════
-- TRIGGER 2: richiesta approvata o rifiutata  +  promemoria
-- ═══════════════════════════════════
create or replace function public.notify_participation_updated()
returns trigger language plpgsql security definer as $$
declare
  v_run           record;
  v_organizer     record;
  v_run_datetime  timestamptz;
  v_reminder_at   timestamptz;
begin
  -- Ignora se lo stato non è cambiato
  if new.status = old.status then return new; end if;

  select * into v_run from public.runs where id = new.run_id;

  -- ── Approvata ──
  if new.status = 'approvata' then
    select * into v_organizer from public.profiles where id = v_run.organizer_id;

    -- Notifica "iscrizione confermata"
    insert into public.notifications (user_id, type, title, body, run_id, actor_id)
    values (
      new.user_id,
      'richiesta_approvata',
      'Sei iscritto! Ottimo.',
      v_run.title || ' — ' || to_char(v_run.date, 'DD/MM') || ' alle ' || to_char(v_run.time, 'HH24:MI'),
      new.run_id,
      v_run.organizer_id
    );

    -- Promemoria 24h prima della corsa
    v_run_datetime := (v_run.date + v_run.time)::timestamptz;
    v_reminder_at  := v_run_datetime - interval '24 hours';

    if v_reminder_at > now() then
      insert into public.notifications (user_id, type, title, body, run_id, actor_id, show_after)
      values (
        new.user_id,
        'promemoria_corsa',
        'Domani corri con ' || v_organizer.full_name,
        v_run.title || ' — ore ' || to_char(v_run.time, 'HH24:MI') || ', ' || v_run.city,
        new.run_id,
        v_run.organizer_id,
        v_reminder_at
      );
    end if;

  -- ── Rifiutata ──
  elsif new.status = 'rifiutata' then
    insert into public.notifications (user_id, type, title, body, run_id, actor_id)
    values (
      new.user_id,
      'richiesta_rifiutata',
      'Richiesta non accettata',
      v_run.title || ' — ' || v_run.city,
      new.run_id,
      v_run.organizer_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_participation_updated on public.participations;
create trigger on_participation_updated
  after update on public.participations
  for each row execute procedure public.notify_participation_updated();


-- ═══════════════════════════════════
-- TRIGGER 3: nuovo messaggio
-- ═══════════════════════════════════
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer as $$
declare
  v_sender record;
begin
  select * into v_sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, run_id, actor_id)
  values (
    new.recipient_id,
    'nuovo_messaggio',
    'Messaggio da ' || v_sender.full_name,
    left(new.body, 80),
    new.run_id,
    new.sender_id
  );
  return new;
end;
$$;

drop trigger if exists on_new_message on public.messages;
create trigger on_new_message
  after insert on public.messages
  for each row execute procedure public.notify_new_message();


-- ═══════════════════════════════════
-- TRIGGER 4: corsa annullata
-- ═══════════════════════════════════
create or replace function public.notify_run_cancelled()
returns trigger language plpgsql security definer as $$
declare
  v_participant record;
begin
  -- Solo quando lo status cambia ad 'annullata'
  if new.status = 'annullata' and old.status != 'annullata' then
    for v_participant in
      select user_id from public.participations
      where run_id = new.id and status = 'approvata'
    loop
      insert into public.notifications (user_id, type, title, body, run_id, actor_id)
      values (
        v_participant.user_id,
        'corsa_annullata',
        'Corsa annullata',
        new.title || ' — ' || to_char(new.date, 'DD/MM') || ', ' || new.city,
        new.id,
        new.organizer_id
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_run_cancelled on public.runs;
create trigger on_run_cancelled
  after update on public.runs
  for each row execute procedure public.notify_run_cancelled();

-- Abilita realtime sulla tabella notifications
alter publication supabase_realtime add table public.notifications;
