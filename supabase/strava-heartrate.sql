-- ============================================================
-- STRAVA — frequenza cardiaca media sulle attività (#31)
-- Eseguire dopo: strava.sql (#29)
--
-- NB: si popola solo sulle attività sincronizzate DA ORA (webhook) o
-- ri-sincronizzate (backfill al ri-collegamento). Le righe già importate
-- restano con avg_heartrate_bpm = NULL finché non vengono ri-processate.
-- ============================================================

ALTER TABLE public.strava_activities
  ADD COLUMN IF NOT EXISTS avg_heartrate_bpm numeric;
