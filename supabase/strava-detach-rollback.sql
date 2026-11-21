-- ============================================================
-- ROLLBACK di strava-detach.sql (#46)
-- Ripristina SOLO la struttura di accesso (helper + policy della #30).
-- NON ripristina i dati cancellati (attività, connessioni, conferme
-- 'strava'): gli utenti dovrebbero ricollegare Strava. Il rollback ha senso
-- solo insieme a un ripristino del codice (route /api/strava/*).
-- Presuppone che le tabelle esistano ancora (FASE 2 non eseguita).
-- ============================================================

CREATE OR REPLACE FUNCTION public.shares_private_crew_with(p_other uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crew_members me
    JOIN crew_members them ON them.crew_id = me.crew_id
    JOIN crews c           ON c.id = me.crew_id
    WHERE me.user_id = auth.uid() AND me.status = 'active'
      AND them.user_id = p_other AND them.status = 'active'
      AND c.visibility = 'private'
  );
$$;

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
