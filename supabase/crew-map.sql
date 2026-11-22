-- ============================================================================
-- #49 — MAPPA DELLE CREW, FASE 1 (docs/MAPPA-CREW.md §3.1)
-- Eseguire dopo: add-crew-location.sql (#38). Additivo: nessuna colonna o funzione
-- esistente cambia, quindi l'app mobile già pubblicata (1.0.x) non è toccata.
-- ============================================================================
-- Aggiunge a `crews` ciò che serve per comparire su una mappa:
--   lat/lng        coordinate GIÀ ARROTONDATE (mai il punto esatto: vedi sotto)
--   pin_precision  'exact' | 'area' (default) | 'city'
--   show_on_map    OPT-IN del proprietario (default false: nessuna crew esistente compare da sola)
--   meeting_point  ritrovo in testo; website_url / instagram_url: link pubblici della scheda
--
-- PRIVACY: la RLS è per riga, quindi chi legge una crew pubblica legge TUTTE le sue colonne,
-- app mobile compresa. Per questo un trigger arrotonda le coordinate PRIMA di scriverle e il
-- valore esatto non viene mai salvato:
--     exact -> 5 decimali (~1 m)   area -> 2 decimali (~1 km)   city -> 2 decimali
-- Per 'city' il client manda già il centro della città.
--
-- La funzione crews_in_bbox() è il contratto di lettura per sito e app: restituisce solo campi
-- pubblici. Le colonne `trust_level` e `has_manager` ci sono già OGGI (valori fissi/derivati) così la
-- firma NON cambierà quando arriveranno le schede non reclamate (Fase 2a).
--
-- Rollback: crew-map-rollback.sql
-- ============================================================================

-- 1. Colonne ------------------------------------------------------------------
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS lat             double precision,
  ADD COLUMN IF NOT EXISTS lng             double precision,
  ADD COLUMN IF NOT EXISTS pin_precision   text    NOT NULL DEFAULT 'area',
  ADD COLUMN IF NOT EXISTS show_on_map     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meeting_point   text,
  ADD COLUMN IF NOT EXISTS website_url     text,
  ADD COLUMN IF NOT EXISTS instagram_url   text;

-- Vincoli (con nomi, per poterli togliere nel rollback)
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_pin_precision_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_pin_precision_check
  CHECK (pin_precision IN ('exact', 'area', 'city'));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_coords_range_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_coords_range_check
  CHECK ((lat IS NULL AND lng IS NULL)
      OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180));

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_map_text_len_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_map_text_len_check
  CHECK (char_length(coalesce(meeting_point, '')) <= 200
     AND char_length(coalesce(website_url, '')) <= 300
     AND char_length(coalesce(instagram_url, '')) <= 300);

-- I link finiscono in un href: solo http(s), mai javascript: o altri schemi
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_map_urls_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_map_urls_check
  CHECK ((website_url   IS NULL OR website_url   ~* '^https?://')
     AND (instagram_url IS NULL OR instagram_url ~* '^https?://'));

-- Slug riservati alle pagine statiche sotto /crew/ (altrimenti la crew non sarebbe raggiungibile
-- dallo slug). NOT VALID: non controlla le righe già presenti, vale per le nuove scritture.
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_slug_reserved_check;
ALTER TABLE public.crews ADD CONSTRAINT crews_slug_reserved_check
  CHECK (slug IS NULL OR slug NOT IN ('mappa', 'citta', 'nuova', 'invite', 'segnala')) NOT VALID;

-- 2. Arrotondamento delle coordinate alla scrittura ----------------------------
CREATE OR REPLACE FUNCTION public.crews_round_coords()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  digits integer;
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    NEW.lat := NULL;
    NEW.lng := NULL;
    RETURN NEW;
  END IF;

  digits := CASE NEW.pin_precision WHEN 'exact' THEN 5 ELSE 2 END;
  NEW.lat := round(NEW.lat::numeric, digits)::double precision;
  NEW.lng := round(NEW.lng::numeric, digits)::double precision;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crews_round_coords ON public.crews;
CREATE TRIGGER trg_crews_round_coords
  BEFORE INSERT OR UPDATE OF lat, lng, pin_precision ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.crews_round_coords();

-- 3. Indice per la mappa -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crews_map
  ON public.crews (lat, lng)
  WHERE show_on_map AND lat IS NOT NULL AND lng IS NOT NULL;

-- 4. Lettura per sito e app ----------------------------------------------------
-- SECURITY INVOKER: valgono le policy di `crews` (le pubbliche le legge anche chi non ha fatto
-- l'accesso). Restituisce SOLO campi pubblici. Modifiche future: solo additive, mai cambiare le
-- colonne restituite (le userà l'app mobile, che non si aggiorna in tempo reale).
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
         'claimed'::text            AS trust_level,   -- Fase 2a: diventerà c.trust_level
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

GRANT EXECUTE ON FUNCTION public.crews_in_bbox(double precision, double precision, double precision, double precision, integer)
  TO anon, authenticated;

-- 5. Verifica (sola lettura) ---------------------------------------------------
-- select column_name from information_schema.columns
--   where table_name = 'crews' and column_name in ('lat','lng','pin_precision','show_on_map','meeting_point','website_url','instagram_url');
-- select * from public.crews_in_bbox(35, 6, 48, 19);   -- all'inizio: 0 righe (opt-in)
