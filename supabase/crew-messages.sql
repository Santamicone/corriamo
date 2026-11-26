-- Messaggi privati del gestore ai membri della crew, con allegati — SQL #62
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §3 (Fase F)
--
-- Modello
--   * crew_direct_messages: UNA RIGA PER DESTINATARIO. Un invio a N persone crea N righe con lo
--     stesso batch_id: lettura, eliminazione, segnalazione e blocco restano per persona.
--     Chi vede una riga: solo mittente e destinatario. Nessuna policy di scrittura: si scrive
--     solo dalle RPC (SECURITY DEFINER).
--   * Thread = (crew, membro). Il membro può rispondere a chi gli ha scritto; la risposta è una
--     riga verso quel gestore e NON arriva agli altri destinatari dell'invio.
--   * Allegati: bucket Storage PRIVATO crew-attachments, percorso {crew_id}/{batch_id}/{uuid}.
--     Un solo file per invio, condiviso dalle righe del batch. Max 10 MB, immagini e PDF.
--     Lettura: solo mittente e destinatari (tramite la riga del messaggio). Scrittura e
--     cancellazione: owner/admin attivi della crew. Le URL firmate le crea il client.
--
-- RPC (tutte solo per utenti autenticati; errori nel messaggio dell'eccezione)
--   * send_crew_message(crew, destinatari|null, testo, allegato..., batch_id)
--       solo owner/admin attivi; destinatari = membri attivi della stessa crew, mai se stessi;
--       null = tutti i membri attivi. Massimo 50 destinatari per invio, 20 invii all'ora.
--       Chi ha un blocco con il mittente (in uno dei due sensi) è saltato in silenzio e
--       conteggiato in `skipped`.
--       Errori: not_authenticated, user_suspended, forbidden, empty_message, message_too_long,
--       no_recipients, too_many_recipients, invalid_recipient, rate_limited, invalid_attachment,
--       batch_conflict
--   * reply_crew_message(crew, a chi, testo): risposta di testo a chi ti ha scritto in quella crew.
--       Errori: not_authenticated, user_suspended, empty_message, message_too_long, forbidden,
--       blocked, rate_limited
--   * mark_crew_messages_read(crew, altro utente): segna come letti i messaggi che ricevi da lui.
--   * delete_crew_direct_message(id): solo il mittente. Il testo diventa 'Messaggio eliminato',
--       l'allegato si stacca dalla riga (il file resta in Storage ma nessuno può più leggerlo
--       quando tutte le righe del batch sono eliminate).
--   * Notifica 'messaggio_crew' (trigger): una per destinatario; per le risposte, una sola ogni
--     10 minuti per coppia crew/mittente finché la precedente non è letta.
--   * notifications.crew_id (nuova, nullable) per aprire la crew giusta dalla notifica.
--   * call_send_push(): come in ritrovo-nudge.sql (#58) + 'messaggio_crew'.
--
-- ── PRIMA di eseguire questo file ──────────────────────────────────────────
--   supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
-- (dalla cartella del sito `corriamo`). La versione vecchia segnerebbe la notifica come
-- inviata senza inviarla.
--
-- COMPATIBILITÀ: additivo (tabella, bucket, colonna nullable, funzioni nuove), tranne la
-- ridefinizione di call_send_push() (solo un tipo in più). Le app 1.0.x–1.2.x non cambiano.
-- Eseguire dopo: ritrovo-nudge.sql (#58), user-blocks.sql (#42), crew-enhancements.sql (#33).
-- Rollback: supabase/crew-messages-rollback.sql

do $$
begin
  if to_regprocedure('public.is_active_user()') is null then
    raise exception 'Manca is_active_user(): esegui prima admin.sql';
  end if;
  if to_regprocedure('public.is_crew_admin(uuid)') is null then
    raise exception 'Manca is_crew_admin(uuid): esegui prima crews-fix-rls.sql';
  end if;
  if to_regclass('public.user_blocks') is null then
    raise exception 'Manca la tabella public.user_blocks (user-blocks.sql)';
  end if;
  if to_regprocedure('public.call_send_push()') is null then
    raise exception 'Manca call_send_push(): esegui prima push-tokens.sql (#41)';
  end if;
  if pg_get_functiondef('public.call_send_push()'::regprocedure) not like '%sollecito_ritrovo%' then
    raise exception 'call_send_push() non è aggiornata: esegui prima ritrovo-nudge.sql (#58)';
  end if;
end $$;

begin;

-- 1. Tabella ---------------------------------------------------------------------------------
create table if not exists public.crew_direct_messages (
  id              uuid        primary key default gen_random_uuid(),
  crew_id         uuid        not null references public.crews(id)    on delete cascade,
  batch_id        uuid        not null,
  sender_id       uuid        not null references public.profiles(id) on delete cascade,
  recipient_id    uuid        not null references public.profiles(id) on delete cascade,
  body            text        not null default '' check (char_length(body) <= 2000),
  attachment_path text,
  attachment_name text        check (attachment_name is null or char_length(attachment_name) <= 120),
  attachment_type text        check (attachment_type is null
                                  or attachment_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  deleted_at      timestamptz,
  check (sender_id <> recipient_id),
  check (body <> '' or attachment_path is not null or deleted_at is not null),
  check ((attachment_path is null) = (attachment_type is null) or deleted_at is not null)
);

create unique index if not exists crew_direct_messages_batch_recipient_idx
  on public.crew_direct_messages (batch_id, recipient_id);
create index if not exists crew_direct_messages_recipient_idx
  on public.crew_direct_messages (recipient_id, crew_id, created_at desc);
create index if not exists crew_direct_messages_sender_idx
  on public.crew_direct_messages (sender_id, crew_id, created_at desc);

alter table public.crew_direct_messages enable row level security;

drop policy if exists "crew_direct_messages_select" on public.crew_direct_messages;
create policy "crew_direct_messages_select" on public.crew_direct_messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Nessuna policy di INSERT/UPDATE/DELETE: si passa dalle RPC. Anche i privilegi di tabella
-- vengono tolti, così le policy mancanti non sono l'unica difesa.
revoke insert, update, delete on public.crew_direct_messages from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public'
                    and tablename = 'crew_direct_messages') then
    alter publication supabase_realtime add table public.crew_direct_messages;
  end if;
end $$;

-- 2. Notifica: collegamento alla crew ----------------------------------------------------------
alter table public.notifications
  add column if not exists crew_id uuid references public.crews(id) on delete cascade;

-- 3. Bucket privato per gli allegati ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crew-attachments', 'crew-attachments', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Lettura: solo mittente e destinatari di una riga che punta a quel file
drop policy if exists "crew_attachments_select" on storage.objects;
create policy "crew_attachments_select" on storage.objects
  for select using (
    bucket_id = 'crew-attachments'
    and exists (
      select 1 from public.crew_direct_messages m
       where m.attachment_path = storage.objects.name
         and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

-- Scrittura e cancellazione: owner/admin attivi della crew indicata dalla prima cartella.
-- Il controllo sul formato evita che un percorso malformato faccia fallire il cast a uuid.
drop policy if exists "crew_attachments_insert" on storage.objects;
create policy "crew_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'crew-attachments'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_crew_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "crew_attachments_delete" on storage.objects;
create policy "crew_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'crew-attachments'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    and public.is_crew_admin(((storage.foldername(name))[1])::uuid)
  );

-- 4. Invio a uno o più membri ----------------------------------------------------------------
create or replace function public.send_crew_message(
  p_crew_id         uuid,
  p_recipient_ids   uuid[],
  p_body            text,
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_type text default null,
  p_batch_id        uuid default null
)
returns table (batch_id uuid, sent integer, skipped integer)
language plpgsql security definer set search_path = public as $$
declare
  c_max_recipients constant integer := 50;
  c_max_batches    constant integer := 20;
  v_uid     uuid := auth.uid();
  v_body    text := btrim(coalesce(p_body, ''));
  v_batch   uuid := coalesce(p_batch_id, gen_random_uuid());
  v_ids     uuid[];
  v_valid   uuid[];
  v_sent    integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_user() then raise exception 'user_suspended'; end if;
  if not public.is_crew_admin(p_crew_id) then raise exception 'forbidden'; end if;

  if char_length(v_body) > 2000 then raise exception 'message_too_long'; end if;
  if v_body = '' and p_attachment_path is null then raise exception 'empty_message'; end if;

  -- Allegato: stessa crew e stesso batch nel percorso, tipo ammesso, nome presente
  if p_attachment_path is not null then
    if p_attachment_path !~ ('^' || p_crew_id::text || '/' || v_batch::text || '/[0-9a-f-]{36}$')
       or p_attachment_type is null
       or p_attachment_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
       or coalesce(btrim(p_attachment_name), '') = ''
       or char_length(p_attachment_name) > 120 then
      raise exception 'invalid_attachment';
    end if;
  elsif p_attachment_type is not null or p_attachment_name is not null then
    raise exception 'invalid_attachment';
  end if;

  -- Un batch_id scelto dal client non può appartenere a un altro mittente o a un'altra crew
  if p_batch_id is not null and exists (
       select 1 from public.crew_direct_messages m
        where m.batch_id = p_batch_id and (m.sender_id <> v_uid or m.crew_id <> p_crew_id)) then
    raise exception 'batch_conflict';
  end if;

  -- Limite di frequenza
  if (select count(distinct m.batch_id) from public.crew_direct_messages m
       where m.sender_id = v_uid and m.created_at > now() - interval '1 hour') >= c_max_batches then
    raise exception 'rate_limited';
  end if;

  -- Destinatari: l'elenco indicato oppure tutti i membri attivi
  if p_recipient_ids is null then
    select coalesce(array_agg(cm.user_id), '{}') into v_ids
      from public.crew_members cm
     where cm.crew_id = p_crew_id and cm.status = 'active' and cm.user_id <> v_uid;
  else
    select coalesce(array_agg(distinct r), '{}') into v_ids
      from unnest(p_recipient_ids) as r where r is not null and r <> v_uid;
  end if;

  if cardinality(v_ids) = 0 then raise exception 'no_recipients'; end if;
  if cardinality(v_ids) > c_max_recipients then raise exception 'too_many_recipients'; end if;

  -- Tutti devono essere membri attivi di QUESTA crew
  if exists (
       select 1 from unnest(v_ids) as r
        where not exists (select 1 from public.crew_members cm
                           where cm.crew_id = p_crew_id and cm.user_id = r and cm.status = 'active')) then
    raise exception 'invalid_recipient';
  end if;

  -- Esclusi i blocchi (in entrambi i sensi), senza avvisare nessuno
  select coalesce(array_agg(r), '{}') into v_valid
    from unnest(v_ids) as r
   where not exists (
     select 1 from public.user_blocks b
      where (b.blocker_id = r and b.blocked_id = v_uid)
         or (b.blocker_id = v_uid and b.blocked_id = r));

  insert into public.crew_direct_messages
    (crew_id, batch_id, sender_id, recipient_id, body, attachment_path, attachment_name, attachment_type)
  select p_crew_id, v_batch, v_uid, r, v_body, p_attachment_path,
         case when p_attachment_path is null then null else btrim(p_attachment_name) end,
         p_attachment_type
    from unnest(v_valid) as r;
  get diagnostics v_sent = row_count;

  return query select v_batch, v_sent, cardinality(v_ids) - v_sent;
end;
$$;

-- 5. Risposta del membro ---------------------------------------------------------------------
create or replace function public.reply_crew_message(
  p_crew_id      uuid,
  p_recipient_id uuid,
  p_body         text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_id   uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_user() then raise exception 'user_suspended'; end if;
  if v_body = '' then raise exception 'empty_message'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_too_long'; end if;
  if p_recipient_id is null or p_recipient_id = v_uid then raise exception 'forbidden'; end if;

  -- Si risponde solo a chi ti ha scritto in questa crew, e solo se entrambi sono ancora attivi
  if not exists (select 1 from public.crew_direct_messages m
                  where m.crew_id = p_crew_id and m.sender_id = p_recipient_id and m.recipient_id = v_uid)
     or not exists (select 1 from public.crew_members cm
                     where cm.crew_id = p_crew_id and cm.user_id = v_uid and cm.status = 'active')
     or not exists (select 1 from public.crew_members cm
                     where cm.crew_id = p_crew_id and cm.user_id = p_recipient_id and cm.status = 'active') then
    raise exception 'forbidden';
  end if;

  if exists (select 1 from public.user_blocks b
              where (b.blocker_id = p_recipient_id and b.blocked_id = v_uid)
                 or (b.blocker_id = v_uid and b.blocked_id = p_recipient_id)) then
    raise exception 'blocked';
  end if;

  if (select count(*) from public.crew_direct_messages m
       where m.sender_id = v_uid and m.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;

  insert into public.crew_direct_messages (crew_id, batch_id, sender_id, recipient_id, body)
  values (p_crew_id, gen_random_uuid(), v_uid, p_recipient_id, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

-- 6. Lettura ed eliminazione -----------------------------------------------------------------
create or replace function public.mark_crew_messages_read(p_crew_id uuid, p_other_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.crew_direct_messages
     set read_at = now()
   where crew_id = p_crew_id and sender_id = p_other_id
     and recipient_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.delete_crew_direct_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  -- Solo il mittente (chi ha scritto): il destinatario può segnalare e bloccare
  update public.crew_direct_messages
     set body = 'Messaggio eliminato', deleted_at = now(),
         attachment_path = null, attachment_name = null, attachment_type = null
   where id = p_message_id and sender_id = auth.uid() and deleted_at is null;
  if not found then
    if exists (select 1 from public.crew_direct_messages
                where id = p_message_id and sender_id = auth.uid()) then
      return; -- già eliminato
    end if;
    raise exception 'message_not_found';
  end if;
end;
$$;

-- 7. Notifica --------------------------------------------------------------------------------
create or replace function public.notify_crew_direct_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_crew   text;
  v_sender text;
  v_is_mgr boolean;
  v_body   text;
begin
  select name into v_crew from public.crews where id = new.crew_id;
  select full_name into v_sender from public.profiles where id = new.sender_id;

  -- Risposta (il mittente non è owner/admin): una sola notifica ogni 10 minuti finché non letta
  select exists (select 1 from public.crew_members cm
                  where cm.crew_id = new.crew_id and cm.user_id = new.sender_id
                    and cm.role in ('owner', 'admin') and cm.status = 'active')
    into v_is_mgr;
  if not v_is_mgr and exists (
       select 1 from public.notifications n
        where n.user_id = new.recipient_id and n.type = 'messaggio_crew'
          and n.actor_id = new.sender_id and n.crew_id = new.crew_id
          and n.read = false and n.created_at > now() - interval '10 minutes') then
    return new;
  end if;

  v_body := case
    when new.body <> '' then left(new.body, 140)
    else 'Ti ha inviato un allegato'
  end;

  insert into public.notifications (user_id, type, title, body, run_id, actor_id, crew_id)
  values (new.recipient_id, 'messaggio_crew',
          coalesce(v_sender, 'Un membro') || ' · ' || coalesce(v_crew, 'la tua crew'),
          v_body, null, new.sender_id, new.crew_id);

  return new;
exception when others then
  -- La notifica non deve MAI far fallire l'invio del messaggio
  return new;
end;
$$;

drop trigger if exists trg_notify_crew_direct_message on public.crew_direct_messages;
create trigger trg_notify_crew_direct_message
  after insert on public.crew_direct_messages
  for each row execute function public.notify_crew_direct_message();

-- 8. Permessi --------------------------------------------------------------------------------
revoke all on function public.send_crew_message(uuid, uuid[], text, text, text, text, uuid) from public, anon;
revoke all on function public.reply_crew_message(uuid, uuid, text)                          from public, anon;
revoke all on function public.mark_crew_messages_read(uuid, uuid)                           from public, anon;
revoke all on function public.delete_crew_direct_message(uuid)                              from public, anon;
revoke all on function public.notify_crew_direct_message()                                  from public, anon, authenticated;
grant execute on function public.send_crew_message(uuid, uuid[], text, text, text, text, uuid) to authenticated;
grant execute on function public.reply_crew_message(uuid, uuid, text)                          to authenticated;
grant execute on function public.mark_crew_messages_read(uuid, uuid)                           to authenticated;
grant execute on function public.delete_crew_direct_message(uuid)                              to authenticated;

-- 9. Push: stessa funzione di ritrovo-nudge.sql (#58) + 'messaggio_crew' --------------------
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
    'nuovo_messaggio', 'chat_corsa', 'proposta_adottata', 'sollecito_ritrovo',
    'messaggio_crew'
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

notify pgrst, 'reload schema';

commit;

-- Risultato atteso: una riga con tutti i valori 'true'.
select
  to_regclass('public.crew_direct_messages') is not null as tabella,
  (select relrowsecurity from pg_class where oid = 'public.crew_direct_messages'::regclass) as rls,
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'crew_direct_messages') as realtime,
  exists (select 1 from storage.buckets where id = 'crew-attachments' and public = false) as bucket_privato,
  (select count(*) = 3 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'crew_attachments_%') as policy_storage,
  has_function_privilege('authenticated', 'public.send_crew_message(uuid, uuid[], text, text, text, text, uuid)', 'execute') as utenti_possono,
  not has_function_privilege('anon', 'public.send_crew_message(uuid, uuid[], text, text, text, text, uuid)', 'execute') as anonimi_no,
  not has_table_privilege('authenticated', 'public.crew_direct_messages', 'insert') as scrittura_diretta_no,
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'notifications' and column_name = 'crew_id') as notifica_crew,
  pg_get_functiondef('public.call_send_push()'::regprocedure) like '%messaggio_crew%' as push;
