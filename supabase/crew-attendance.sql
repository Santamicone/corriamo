-- ============================================================
-- CREW ATTENDANCE — presenze rapide "Ci sono" (Step 3 area crew)
--
-- Due funzioni:
--   · run_going_roster(run_id)        — roster dei confermati (read-only)
--   · crew_confirm_attendance(run_id) — conferma immediata del membro
--
-- Perché SECURITY DEFINER:
--   1) La RLS di participations rende una riga visibile SOLO al
--      partecipante e all'organizzatore (schema.sql). Senza una
--      funzione definer, un membro qualsiasi non vedrebbe chi altro
--      va alla corsa. run_going_roster restituisce il roster pubblico
--      (nome + avatar) con un guard di visibilità.
--   2) La UPDATE policy su participations consente il passaggio a
--      'approvata' solo all'ORGANIZZATORE. Per la "conferma immediata"
--      del membro (scelta di prodotto) serve una funzione definer che
--      esegua l'approvazione per conto del chiamante, dopo aver
--      verificato che è davvero un membro attivo della crew.
--
-- Riuso notifiche: crew_confirm_attendance inserisce 'in_attesa' e poi
-- aggiorna a 'approvata', così scattano i trigger esistenti
-- (notifications.sql): organizzatore avvisato + partecipante "Sei
-- iscritto!" + promemoria 24h. Nessuna modifica ai trigger esistenti.
--
-- Eseguire dopo: schema.sql, crews.sql, notifications.sql.
-- Idempotente: rieseguibile senza effetti collaterali.
-- ============================================================

-- ------------------------------------------------------------
-- run_going_roster(p_run_id): confermati (status='approvata') di una corsa.
-- Guard di visibilità: righe restituite solo se la corsa è pubblica,
-- oppure il chiamante è membro attivo della crew, oppure è l'organizzatore.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.run_going_roster(uuid);

CREATE OR REPLACE FUNCTION public.run_going_roster(p_run_id uuid)
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id, pr.full_name, pr.avatar_url
  FROM public.participations pa
  JOIN public.profiles pr ON pr.id = pa.user_id
  WHERE pa.run_id = p_run_id
    AND pa.status = 'approvata'
    AND (
      EXISTS (SELECT 1 FROM public.runs r
              WHERE r.id = p_run_id AND r.run_visibility = 'public')
      OR EXISTS (SELECT 1 FROM public.runs r
                 JOIN public.crew_members m ON m.crew_id = r.crew_id
                 WHERE r.id = p_run_id AND m.user_id = auth.uid() AND m.status = 'active')
      OR EXISTS (SELECT 1 FROM public.runs r
                 WHERE r.id = p_run_id AND r.organizer_id = auth.uid())
    )
  ORDER BY pa.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.run_going_roster(uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- crew_confirm_attendance(p_run_id): il membro attivo della crew conferma
-- la presenza a una corsa della crew. Ritorna 'confirmed' o solleva
-- un'eccezione con messaggio parlante (gestito lato client).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.crew_confirm_attendance(uuid);

CREATE OR REPLACE FUNCTION public.crew_confirm_attendance(p_run_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_run      public.runs%ROWTYPE;
  v_existing public.participations%ROWTYPE;
  v_approved integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_run FROM public.runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;
  IF v_run.crew_id IS NULL THEN
    RAISE EXCEPTION 'not_a_crew_run';
  END IF;
  IF v_run.status <> 'aperta' THEN
    RAISE EXCEPTION 'run_not_open';
  END IF;

  -- Deve essere membro attivo della crew della corsa
  IF NOT EXISTS (
    SELECT 1 FROM public.crew_members m
    WHERE m.crew_id = v_run.crew_id AND m.user_id = v_uid AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  SELECT * INTO v_existing
  FROM public.participations
  WHERE run_id = p_run_id AND user_id = v_uid;

  -- Già confermato: niente da fare (idempotente)
  IF v_existing.id IS NOT NULL AND v_existing.status = 'approvata' THEN
    RETURN 'confirmed';
  END IF;

  -- Controllo capienza (posti già confermati, esclusa la mia eventuale riga)
  IF v_run.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_approved
    FROM public.participations
    WHERE run_id = p_run_id AND status = 'approvata' AND user_id <> v_uid;
    IF v_approved >= v_run.max_participants THEN
      RAISE EXCEPTION 'run_full';
    END IF;
  END IF;

  IF v_existing.id IS NULL THEN
    -- insert 'in_attesa' → update 'approvata': riusa i trigger di notifica
    -- (organizzatore avvisato + partecipante "Sei iscritto!" + promemoria 24h)
    INSERT INTO public.participations (run_id, user_id, status)
    VALUES (p_run_id, v_uid, 'in_attesa');
    UPDATE public.participations
      SET status = 'approvata'
      WHERE run_id = p_run_id AND user_id = v_uid;
  ELSE
    -- riga esistente ('in_attesa' o 'rifiutata') → approva
    UPDATE public.participations
      SET status = 'approvata'
      WHERE id = v_existing.id;
  END IF;

  RETURN 'confirmed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.crew_confirm_attendance(uuid) TO authenticated;
