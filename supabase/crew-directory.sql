-- ============================================================================
-- #50 — SCHEDE INFORMATIVE ("directory") E CREW SENZA PROPRIETARIO
--       Mappa crew, Fase 2a-1 (docs/MAPPA-CREW.md §2.4, §3.2, §4)
-- Eseguire dopo: crew-map.sql (#49).
-- ============================================================================
-- Cosa fa:
--   * una crew può NON avere proprietario ("scheda informativa": importata o inserita dall'admin);
--   * le schede informative hanno visibility = 'directory': l'app mobile già pubblicata (1.0.x) legge
--     solo visibility = 'public', quindi NON le vede e non può mandare richieste a una crew senza
--     gestore; passano a 'public' solo quando qualcuno le rivendica (Fase 2b);
--   * nuove colonne: moderation_status, trust_level, source, created_by, schedule_text,
--     activity_status, last_confirmed_at;
--   * invariante: NESSUN proprietario <=> visibility 'directory' <=> trust_level 'unclaimed';
--   * i campi di fiducia NON si possono scrivere dal client (trigger): un owner non può
--     auto-verificarsi né rendere "directory" la propria crew;
--   * crew_contacts: email di contatto PRIVATE (nessuna policy: solo service-role);
--   * find_duplicate_crews(): controllo doppioni per l'import dell'admin (solo service-role);
--   * crews_in_bbox() ora include anche le schede informative (stessa firma e stesse colonne).
--
-- COMPATIBILITÀ: additivo per le crew esistenti (restano public/claimed/published/active, ognuna col
-- suo proprietario). Cambiano però una policy (crews_select) e due trigger: vedi i commenti.
-- Rollback: crew-directory-rollback.sql — ATTENZIONE: CANCELLA le schede informative (senza proprietario)
-- e i contatti privati, perché senza #50 una crew deve avere un proprietario. Esportarle prima.
-- ============================================================================

-- 1. Nuove colonne --------------------------------------------------------------
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS moderation_status  text        NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS trust_level        text        NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS source             text        NOT NULL DEFAULT 'utente',
  ADD COLUMN IF NOT EXISTS created_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS schedule_text      text,
  ADD COLUMN IF NOT EXISTS activity_status    text        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_confirmed_at  timestamptz;

-- Le crew esistenti le ha create il loro proprietario
UPDATE public.crews SET created_by = owner_id WHERE created_by IS NULL AND owner_id IS NOT NULL;

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_moderation_status_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_moderation_status_check
  CHECK (moderation_status IN ('published', 'pending', 'rejected', 'hidden'));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_trust_level_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_trust_level_check
  CHECK (trust_level IN ('unclaimed', 'claimed', 'verified'));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_source_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_source_check
  CHECK (source IN ('editoriale', 'utente'));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_activity_status_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_activity_status_check
  CHECK (activity_status IN ('active', 'inactive'));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_schedule_text_len_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_schedule_text_len_check
  CHECK (char_length(coalesce(schedule_text, '')) <= 300);

-- Il logo (avatar_url) finisce in un <img>: solo http(s). NOT VALID: non controlla le righe già presenti.
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_avatar_url_http_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_avatar_url_http_check
  CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://') NOT VALID;

-- 2. visibility: aggiunge 'directory' ---------------------------------------------
-- Il vincolo originale ha un nome automatico: si cerca per contenuto, non per nome.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.crews'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%visibility%'
  LOOP
    EXECUTE format('ALTER TABLE public.crews DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.crews ADD CONSTRAINT crews_visibility_check
  CHECK (visibility IN ('public', 'private', 'directory'));

-- 3. Proprietario facoltativo + invarianti -----------------------------------------
ALTER TABLE public.crews ALTER COLUMN owner_id DROP NOT NULL;

-- Nessun proprietario <=> scheda 'directory' <=> trust_level 'unclaimed'.
-- (La rivendicazione cambia i tre valori nella stessa UPDATE, quindi il vincolo regge.)
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_directory_consistency_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_directory_consistency_check
  CHECK ((owner_id IS NULL) = (visibility = 'directory')
     AND (owner_id IS NULL) = (trust_level = 'unclaimed'));

-- 4. Trigger che protegge i campi di fiducia ----------------------------------------
-- Il client (ruoli 'authenticated' e 'anon') NON può impostarli né modificarli. Passano invece
-- service_role (API admin), l'SQL Editor (postgres) e le funzioni SECURITY DEFINER (rivendicazione,
-- trasferimento di proprietà): in quei casi current_user non è authenticated/anon.
CREATE OR REPLACE FUNCTION public.crews_protect_trust_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.visibility = 'directory' OR NEW.owner_id IS NULL THEN
      RAISE EXCEPTION 'Una crew deve avere un proprietario' USING ERRCODE = '42501';
    END IF;
    -- Valori forzati: chi crea una crew parte sempre "reclamata", pubblicata e attiva
    NEW.trust_level       := 'claimed';
    NEW.moderation_status := 'published';
    NEW.source            := 'utente';
    NEW.created_by        := auth.uid();
    NEW.activity_status   := 'active';
    NEW.last_confirmed_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.trust_level       IS DISTINCT FROM OLD.trust_level
  OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
  OR NEW.source            IS DISTINCT FROM OLD.source
  OR NEW.created_by        IS DISTINCT FROM OLD.created_by
  OR NEW.activity_status   IS DISTINCT FROM OLD.activity_status
  OR NEW.last_confirmed_at IS DISTINCT FROM OLD.last_confirmed_at
  OR NEW.owner_id          IS DISTINCT FROM OLD.owner_id
  OR (NEW.visibility = 'directory') IS DISTINCT FROM (OLD.visibility = 'directory') THEN
    RAISE EXCEPTION 'Campo non modificabile' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crews_protect_trust ON public.crews;
CREATE TRIGGER trg_crews_protect_trust
  BEFORE INSERT OR UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.crews_protect_trust_columns();

-- 5. Trigger esistenti che assumevano un proprietario --------------------------------
-- Il proprietario diventa membro 'owner' alla creazione: con owner_id nullo non c'è nessuno da inserire.
CREATE OR REPLACE FUNCTION public.add_crew_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.crew_members (crew_id, user_id, role, status)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  END IF;
  RETURN NEW;
END;
$$;

-- Nessuno può entrare in (o chiedere di entrare in) una crew senza gestore: la policy
-- crew_members_insert_self lascia a chiunque inserire sé stesso in QUALSIASI crew.
CREATE OR REPLACE FUNCTION public.crew_members_require_manager()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crews WHERE id = NEW.crew_id AND owner_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Questa crew non ha ancora un gestore' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crew_members_require_manager ON public.crew_members;
CREATE TRIGGER trg_crew_members_require_manager
  BEFORE INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.crew_members_require_manager();

-- 6. Lettura: le schede informative le legge chiunque, ma solo se pubblicate e attive ----
-- (Spec §4.4: le pubbliche si leggono solo se 'published'; le crew 'hidden' o 'inattive' restano
-- visibili al proprietario e ai membri.) Le crew esistenti sono published/active: nessun cambiamento.
DROP POLICY IF EXISTS "crews_select" ON public.crews;
CREATE POLICY "crews_select" ON public.crews FOR SELECT USING (
  (visibility IN ('public', 'directory')
     AND moderation_status = 'published'
     AND activity_status   = 'active')
  OR owner_id = auth.uid()
  OR public.is_active_crew_member(id)
);

-- 7. Contatti privati ------------------------------------------------------------------
-- L'email di contatto NON sta in `crews` (leggibile da tutti, app compresa). RLS attiva e NESSUNA
-- policy: la leggono/scrivono solo il service-role (API admin). In UI si mostra mascherata.
CREATE TABLE IF NOT EXISTS public.crew_contacts (
  crew_id    uuid PRIMARY KEY REFERENCES public.crews(id) ON DELETE CASCADE,
  email      text NOT NULL,
  origin     text NOT NULL DEFAULT 'pubblica' CHECK (origin IN ('pubblica', 'dichiarata')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crew_contacts ENABLE ROW LEVEL SECURITY;

-- 8. Doppioni (per l'import dell'admin) -------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS crews_name_trgm_idx ON public.crews USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.find_duplicate_crews(
  p_name    text,
  p_city    text,
  p_min_sim real DEFAULT 0.45
)
RETURNS TABLE (
  id                uuid,
  slug              text,
  name              text,
  city              text,
  source            text,
  trust_level       text,
  moderation_status text,
  name_sim          real
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.id, c.slug, c.name, c.city, c.source, c.trust_level, c.moderation_status,
         round(similarity(c.name, p_name)::numeric, 2)::real AS name_sim
  FROM public.crews c
  WHERE similarity(c.name, p_name) >= p_min_sim
    AND (p_city IS NULL OR c.city IS NULL
         OR lower(c.city) = lower(p_city)
         OR similarity(c.name, p_name) >= 0.8)
  ORDER BY similarity(c.name, p_name) DESC
  LIMIT 5;
$$;

-- Solo il service-role (le API admin): vede anche le schede nascoste o in attesa
REVOKE ALL ON FUNCTION public.find_duplicate_crews(text, text, real) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_crews(text, text, real) TO service_role;

-- 9. La funzione della mappa include le schede informative ---------------------------------
-- Stessa firma e stesse colonne di #49: l'app non si accorge di nulla. trust_level ora è quello vero.
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
         c.trust_level,
         (c.owner_id IS NOT NULL) AS has_manager
  FROM public.crews c
  WHERE c.show_on_map
    AND c.visibility IN ('public', 'directory')
    AND c.moderation_status = 'published'
    AND c.activity_status   = 'active'
    AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    AND c.lat BETWEEN p_min_lat AND p_max_lat
    AND c.lng BETWEEN p_min_lng AND p_max_lng
  ORDER BY c.name
  LIMIT least(greatest(p_limit, 1), 1000);
$$;

-- 10. Verifica (sola lettura) ------------------------------------------------------------------
-- select count(*) filter (where owner_id is null) as senza_proprietario, count(*) as totale from public.crews;  -- 0 / 2
-- select id, name, visibility, trust_level, moderation_status, source from public.crews;                       -- public/claimed/published/utente
-- select * from public.crews_in_bbox(35, 6, 48, 19);                                                           -- come prima
