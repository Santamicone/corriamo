-- ============================================================
-- STRAVA — connessione account + feed attività per crew private (#29)
-- Eseguire dopo: crews.sql (#19) e crews-fix-rls.sql (#21)
--
-- Modello:
--   - strava_connections: 1 riga per utente, contiene i token OAuth.
--     I TOKEN SONO SENSIBILI → nessuna policy SELECT: si leggono solo
--     lato server con service-role (callback OAuth + webhook).
--   - strava_activities: 1 riga per attività di corsa importata.
--     Il feed di crew si costruisce a runtime (nessuna colonna crew_id):
--     un'attività è visibile a chi condivide una crew PRIVATA con l'autore,
--     se l'autore ha strava_share_activities = true.
-- ============================================================

-- 1. Toggle di condivisione sul profilo (default: condivide con le crew)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strava_share_activities boolean NOT NULL DEFAULT true;

-- 2. Connessioni Strava (token OAuth per utente)
CREATE TABLE IF NOT EXISTS public.strava_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_athlete_id bigint NOT NULL UNIQUE,
  access_token      text NOT NULL,
  refresh_token     text NOT NULL,
  expires_at        timestamptz NOT NULL,          -- scadenza dell'access_token
  scope             text,
  connected_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Attività importate (solo corse: Run / TrailRun)
CREATE TABLE IF NOT EXISTS public.strava_activities (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_activity_id     bigint NOT NULL UNIQUE,
  name                   text,
  distance_m             numeric,
  moving_time_s          integer,
  elapsed_time_s         integer,
  total_elevation_gain_m numeric,
  activity_type          text,                       -- 'Run' | 'TrailRun'
  start_date             timestamptz NOT NULL,       -- start_date della corsa (UTC)
  avg_pace_s_per_km      numeric,                    -- derivato: moving_time_s / (distance_m/1000)
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strava_activities_user_id    ON public.strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date ON public.strava_activities(start_date DESC);

-- ============================================================
-- Helper SECURITY DEFINER: condivido una crew PRIVATA con p_other?
-- Bypassa la RLS di crew_members/crews per evitare ricorsione.
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

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_activities  ENABLE ROW LEVEL SECURITY;

-- strava_connections: NESSUNA policy → nessun accesso via anon/auth key.
-- Tutte le letture/scritture dei token avvengono con service-role (server).

-- strava_activities: lettura
--   - le proprie attività, sempre
--   - le attività di chi condivide con me una crew privata, se condivide il feed
CREATE POLICY "strava_activities_select" ON public.strava_activities FOR SELECT USING (
  user_id = auth.uid()
  OR (
    public.shares_private_crew_with(user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = strava_activities.user_id
        AND p.strava_share_activities = true
    )
  )
);

-- strava_activities: nessuna policy INSERT/UPDATE/DELETE →
-- solo il webhook (service-role) può scrivere le attività.
