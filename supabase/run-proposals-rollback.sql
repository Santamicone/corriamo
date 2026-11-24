-- Rollback di #53 (run-proposals.sql).
-- CANCELLA tutte le proposte e i "Mi interesserebbe" raccolti, e le notifiche `proposta_adottata`.
-- Le corse nate da proposte RESTANO (sono corse normali): perdono solo la colonna proposal_id.
-- Ripristina call_send_push() com'era in run-notifications.sql (#44).

select cron.unschedule('expire-run-proposals')
where exists (select 1 from cron.job where jobname = 'expire-run-proposals');

drop function if exists public.expire_run_proposals();
drop function if exists public.adopt_proposal(uuid, jsonb);
drop function if exists public.proposal_detail(uuid);
drop function if exists public.proposals_discover(text, integer);

delete from public.notifications where type = 'proposta_adottata';
alter table public.notifications drop column if exists proposal_id;

drop index if exists public.runs_proposal_id_key;
alter table public.runs drop column if exists proposal_id;

drop table if exists public.proposal_interests;
drop table if exists public.run_proposals;
drop function if exists public.run_proposals_set_expiry();

-- call_send_push() di #44 (senza 'proposta_adottata')
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
  return new;
end;
$$;
