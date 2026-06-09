-- ============================================================
-- HOTFIX — "column reference organizer_id is ambiguous"
-- ============================================================
-- Bug: in update_reliability_score() il parametro si chiamava
-- `organizer_id`, identico alla colonna public.runs.organizer_id.
-- Nella WHERE `ru.organizer_id = organizer_id` il riferimento non
-- qualificato e ambiguo → Postgres solleva errore e fa fallire OGNI
-- UPDATE di runs che cambia status (es. annullamento corsa), oltre ai
-- trigger di check-in/recensione/conferma.
--
-- Fix: rinominato il parametro in `p_organizer_id`.
-- Idempotente: CREATE OR REPLACE, stessa firma (uuid) → sostituisce.
-- Eseguire nel Supabase SQL Editor.
-- ============================================================

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
      EXISTS(
        SELECT 1 FROM public.check_ins ci
        WHERE ci.run_id = ru.id AND ci.user_id = p_organizer_id
      ) AS has_checkin,
      EXISTS(
        SELECT 1 FROM public.reviews rv
        WHERE rv.run_id = ru.id AND rv.reviewed_id = p_organizer_id
      ) AS has_review,
      COALESCE((
        SELECT
          SUM(CASE WHEN rc.confirmed THEN 1.0 ELSE 0 END) /
          NULLIF(COUNT(*), 0) >= 0.5
        FROM public.run_confirmations rc
        WHERE rc.run_id = ru.id
      ), false) AS has_confirmations,
      EXISTS(
        SELECT 1 FROM public.participations p
        WHERE p.run_id = ru.id AND p.status = 'approvata'
      ) AS has_participants
    FROM public.runs ru
    WHERE ru.organizer_id = p_organizer_id
      AND ru.status != 'annullata'
  LOOP
    run_datetime := (r.date::text || ' ' || r.time::text || '+00')::timestamptz
      AT TIME ZONE 'Europe/Rome';

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
