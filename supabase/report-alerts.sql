-- Avviso email allo staff per ogni nuova segnalazione — SQL #43
--
-- ADDITIVO: un trigger nuovo su `reports` che chiama la Edge Function
-- `notify-report`. Non modifica né la tabella né le policy esistenti.
-- Rollback: supabase/report-alerts-rollback.sql
--
-- ── PRIMA di eseguire ────────────────────────────────────────────────────────
-- Riusa lo STESSO segreto delle push (Vault "push_function_secret" e secret
-- della funzione PUSH_FUNCTION_SECRET): non serve crearne un altro.
--   1. supabase secrets set --project-ref wshjtgtmxbxhpdqtxpiq STAFF_ALERT_EMAIL=indirizzo@tuodominio.it
--      (l'indirizzo che deve ricevere gli avvisi; RESEND_API_KEY c'è già)
--   2. supabase functions deploy notify-report --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
--   3. Esegui questo file nel SQL Editor.

do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault non attivo';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_function_secret') then
    raise exception 'Manca il secret "push_function_secret" nel Vault (si crea con push-tokens.sql)';
  end if;
  if to_regclass('public.reports') is null then
    raise exception 'Manca la tabella public.reports (admin.sql)';
  end if;
end $$;

create extension if not exists pg_net;

create or replace function public.call_notify_report()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_function_secret';
  if v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/notify-report',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('report_id', new.id)
  );

  return new;
exception when others then
  -- Un avviso mancato non deve MAI far fallire l'invio della segnalazione
  return new;
end;
$$;

drop trigger if exists trg_report_alert on public.reports;
create trigger trg_report_alert
  after insert on public.reports
  for each row execute function public.call_notify_report();
