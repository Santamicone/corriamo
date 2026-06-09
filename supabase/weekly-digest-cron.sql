-- ============================================================================
-- Schedulazione digest settimanale geolocalizzato (Edge Function send-weekly-digest)
-- ============================================================================
-- PRE-REQUISITI (in ordine):
--   1. Deploy della funzione:  supabase functions deploy send-weekly-digest
--   2. Sostituire INCOLLA_QUI_SERVICE_ROLE_KEY con la service_role key reale,
--      OPPURE (consigliato) leggerla da Vault come in email-triggers.
--
-- Esegue lunedì alle 07:00 UTC (≈ 08:00 inverno / 09:00 estate, ora italiana).
-- pg_cron lavora in UTC: regolare se serve un orario fisso locale.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Rimuovi job precedente se esiste (idempotente)
SELECT cron.unschedule('weekly-digest-monday') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-digest-monday'
);

SELECT cron.schedule(
  'weekly-digest-monday',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-weekly-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer INCOLLA_QUI_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Per disattivare:  SELECT cron.unschedule('weekly-digest-monday');
