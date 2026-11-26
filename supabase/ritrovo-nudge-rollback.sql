-- Rollback di #58 (ritrovo-nudge.sql).
-- CANCELLA gli arrivi registrati, lo storico dell'ultimo sollecito e le notifiche di sollecito.
-- I check-in e la correzione del #57 restano. L'app 1.3.0 nasconde il pannello se mancano le tabelle.

begin;

drop function if exists public.nudge_missing(uuid);
drop trigger if exists trg_check_ins_arrival on public.check_ins;
drop function if exists public.record_run_arrival();
drop table if exists public.run_nudges;
drop table if exists public.run_arrivals;
delete from public.notifications where type = 'sollecito_ritrovo';

-- call_send_push() com'era in run-proposals.sql (#53)
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
    'nuovo_messaggio', 'chat_corsa', 'proposta_adottata'
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
