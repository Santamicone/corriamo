-- Conteggi partecipanti + invio email dei promemoria all'orario giusto — SQL #45
--
-- Due correzioni, entrambe ADDITIVE (nessuna tabella o policy esistente cambia):
--
--  A) `run_participant_counts(uuid[])`: la RLS di `participations` mostra le
--     righe SOLO al partecipante e all'organizzatore, quindi "N partecipanti"
--     nelle card e nel dettaglio era errato per chiunque altro. La funzione
--     SECURITY DEFINER restituisce solo il NUMERO di approvati per corsa (mai
--     chi sono). Corregge anche la landing di condivisione e l'immagine OG
--     della corsa, che leggono con il client anonimo e vedevano sempre 0.
--
--  B) Promemoria email: `trg_email_immediate` chiama send-immediate al momento
--     dell'INSERT della notifica `promemoria_corsa` (che ha show_after = 24h
--     prima della corsa), quindi l'email "Domani corri con…" partiva subito
--     all'approvazione. La nuova versione di send-immediate IGNORA le notifiche
--     con show_after nel futuro; questo cron la richiama ogni 15 minuti in
--     modalità {"mode":"due"} per inviare quelle scadute.
--
-- Rollback: supabase/run-counts-reminders-rollback.sql
--
-- ── PRIMA di eseguire questo file ────────────────────────────────────────────
--   1. Pubblica la nuova send-immediate (accetta il segreto del Vault e la
--      modalità "due"; senza --no-verify-jwt il cron verrebbe respinto):
--        supabase functions deploy send-immediate --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
--   2. Esegui questo file nel SQL Editor.
-- Riusa il segreto Vault "push_function_secret" (= secret PUSH_FUNCTION_SECRET
-- della funzione): non serve crearne un altro.

do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault non attivo';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_function_secret') then
    raise exception 'Manca il secret "push_function_secret" nel Vault (si crea con push-tokens.sql)';
  end if;
end $$;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ═══════════════════════════════════
-- A) Conteggio degli approvati per corsa
-- ═══════════════════════════════════
-- Al massimo 200 corse per chiamata (una pagina di bacheca ne ha 20).
create or replace function public.run_participant_counts(p_run_ids uuid[])
returns table (run_id uuid, approved_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select pa.run_id, count(*)::integer as approved_count
  from public.participations pa
  where pa.run_id = any ((p_run_ids)[1:200])
    and pa.status = 'approvata'
  group by pa.run_id;
$$;

revoke all on function public.run_participant_counts(uuid[]) from public;
grant execute on function public.run_participant_counts(uuid[]) to anon, authenticated;

-- ═══════════════════════════════════
-- B) Cron dei promemoria email
-- ═══════════════════════════════════
select cron.unschedule('email-reminders-every-15min')
where exists (select 1 from cron.job where jobname = 'email-reminders-every-15min');

select cron.schedule(
  'email-reminders-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-immediate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_function_secret')
    ),
    body    := '{"mode":"due"}'::jsonb
  );
  $$
);
