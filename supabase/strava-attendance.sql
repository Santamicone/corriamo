-- ============================================================
-- STRAVA — auto-conferma presenze + affidabilità partecipante (#32)
-- Eseguire dopo: reliability.sql (#18) e strava.sql (#29)
--
-- Quando un'attività Strava di un utente combacia (orario/distanza/posizione)
-- con una corsa a cui ha partecipato, il backend inserisce automaticamente una
-- conferma di presenza (run_confirmations, source='strava'). Questo:
--   - alimenta il reliability_score dell'ORGANIZZATORE (trigger esistenti #18)
--   - alimenta il nuovo attendance_score del PARTECIPANTE (qui sotto)
-- ============================================================

-- 1. Origine della conferma (audit: manuale vs automatica da Strava)
ALTER TABLE public.run_confirmations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'strava'));

-- 2. Coordinate di partenza dell'attività (corroborazione posizione;
--    NULL se l'utente ha privacy zone / dati nascosti su Strava)
ALTER TABLE public.strava_activities
  ADD COLUMN IF NOT EXISTS start_lat numeric,
  ADD COLUMN IF NOT EXISTS start_lng numeric;

-- 3. Affidabilità come PARTECIPANTE (si presenta alle corse a cui si iscrive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS attendance_eligible  numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_confirmed numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_score     numeric(5,2);  -- null = < 3 corse eligible

-- ============================================================
-- FUNZIONE: ricalcolo attendance_score del partecipante
-- Eligible = corse (approvate, non annullate, passate da 24h) a cui era iscritto.
-- Present  = di quelle, dove esiste una conferma con confirmed = true.
-- ============================================================
DROP FUNCTION IF EXISTS update_attendance_score(uuid);
CREATE OR REPLACE FUNCTION update_attendance_score(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r               RECORD;
  total_eligible  numeric := 0;
  total_present   numeric := 0;
  run_datetime    timestamptz;
  present         boolean;
BEGIN
  FOR r IN
    SELECT ru.id, ru.date, ru.time
    FROM public.participations pa
    JOIN public.runs ru ON ru.id = pa.run_id
    WHERE pa.user_id = p_user_id
      AND pa.status = 'approvata'
      AND ru.status != 'annullata'
  LOOP
    run_datetime := (r.date::text || ' ' || r.time::text || '+00')::timestamptz
      AT TIME ZONE 'Europe/Rome';

    -- solo corse già passate da almeno 24h
    CONTINUE WHEN run_datetime >= now() - interval '24 hours';

    total_eligible := total_eligible + 1;

    SELECT rc.confirmed INTO present
    FROM public.run_confirmations rc
    WHERE rc.run_id = r.id AND rc.user_id = p_user_id;

    IF present IS TRUE THEN
      total_present := total_present + 1;
    END IF;
  END LOOP;

  UPDATE public.profiles SET
    attendance_eligible  = total_eligible,
    attendance_confirmed = total_present,
    attendance_score     = CASE
      WHEN total_eligible >= 3
      THEN ROUND((total_present / total_eligible * 100)::numeric, 2)
      ELSE NULL
    END
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- TRIGGER: aggiorna l'attendance del partecipante quando cambia una conferma
-- (coesiste con trg_reliability_confirmation, che aggiorna l'organizzatore)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_update_attendance_from_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM update_attendance_score(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_confirmation ON public.run_confirmations;
CREATE TRIGGER trg_attendance_confirmation
  AFTER INSERT OR UPDATE OR DELETE ON public.run_confirmations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_attendance_from_confirmation();
