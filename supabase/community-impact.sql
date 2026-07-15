-- ============================================================
-- COMMUNITY IMPACT — Gamification Fase 1 (variante "RPC al volo")
-- Vedi docs/GAMIFICATION.md §7 ("Runner ispirati").
--
-- Due funzioni read-only che calcolano l'IMPATTO SOCIALE a partire
-- dai segnali GIÀ VERIFICATI dall'app (nessuna autodichiarazione):
--   · crew_impact_stats(crew_id) — impatto collettivo di una crew
--   · user_impact_stats(user_id) — impatto di un organizzatore
--
-- Nessuna nuova tabella/colonna/trigger, niente Realtime: gli
-- aggregati si calcolano a load pagina. Le colonne materializzate
-- ci_* + trigger (doc §3.2) restano per la Fase 2.
--
-- SECURITY DEFINER: le funzioni leggono segnali cross-utente ma
-- restituiscono SOLO aggregati (nessun leak di righe individuali),
-- stesso argomento di crew_stats in supabase/crew-stats.sql.
--
-- Eseguire dopo: reliability.sql, check-ins.sql, crews.sql.
-- Idempotente: rieseguibile senza effetti collaterali.
-- ============================================================

-- ------------------------------------------------------------
-- "Presenza confermata" (verificato, non dichiarato): una coppia
-- (run_id, user_id) con run_confirmations.confirmed = true OPPURE
-- un check_ins. Sono gli stessi segnali usati da reliability.sql.
-- Le due funzioni la ricostruiscono nella CTE `all_conf`.
-- ------------------------------------------------------------

-- ============================================================
-- crew_impact_stats(p_crew_id): impatto collettivo della crew
-- ============================================================
DROP FUNCTION IF EXISTS public.crew_impact_stats(uuid);

CREATE OR REPLACE FUNCTION public.crew_impact_stats(p_crew_id uuid)
RETURNS TABLE (
  distinct_people     bigint,  -- persone diverse con ≥1 presenza confermata a eventi della crew
  returning_people    bigint,  -- di quelle, tornate ad ≥2 eventi distinti della crew
  activated_newcomers bigint   -- persone la cui PRIMA presenza confermata in assoluto è stata a un evento della crew
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH crew_runs AS (
    SELECT r.id AS run_id
    FROM public.runs r
    WHERE r.crew_id = p_crew_id
      AND r.status <> 'annullata'
      AND r.date < current_date
  ),
  -- Tutte le presenze confermate della piattaforma (per il calcolo "prima uscita in assoluto")
  all_conf AS (
    SELECT rc.run_id, rc.user_id, rc.created_at AS ts
    FROM public.run_confirmations rc
    WHERE rc.confirmed = true
    UNION ALL
    SELECT ci.run_id, ci.user_id, ci.checked_in_at AS ts
    FROM public.check_ins ci
  ),
  -- Presenze confermate agli eventi di QUESTA crew (una riga per (user, run))
  crew_conf AS (
    SELECT DISTINCT ac.user_id, ac.run_id
    FROM all_conf ac
    JOIN crew_runs cr ON cr.run_id = ac.run_id
  ),
  -- Prima presenza confermata in assoluto di ogni utente
  first_conf AS (
    SELECT DISTINCT ON (ac.user_id) ac.user_id, ac.run_id
    FROM all_conf ac
    ORDER BY ac.user_id, ac.ts ASC
  )
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM crew_conf),
    (SELECT COUNT(*) FROM (
        SELECT user_id FROM crew_conf GROUP BY user_id HAVING COUNT(DISTINCT run_id) >= 2
      ) t),
    (SELECT COUNT(*) FROM first_conf fc
      WHERE fc.run_id IN (SELECT run_id FROM crew_runs));
$$;

GRANT EXECUTE ON FUNCTION public.crew_impact_stats(uuid) TO anon, authenticated;

-- ============================================================
-- user_impact_stats(p_user_id): impatto di un organizzatore
-- (card "Runner ispirati" del profilo — doc §7)
-- ============================================================
DROP FUNCTION IF EXISTS public.user_impact_stats(uuid);

CREATE OR REPLACE FUNCTION public.user_impact_stats(p_user_id uuid)
RETURNS TABLE (
  events_verified     bigint,  -- eventi organizzati e verificati (svolti davvero)
  participations      bigint,  -- partecipazioni confermate generate
  distinct_people     bigint,  -- persone diverse coinvolte ai propri eventi
  returning_people    bigint,  -- di quelle, tornate ad ≥2 propri eventi
  activated_newcomers bigint   -- persone la cui prima uscita in assoluto è stata a un proprio evento
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH own_runs AS (
    SELECT r.id AS run_id
    FROM public.runs r
    WHERE r.organizer_id = p_user_id
      AND r.status <> 'annullata'
      AND r.date < current_date
  ),
  all_conf AS (
    SELECT rc.run_id, rc.user_id, rc.created_at AS ts
    FROM public.run_confirmations rc
    WHERE rc.confirmed = true
    UNION ALL
    SELECT ci.run_id, ci.user_id, ci.checked_in_at AS ts
    FROM public.check_ins ci
  ),
  -- Eventi propri con almeno un segnale di svolgimento (incl. check-in dell'organizzatore)
  verified_runs AS (
    SELECT DISTINCT ac.run_id
    FROM all_conf ac
    JOIN own_runs orn ON orn.run_id = ac.run_id
  ),
  -- Presenze confermate di ALTRI ai propri eventi (l'organizzatore non conta come "persona coinvolta")
  own_conf AS (
    SELECT DISTINCT ac.user_id, ac.run_id
    FROM all_conf ac
    JOIN own_runs orn ON orn.run_id = ac.run_id
    WHERE ac.user_id <> p_user_id
  ),
  first_conf AS (
    SELECT DISTINCT ON (ac.user_id) ac.user_id, ac.run_id
    FROM all_conf ac
    ORDER BY ac.user_id, ac.ts ASC
  )
  SELECT
    (SELECT COUNT(*) FROM verified_runs),
    (SELECT COUNT(*) FROM own_conf),
    (SELECT COUNT(DISTINCT user_id) FROM own_conf),
    (SELECT COUNT(*) FROM (
        SELECT user_id FROM own_conf GROUP BY user_id HAVING COUNT(DISTINCT run_id) >= 2
      ) t),
    (SELECT COUNT(*) FROM first_conf fc
      WHERE fc.user_id <> p_user_id
        AND fc.run_id IN (SELECT run_id FROM own_runs));
$$;

GRANT EXECUTE ON FUNCTION public.user_impact_stats(uuid) TO anon, authenticated;
