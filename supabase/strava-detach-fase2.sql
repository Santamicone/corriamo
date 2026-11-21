-- ============================================================
-- STRAVA — FASE 2 del distacco: DROP definitivo di tabelle e colonne (#47)
-- Seguito di strava-detach.sql (#46, già applicato il 21/11/2026).
--
-- ⚠️ DA ESEGUIRE SOLO QUANDO:
--   1. la versione 1.0.1 dell'app mobile (senza query a strava_activities) è
--      pubblicata nello store e adottata dagli utenti (le versioni <= 1.0.0
--      interrogano `strava_activities` e `profiles.strava_public_profile`: dopo
--      il DROP non crashano — il codice usa `data ?? []` — ma ricevono errore);
--   2. l'Edge Function delete-account è stata ripubblicata SENZA il blocco Strava;
--   3. il sito non referenzia più le tabelle (già così dal commit 656c387).
--
-- ⚠️ IRREVERSIBILE (le tabelle sono già vuote dopo la #46). Per ricrearle a
-- vuoto servono strava.sql + strava-public-profile.sql + strava-heartrate.sql.
-- ============================================================

DROP TABLE IF EXISTS public.strava_activities;
DROP TABLE IF EXISTS public.strava_connections;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS strava_share_activities,
  DROP COLUMN IF EXISTS strava_public_profile;

-- profiles.strava_url è un link scritto a mano dall'utente: NON si tocca.
-- run_confirmations.source resta (audit manual/strava; vedi strava-attendance.sql).
