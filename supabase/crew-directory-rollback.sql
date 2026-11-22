-- Rollback di crew-directory.sql (#50) — riporta lo stato a crew-map.sql (#49).
-- ATTENZIONE: cancella TUTTE le schede informative (crew senza proprietario) e i contatti privati
-- (crew_contacts): senza #50 una crew deve avere un proprietario. Esportarle prima se servono.
-- Le crew con proprietario non cambiano (perdono solo le colonne nuove).

-- 1. Schede informative (e, a cascata, i loro contatti e i dati collegati)
DELETE FROM public.crews WHERE owner_id IS NULL;

-- 2. La mappa torna alla versione di #49
CREATE OR REPLACE FUNCTION public.crews_in_bbox(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_limit   integer DEFAULT 500
)
RETURNS TABLE (
  id           uuid,
  slug         text,
  name         text,
  crew_type    text,
  city         text,
  zone         text,
  lat          double precision,
  lng          double precision,
  avatar_url   text,
  trust_level  text,
  has_manager  boolean
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.id, c.slug, c.name, c.crew_type, c.city, c.zone, c.lat, c.lng, c.avatar_url,
         'claimed'::text            AS trust_level,
         (c.owner_id IS NOT NULL)   AS has_manager
  FROM public.crews c
  WHERE c.show_on_map
    AND c.visibility = 'public'
    AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    AND c.lat BETWEEN p_min_lat AND p_max_lat
    AND c.lng BETWEEN p_min_lng AND p_max_lng
  ORDER BY c.name
  LIMIT least(greatest(p_limit, 1), 1000);
$$;

-- 3. Doppioni e contatti
DROP FUNCTION IF EXISTS public.find_duplicate_crews(text, text, real);
DROP INDEX IF EXISTS public.crews_name_trgm_idx;
DROP TABLE IF EXISTS public.crew_contacts;

-- 4. Trigger e funzioni
DROP TRIGGER IF EXISTS trg_crew_members_require_manager ON public.crew_members;
DROP FUNCTION IF EXISTS public.crew_members_require_manager();

DROP TRIGGER IF EXISTS trg_crews_protect_trust ON public.crews;
DROP FUNCTION IF EXISTS public.crews_protect_trust_columns();

-- come in crews.sql
CREATE OR REPLACE FUNCTION public.add_crew_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.crew_members (crew_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$;

-- 5. Policy di lettura come in crews-fix-rls.sql
DROP POLICY IF EXISTS "crews_select" ON public.crews;
CREATE POLICY "crews_select" ON public.crews FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR public.is_active_crew_member(id)
);

-- 6. Vincoli e colonne
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_directory_consistency_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_visibility_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_visibility_check CHECK (visibility IN ('public', 'private'));
ALTER TABLE public.crews ALTER COLUMN owner_id SET NOT NULL;

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_avatar_url_http_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_schedule_text_len_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_activity_status_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_source_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_trust_level_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_moderation_status_check;

ALTER TABLE public.crews
  DROP COLUMN IF EXISTS last_confirmed_at,
  DROP COLUMN IF EXISTS activity_status,
  DROP COLUMN IF EXISTS schedule_text,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS trust_level,
  DROP COLUMN IF EXISTS moderation_status;
