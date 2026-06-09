-- ============================================================
-- CREW STATS — statistiche aggregate di gruppo (Feature C, C1)
-- Eseguire dopo: crews.sql
-- Idempotente: rieseguibile senza effetti collaterali.
-- ============================================================

-- Indice composito per le query aggregate per crew + data
CREATE INDEX IF NOT EXISTS idx_runs_crew_date ON public.runs(crew_id, date);

-- ------------------------------------------------------------
-- Funzione: crew_stats(p_crew_id)
-- Restituisce SOLO aggregati del gruppo (km collettivi, n. corse,
-- n. membri). SECURITY DEFINER per includere anche le corse
-- crew_only nel conteggio senza esporle singolarmente (nessun leak
-- di dati individuali: vengono restituiti solo totali).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.crew_stats(uuid);

CREATE OR REPLACE FUNCTION public.crew_stats(p_crew_id uuid)
RETURNS TABLE (total_runs bigint, total_km numeric, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)
       FROM public.runs r
      WHERE r.crew_id = p_crew_id
        AND r.status <> 'annullata'
        AND r.date < current_date),
    COALESCE((SELECT sum(r.distance_km)
       FROM public.runs r
      WHERE r.crew_id = p_crew_id
        AND r.status <> 'annullata'
        AND r.date < current_date
        AND r.distance_km IS NOT NULL), 0)::numeric,
    (SELECT count(*)
       FROM public.crew_members m
      WHERE m.crew_id = p_crew_id
        AND m.status = 'active');
$$;

GRANT EXECUTE ON FUNCTION public.crew_stats(uuid) TO anon, authenticated;
