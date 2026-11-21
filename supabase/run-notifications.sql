-- Notifiche corsa modificata + chat di corsa, e default user_id sulle conferme — SQL #44
--
-- Corregge tre problemi emersi dal lavoro sull'app mobile:
--   A) `corsa_modificata`: il sito (e l'app) la inserivano da client, ma la
--      policy "No direct insert" su `notifications` lo impedisce → non partiva
--      mai. Ora la crea un trigger su `runs`, come già `on_run_cancelled`.
--   B) Messaggi della chat di corsa (`run_chat`): nessuna notifica. Nuovo tipo
--      `chat_corsa`, con anti-spam (vedi sotto).
--   C) `run_confirmations.user_id` è NOT NULL ma il sito fa upsert senza
--      user_id: gli si dà come default l'utente autenticato.
--
-- Modifica una funzione esistente: `call_send_push()` (stesso corpo di
-- push-tokens.sql, con 'chat_corsa' aggiunto ai tipi che diventano push).
-- Tutto il resto è additivo. Rollback: supabase/run-notifications-rollback.sql
--
-- ── DOPO aver eseguito questo file ───────────────────────────────────────────
--   supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
-- (PUSH_TYPES in send-push/index.ts include ora 'chat_corsa')

do $$
begin
  if to_regclass('public.run_chat') is null then
    raise exception 'Manca la tabella public.run_chat (run-chat.sql)';
  end if;
  if to_regprocedure('public.call_send_push()') is null then
    raise exception 'Manca call_send_push(): esegui prima push-tokens.sql (#41)';
  end if;
end $$;

-- ═══════════════════════════════════
-- A) Corsa modificata → notifica ai partecipanti
-- ═══════════════════════════════════
-- Stessa regola che usava il sito: contano solo data, ora, luogo, città,
-- distanza, ritmo e livello; si avvisano approvati e in attesa (non
-- l'organizzatore) e solo se c'è almeno un partecipante approvato.
create or replace function public.notify_run_modified()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'annullata' or old.status = 'annullata' then
    return new;
  end if;

  if row(new.date, new.time, new.location, new.city, new.distance_km, new.pace_target, new.level)
     is not distinct from
     row(old.date, old.time, old.location, old.city, old.distance_km, old.pace_target, old.level) then
    return new;
  end if;

  if not exists (
    select 1 from public.participations
    where run_id = new.id and status = 'approvata'
  ) then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, run_id, actor_id)
  select p.user_id,
         'corsa_modificata',
         '"' || new.title || '" è stata modificata',
         'L''organizzatore ha aggiornato data, luogo o dettagli. Controlla le novità.',
         new.id,
         new.organizer_id
  from public.participations p
  where p.run_id = new.id
    and p.status in ('approvata', 'in_attesa')
    and p.user_id <> new.organizer_id;

  return new;
exception when others then
  -- Una notifica mancata non deve MAI impedire di salvare la modifica
  return new;
end;
$$;

drop trigger if exists on_run_modified on public.runs;
create trigger on_run_modified
  after update on public.runs
  for each row execute function public.notify_run_modified();

-- ═══════════════════════════════════
-- B) Messaggio nella chat di corsa → notifica agli altri membri
-- ═══════════════════════════════════
-- Destinatari: organizzatore + partecipanti approvati, tranne l'autore.
-- Anti-spam: se il destinatario ha già una notifica `chat_corsa` per quella
-- corsa creata negli ultimi 10 minuti, la si AGGIORNA (ultimo messaggio, di
-- nuovo "non letta") invece di crearne una nuova: la push parte solo
-- all'INSERT, quindi in una chat vivace arriva al massimo una push ogni
-- 10 minuti per corsa.
create or replace function public.notify_run_chat()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_run      record;
  v_author   text;
  v_body     text;
  v_rcpt     uuid;
  v_existing uuid;
begin
  select id, title, organizer_id into v_run from public.runs where id = new.run_id;
  if not found then
    return new;
  end if;

  select coalesce(full_name, 'Qualcuno') into v_author from public.profiles where id = new.author_id;
  v_body := coalesce(v_author, 'Qualcuno') || ': ' || left(new.body, 80);

  for v_rcpt in
    select v_run.organizer_id
    union
    select user_id from public.participations
    where run_id = new.run_id and status = 'approvata'
  loop
    continue when v_rcpt = new.author_id;

    select id into v_existing
    from public.notifications
    where user_id = v_rcpt
      and run_id  = new.run_id
      and type    = 'chat_corsa'
      and created_at > now() - interval '10 minutes'
    order by created_at desc
    limit 1;

    if v_existing is not null then
      update public.notifications
      set body = v_body, actor_id = new.author_id, read = false
      where id = v_existing;
    else
      insert into public.notifications (user_id, type, title, body, run_id, actor_id)
      values (
        v_rcpt,
        'chat_corsa',
        'Nuovi messaggi in "' || v_run.title || '"',
        v_body,
        new.run_id,
        new.author_id
      );
    end if;
  end loop;

  return new;
exception when others then
  -- Un avviso mancato non deve MAI impedire di inviare il messaggio
  return new;
end;
$$;

drop trigger if exists on_run_chat_message on public.run_chat;
create trigger on_run_chat_message
  after insert on public.run_chat
  for each row execute function public.notify_run_chat();

-- Push: stessa funzione di push-tokens.sql (#41) + 'chat_corsa'.
-- Tenere allineato con PUSH_TYPES in supabase/functions/send-push/index.ts.
create or replace function public.call_send_push()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
begin
  -- I promemoria hanno show_after nel futuro: li invia il cron quando scadono
  if new.show_after > now() then
    return new;
  end if;

  if new.type not in (
    'richiesta_approvata', 'richiesta_rifiutata', 'nuova_richiesta',
    'corsa_annullata', 'corsa_modificata', 'promemoria_corsa',
    'crew_join_request', 'crew_request_approved', 'crew_new_run',
    'nuovo_messaggio', 'chat_corsa'
  ) then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_function_secret';
  if v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('notification_id', new.id)
  );

  return new;
exception when others then
  -- Una push mancata non deve MAI far fallire l'inserimento della notifica
  return new;
end;
$$;

-- ═══════════════════════════════════
-- C) Conferma presenza: user_id di default = utente autenticato
-- ═══════════════════════════════════
-- Il prompt "La corsa si è svolta?" del sito fa upsert senza user_id.
-- La policy di INSERT (auth.uid() = user_id) resta valida: il default viene
-- applicato prima del controllo.
alter table public.run_confirmations
  alter column user_id set default auth.uid();
