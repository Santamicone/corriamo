-- ============================================================
-- STRAVA — distacco definitivo dell'integrazione (#46)
-- Motivo: l'API Policy Strava (Effective Date 1 giugno 2026, sez. 2.3, 5.4,
-- 6.2, 7.4) non consente di mostrare i dati di un atleta ad altri utenti, né
-- di aggregarli, e limita la cache a 7 giorni. Vedi docs/STRAVA.md.
--
-- ⚠️ ORDINE DI ESECUZIONE
--   1. Deploy del sito senza le route /api/strava/* (già nel commit di distacco).
--   2. `npm run strava:detach` (dry-run) e poi `npm run strava:detach -- --apply`
--      → revoca i token su Strava ed elimina la subscription webhook.
--      DEVE venire PRIMA di questo file: qui i token vengono cancellati.
--   3. QUESTO FILE, nel SQL Editor di Supabase.
--   4. Elimina l'app su https://www.strava.com/settings/api.
--
-- ⚠️ IRREVERSIBILE sui dati: le attività e le conferme di presenza automatiche
-- cancellate non si recuperano (il rollback ripristina solo policy e funzione).
--
-- Compatibilità con l'app mobile (in revisione Apple): le TABELLE e le COLONNE
-- di profiles restano, così le query dell'app (strava_activities,
-- strava_public_profile) e l'Edge Function delete-account continuano a
-- funzionare — le query restituiscono semplicemente 0 righe. Il DROP definitivo
-- è nella FASE 2 in fondo, da fare solo dopo l'uscita della nuova versione app.
-- ============================================================

-- 1. Presenze auto-confermate da Strava (dato DERIVATO da Strava, Policy 7.4).
--    I trigger su run_confirmations (#18, #32) ricalcolano reliability_score
--    dell'organizzatore e attendance_score del partecipante.
--    (DO block: la colonna `source` esiste solo se il SQL #32 è stato applicato.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'run_confirmations' AND column_name = 'source'
  ) THEN
    DELETE FROM public.run_confirmations WHERE source = 'strava';
  END IF;
END $$;

-- 2. Dati importati e connessioni (token OAuth)
DELETE FROM public.strava_activities;
DELETE FROM public.strava_connections;

-- 3. Nessuno (a parte service-role) deve poter leggere strava_activities:
--    RLS resta abilitata e non ci sono più policy → 0 righe per chiunque.
DROP POLICY IF EXISTS "strava_activities_select" ON public.strava_activities;

-- 4. Spegni i flag di condivisione (restano le colonne, per ora)
UPDATE public.profiles
   SET strava_public_profile = false,
       strava_share_activities = false
 WHERE strava_public_profile IS DISTINCT FROM false
    OR strava_share_activities IS DISTINCT FROM false;

-- 5. Helper RLS non più usato
DROP FUNCTION IF EXISTS public.shares_private_crew_with(uuid);

-- ============================================================
-- FASE 2 — DA ESEGUIRE SOLO DOPO la pubblicazione della versione app senza
-- Strava e dopo aver aggiornato l'Edge Function delete-account (rimuovere il
-- blocco "Strava: revoca"). NON eseguire adesso.
-- ============================================================
-- DROP TABLE IF EXISTS public.strava_activities;
-- DROP TABLE IF EXISTS public.strava_connections;
-- ALTER TABLE public.profiles
--   DROP COLUMN IF EXISTS strava_share_activities,
--   DROP COLUMN IF EXISTS strava_public_profile;
-- (profiles.strava_url è un link inserito a mano dall'utente: NON si tocca.)
