-- Collegamento trigger DB → Edge Function send-immediate
-- Eseguire DOPO email-notifications.sql e dopo il deploy delle Edge Functions
-- Richiede: pg_net abilitato, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configurati

-- ── Variabili app (imposta i tuoi valori reali) ───────────────────────────────
-- Sostituire i valori sotto con quelli reali del progetto Supabase.
-- SUPABASE_URL:             Settings → API → Project URL
-- SUPABASE_SERVICE_ROLE_KEY: Settings → API → service_role key

ALTER DATABASE postgres
  SET app.supabase_url     = 'https://wshjtgtmxbxhpdqtxpiq.supabase.co';

-- ATTENZIONE: inserire la service_role key — non la anon key
ALTER DATABASE postgres
  SET app.service_role_key = 'INCOLLA_QUI_SERVICE_ROLE_KEY';

-- ── Funzione helper: chiama send-immediate dopo INSERT su notifications ────────
CREATE OR REPLACE FUNCTION call_send_immediate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url     text;
  v_key     text;
BEGIN
  -- Solo per i tipi che richiedono email immediata
  IF NEW.type NOT IN ('richiesta_approvata', 'corsa_annullata', 'corsa_modificata', 'promemoria_corsa') THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-immediate';
  v_key := current_setting('app.service_role_key', true);

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
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

SELECT cron.schedule(
  'email-digest-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
