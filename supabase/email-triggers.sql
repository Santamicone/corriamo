-- Collegamento trigger DB → Edge Function send-immediate
-- PRIMA di eseguire: sostituire i due valori INCOLLA_QUI_* con i valori reali
-- - SUPABASE_URL:              Settings → API → Project URL
-- - SUPABASE_SERVICE_ROLE_KEY: Settings → API → service_role (secret)

-- ── Funzione helper ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION call_send_immediate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo per i tipi che richiedono email immediata
  IF NEW.type NOT IN ('richiesta_approvata', 'corsa_annullata', 'corsa_modificata', 'promemoria_corsa') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-immediate',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer INCOLLA_QUI_SERVICE_ROLE_KEY'
    ),
    body    := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_immediate ON public.notifications;
CREATE TRIGGER trg_email_immediate
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION call_send_immediate();

-- ── pg_cron: digest ogni 30 minuti ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Rimuovi job precedente se esiste (evita duplicati)
SELECT cron.unschedule('email-digest-every-30min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'email-digest-every-30min'
);

SELECT cron.schedule(
  'email-digest-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer INCOLLA_QUI_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
