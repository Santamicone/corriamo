-- ============================================================================
-- #51 — Crew: "Avvisami" e lista ordinata (Scopri) — Fase 2a-2
-- Spec: docs/MAPPA-CREW.md §2.5 (Avvisami), §6.1 (ordine delle liste), §8 (contratto app)
--
-- Prerequisito: #50 (crew-directory.sql) applicato.
--
-- Cosa fa
--   * tabella crew_interests: "Avvisami quando arriva su Vieni a correre" (una riga per utente e scheda);
--     ognuno vede, crea e cancella SOLO le proprie righe, e solo su schede senza proprietario;
--   * crew_interest_count(crew_id): il NUMERO di persone in attesa, mai chi sono;
--   * crews_discover(q, city, limit): la lista di Scopri già ordinata, stesso contratto per sito e app.
--     Ordine (§6.1): prima la geografia (la città richiesta), poi le crew GESTITE e solo dopo le
--     NON gestite; dentro ogni gruppo: attività recente, numero di membri, nome. Mai la verifica.
--       gruppo 0  gestite con >= 5 membri attivi, oppure create dall'admin (source = 'editoriale')
--       gruppo 1  le altre gestite
--       gruppo 2  non gestite inserite dall'admin
--       gruppo 3  non gestite segnalate dagli utenti
--
-- COMPATIBILITÀ: solo additivo (una tabella e due funzioni nuove). L'app 1.0.x non le usa.
-- Rollback: crew-discover-rollback.sql (cancella le richieste "Avvisami").
-- ============================================================================

-- 1. Avvisami ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_interests (
  crew_id    uuid        NOT NULL REFERENCES public.crews(id)    ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS crew_interests_user_idx ON public.crew_interests (user_id);

ALTER TABLE public.crew_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew_interests_select_own" ON public.crew_interests;
CREATE POLICY "crew_interests_select_own" ON public.crew_interests
  FOR SELECT USING (user_id = auth.uid());

-- Si può chiedere di essere avvisati solo su una scheda senza proprietario (e visibile a chi chiede)
DROP POLICY IF EXISTS "crew_interests_insert_own" ON public.crew_interests;
CREATE POLICY "crew_interests_insert_own" ON public.crew_interests
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.crews c WHERE c.id = crew_id AND c.owner_id IS NULL)
  );

DROP POLICY IF EXISTS "crew_interests_delete_own" ON public.crew_interests;
CREATE POLICY "crew_interests_delete_own" ON public.crew_interests
  FOR DELETE USING (user_id = auth.uid());

-- 2. Quante persone aspettano (solo il numero) -------------------------------------
CREATE OR REPLACE FUNCTION public.crew_interest_count(p_crew_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.crew_interests i
  JOIN public.crews c ON c.id = i.crew_id
  WHERE i.crew_id = p_crew_id
    AND c.owner_id IS NULL
    AND c.moderation_status = 'published'
    AND c.activity_status   = 'active';
$$;

REVOKE ALL ON FUNCTION public.crew_interest_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crew_interest_count(uuid) TO authenticated;

-- 3. Lista ordinata di Scopri ----------------------------------------------------------
-- SECURITY DEFINER perché i conteggi leggono crew_members/runs/crew_interests, che un utente
-- qualunque non vede per intero. Espone SOLO campi già pubblici e numeri aggregati, e applica da sé
-- i filtri di visibilità (public/directory, published, active).
CREATE OR REPLACE FUNCTION public.crews_discover(
  p_q     text    DEFAULT NULL,
  p_city  text    DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id              uuid,
  slug            text,
  name            text,
  description     text,
  avatar_url      text,
  crew_type       text,
  city            text,
  zone            text,
  has_manager     boolean,
  trust_level     text,
  source          text,
  member_count    integer,
  interest_count  integer,
  next_event_date date,
  next_event_title text,
  group_rank      smallint,
  meeting_point   text,
  schedule_text   text,
  website_url     text,
  instagram_url   text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Rome')::date AS d),
  base AS (
    SELECT
      c.*,
      (SELECT count(*)::integer
         FROM public.crew_members m
         JOIN public.profiles p ON p.id = m.user_id
        WHERE m.crew_id = c.id
          AND m.status = 'active'
          AND coalesce(p.moderation_status, 'active') NOT IN ('suspended', 'banned')) AS members,
      (SELECT count(*)::integer FROM public.crew_interests i WHERE i.crew_id = c.id)     AS interests,
      (SELECT r.date  FROM public.runs r, today t
         WHERE r.crew_id = c.id AND r.run_visibility = 'public' AND r.status = 'aperta' AND r.date >= t.d
         ORDER BY r.date, r.time LIMIT 1)                                                 AS ev_date,
      (SELECT r.title FROM public.runs r, today t
         WHERE r.crew_id = c.id AND r.run_visibility = 'public' AND r.status = 'aperta' AND r.date >= t.d
         ORDER BY r.date, r.time LIMIT 1)                                                 AS ev_title,
      EXISTS (SELECT 1 FROM public.runs r, today t
               WHERE r.crew_id = c.id AND r.run_visibility = 'public' AND r.status <> 'annullata'
                 AND r.date >= t.d - 30)                                                  AS recent
    FROM public.crews c
    WHERE c.visibility IN ('public', 'directory')
      AND c.moderation_status = 'published'
      AND c.activity_status   = 'active'
      AND (p_q IS NULL OR btrim(p_q) = ''
           OR c.name ILIKE '%' || btrim(p_q) || '%'
           OR c.city ILIKE '%' || btrim(p_q) || '%'
           OR c.zone ILIKE '%' || btrim(p_q) || '%')
  ),
  ranked AS (
    SELECT b.*,
      CASE
        WHEN b.owner_id IS NOT NULL THEN (CASE WHEN b.members >= 5 OR b.source = 'editoriale' THEN 0 ELSE 1 END)
        ELSE                              (CASE WHEN b.source = 'editoriale' THEN 2 ELSE 3 END)
      END::smallint AS grp,
      CASE WHEN p_city IS NOT NULL AND btrim(p_city) <> ''
                AND (lower(b.city) = lower(btrim(p_city)) OR lower(b.zone) = lower(btrim(p_city)))
           THEN 0 ELSE 1 END AS geo
    FROM base b
  )
  SELECT r.id, r.slug, r.name, r.description, r.avatar_url, r.crew_type, r.city, r.zone,
         (r.owner_id IS NOT NULL), r.trust_level, r.source,
         r.members, r.interests, r.ev_date, r.ev_title, r.grp,
         r.meeting_point, r.schedule_text, r.website_url, r.instagram_url
  FROM ranked r
  ORDER BY r.geo, r.grp, r.recent DESC, r.members DESC, r.name
  LIMIT least(greatest(p_limit, 1), 200);
$$;

REVOKE ALL ON FUNCTION public.crews_discover(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crews_discover(text, text, integer) TO anon, authenticated;

-- 4. Verifica (sola lettura) ---------------------------------------------------------------
-- select name, has_manager, group_rank, member_count, interest_count from public.crews_discover(null, 'Perugia');
-- select count(*) from public.crew_interests;                         -- 0 all'inizio
-- select * from pg_policies where tablename = 'crew_interests';       -- 3 policy
