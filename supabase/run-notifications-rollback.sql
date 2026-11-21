-- Rollback di supabase/run-notifications.sql (SQL #44)
--
-- Toglie i due trigger nuovi, ripristina call_send_push() com'era in
-- push-tokens.sql (#41, senza 'chat_corsa') e toglie il default su user_id.
-- Le notifiche `chat_corsa` già create restano nella tabella (inoffensive:
-- il sito le mostra con l'icona di default); per toglierle:
--   delete from public.notifications where type = 'chat_corsa';

drop trigger if exists on_run_modified     on public.runs;
drop trigger if exists on_run_chat_message on public.run_chat;
drop function if exists public.notify_run_modified();
drop function if exists public.notify_run_chat();

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
    'nuovo_messaggio'
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

alter table public.run_confirmations
  alter column user_id drop default;
