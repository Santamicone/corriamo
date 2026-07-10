-- ============================================================
-- STRAVA — opzione "mostra attività sul profilo pubblico" (#30)
-- Eseguire dopo: strava.sql (#29)
--
-- Aggiunge un secondo livello di visibilità, indipendente dalla condivisione
-- con le crew private:
--   - strava_share_activities  → feed delle crew private (default true)
--   - strava_public_profile    → sezione sul profilo pubblico (default FALSE,
--                                opt-in: il profilo è visibile a chiunque)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strava_public_profile boolean NOT NULL DEFAULT false;

-- Ricrea la policy SELECT del feed aggiungendo il caso "profilo pubblico".
-- Un'attività è leggibile se:
--   1. è la propria, oppure
--   2. l'autore la mostra sul profilo pubblico (visibile a tutti, anche anon), oppure
--   3. condivido una crew privata con l'autore che condivide col feed.
DROP POLICY IF EXISTS "strava_activities_select" ON public.strava_activities;
CREATE POLICY "strava_activities_select" ON public.strava_activities FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = strava_activities.user_id
      AND p.strava_public_profile = true
  )
  OR (
    public.shares_private_crew_with(user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = strava_activities.user_id
        AND p.strava_share_activities = true
    )
  )
);
