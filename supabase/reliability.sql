-- Sistema affidabilità organizzatori
-- Step 1: tabella run_confirmations
-- Step 2: colonne materializzate su profiles
-- Step 3: funzione di calcolo score
-- Step 4: trigger automatici

-- =====================
-- TABELLA run_confirmations
-- =====================
CREATE TABLE public.run_confirmations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed   boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, user_id)
);

ALTER TABLE public.run_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read confirmations"
  ON public.run_confirmations FOR SELECT USING (true);

CREATE POLICY "User insert own confirmation"
  ON public.run_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User update own confirmation"
  ON public.run_confirmations FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.run_confirmations;

-- =====================
-- COLONNE MATERIALIZZATE SU profiles
-- =====================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reliability_score     numeric(5,2),  -- null = < 3 corse eligible
  ADD COLUMN IF NOT EXISTS reliability_eligible  numeric(5,2) NOT NULL DEFAULT 0,  -- float per peso spot
  ADD COLUMN IF NOT EXISTS reliability_confirmed numeric(5,2) NOT NULL DEFAULT 0;  -- float per peso spot

-- =====================
-- FUNZIONE DI CALCOLO SCORE
-- =====================
-- DROP necessario: CREATE OR REPLACE non puo rinominare i parametri (42P13)
DROP FUNCTION IF EXISTS update_reliability_score(uuid);
CREATE OR REPLACE FUNCTION update_reliability_score(p_organizer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r               RECORD;
  total_eligible  numeric := 0;
  total_confirmed numeric := 0;
  weight          numeric;
  is_confirmed    boolean;
  run_datetime    timestamptz;
BEGIN
  FOR r IN
    SELECT
      ru.id,
      ru.date,
      ru.time,
      COALESCE((ru.is_spot)::boolean, false) AS is_spot,
      -- segnale 1: check-in dell'organizzatore
      EXISTS(
        SELECT 1 FROM public.check_ins ci
        WHERE ci.run_id = ru.id AND ci.user_id = p_organizer_id
      ) AS has_checkin,
      -- segnale 2: almeno 1 recensione ricevuta
      EXISTS(
        SELECT 1 FROM public.reviews rv
        WHERE rv.run_id = ru.id AND rv.reviewed_id = p_organizer_id
      ) AS has_review,
      -- segnale 3: >= 50% partecipanti ha risposto "sì"
      COALESCE((
        SELECT
          SUM(CASE WHEN rc.confirmed THEN 1.0 ELSE 0 END) /
          NULLIF(COUNT(*), 0) >= 0.5
        FROM public.run_confirmations rc
        WHERE rc.run_id = ru.id
      ), false) AS has_confirmations,
      -- ha almeno 1 partecipante approvato?
      EXISTS(
        SELECT 1 FROM public.participations p
        WHERE p.run_id = ru.id AND p.status = 'approvata'
      ) AS has_participants
    FROM public.runs ru
    WHERE ru.organizer_id = p_organizer_id
      AND ru.status != 'annullata'
  LOOP
    -- Calcola l'ora della corsa come timestamptz Europe/Rome
    run_datetime := (r.date::text || ' ' || r.time::text || '+00')::timestamptz
      AT TIME ZONE 'Europe/Rome';

    -- Considera solo corse con partecipanti, passate da almeno 24h
    CONTINUE WHEN NOT (
      r.has_participants AND
      run_datetime < now() - interval '24 hours'
    );

    weight       := CASE WHEN r.is_spot THEN 0.5 ELSE 1.0 END;
    is_confirmed := r.has_checkin OR r.has_review OR r.has_confirmations;

    total_eligible  := total_eligible  + weight;
    total_confirmed := total_confirmed + CASE WHEN is_confirmed THEN weight ELSE 0 END;
  END LOOP;

  UPDATE public.profiles SET
    reliability_eligible  = total_eligible,
    reliability_confirmed = total_confirmed,
    reliability_score     = CASE
      WHEN total_eligible >= 3
      THEN ROUND((total_confirmed / total_eligible * 100)::numeric, 2)
      ELSE NULL
    END
  WHERE id = p_organizer_id;
END;
$$;

-- =====================
-- FUNZIONE HELPER per trigger (ricava organizer dalla corsa)
-- =====================
CREATE OR REPLACE FUNCTION trigger_update_reliability_from_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Su DELETE usa OLD, altrimenti NEW
  SELECT organizer_id INTO org_id
  FROM public.runs
  WHERE id = COALESCE(NEW.run_id, OLD.run_id);

  IF org_id IS NOT NULL THEN
    PERFORM update_reliability_score(org_id);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_reliability_from_run_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Si attiva solo quando status cambia (es. annullata)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM update_reliability_score(NEW.organizer_id);
  END IF;
  RETURN NULL;
END;
$$;

-- =====================
-- TRIGGER
-- =====================

-- 1. Qualcuno fa check-in (potrebbe essere l'organizzatore)
CREATE TRIGGER trg_reliability_checkin
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();

-- 2. Arriva una recensione
CREATE TRIGGER trg_reliability_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();

-- 3. Risposta al prompt post-run
CREATE TRIGGER trg_reliability_confirmation
  AFTER INSERT OR UPDATE ON public.run_confirmations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();

-- 4. Corsa annullata (rimuove dall'eligible)
CREATE TRIGGER trg_reliability_run_status
  AFTER UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run_status();
