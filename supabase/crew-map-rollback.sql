-- Rollback di crew-map.sql (#49). Elimina anche i dati di mappa inseriti dai proprietari
-- (coordinate, ritrovo, link, scelta di comparire in mappa). Il resto delle crew non cambia.

DROP FUNCTION IF EXISTS public.crews_in_bbox(double precision, double precision, double precision, double precision, integer);

DROP INDEX IF EXISTS public.idx_crews_map;

DROP TRIGGER IF EXISTS trg_crews_round_coords ON public.crews;
DROP FUNCTION IF EXISTS public.crews_round_coords();

ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_slug_reserved_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_map_urls_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_map_text_len_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_coords_range_check;
ALTER TABLE public.crews DROP CONSTRAINT IF EXISTS crews_pin_precision_check;

ALTER TABLE public.crews
  DROP COLUMN IF EXISTS instagram_url,
  DROP COLUMN IF EXISTS website_url,
  DROP COLUMN IF EXISTS meeting_point,
  DROP COLUMN IF EXISTS show_on_map,
  DROP COLUMN IF EXISTS pin_precision,
  DROP COLUMN IF EXISTS lng,
  DROP COLUMN IF EXISTS lat;
