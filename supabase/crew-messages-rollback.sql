-- Rollback di #62 (crew-messages.sql).
-- ATTENZIONE: CANCELLA tutti i messaggi privati della crew. I file nel bucket crew-attachments
-- NON vengono cancellati da SQL: eliminali dalla dashboard (Storage) se serve, poi rimuovi il bucket.
-- Le notifiche 'messaggio_crew' già create restano (senza il collegamento alla crew).
-- call_send_push() torna alla versione di ritrovo-nudge.sql (#58).

begin;

drop trigger if exists trg_notify_crew_direct_message on public.crew_direct_messages;
drop function if exists public.notify_crew_direct_message();

drop function if exists public.send_crew_message(uuid, uuid[], text, text, text, text, uuid);
drop function if exists public.reply_crew_message(uuid, uuid, text);
drop function if exists public.mark_crew_messages_read(uuid, uuid);
drop function if exists public.delete_crew_direct_message(uuid);

drop policy if exists "crew_attachments_select" on storage.objects;
drop policy if exists "crew_attachments_insert" on storage.objects;
drop policy if exists "crew_attachments_delete" on storage.objects;

do $$
begin
  if exists (select 1 from pg_publication_tables
              where pubname = 'supabase_realtime' and schemaname = 'public'
                and tablename = 'crew_direct_messages') then
    alter publication supabase_realtime drop table public.crew_direct_messages;
  end if;
end $$;

drop table if exists public.crew_direct_messages;

alter table public.notifications drop column if exists crew_id;

create or replace function public.call_send_push()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
begin
  if new.show_after > now() then
    return new;
  end if;

  if new.type not in (
    'richiesta_approvata', 'richiesta_rifiutata', 'nuova_richiesta',
    'corsa_annullata', 'corsa_modificata', 'promemoria_corsa',
    'crew_join_request', 'crew_request_approved', 'crew_new_run',
    'nuovo_messaggio', 'chat_corsa', 'proposta_adottata', 'sollecito_ritrovo'
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
  return new;
end;
$$;

-- Il bucket si toglie dopo aver svuotato Storage dalla dashboard:
--   delete from storage.buckets where id = 'crew-attachments';

notify pgrst, 'reload schema';

commit;
