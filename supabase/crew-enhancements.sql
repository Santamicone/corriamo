-- ============================================================
-- CREW ENHANCEMENTS (SQL #33)
-- URL personalizzato (slug) · immagine di testata (cover_url) ·
-- bacheca del coach (crew_posts) · bucket Storage crew-covers.
--
-- Eseguire dopo: crews.sql (#19), crews-fix-rls.sql (#21)
-- Idempotente: rieseguibile senza effetti collaterali.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonne su crews: slug + cover_url
-- ------------------------------------------------------------
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS cover_url text;

-- unique constraint sullo slug (creato a parte per idempotenza)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crews_slug_key'
  ) THEN
    ALTER TABLE public.crews ADD CONSTRAINT crews_slug_key UNIQUE (slug);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_crews_slug ON public.crews(slug);

-- ------------------------------------------------------------
-- 2. Funzione slugify (accenti → ASCII, spazi/simboli → '-')
--    es. "Città di Udine Runners" → "citta-di-udine-runners"
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crew_slugify(txt text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' FROM
    regexp_replace(
      lower(
        translate(
          txt,
          'àáâäãåèéêëìíîïòóôöõùúûüçñ',
          'aaaaaaeeeeiiiiooooouuuucn'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- ------------------------------------------------------------
-- 3. Backfill slug per le crew esistenti (gestione collisioni)
--    slug base dal nome; se già preso, appende parte dell'id.
-- ------------------------------------------------------------
DO $$
DECLARE
  c record;
  base_slug text;
  final_slug text;
BEGIN
  FOR c IN SELECT id, name FROM public.crews WHERE slug IS NULL LOOP
    base_slug := public.crew_slugify(c.name);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'crew';
    END IF;
    final_slug := base_slug;
    -- se lo slug base è già occupato, suffissa con parte dell'uuid
    IF EXISTS (SELECT 1 FROM public.crews WHERE slug = final_slug) THEN
      final_slug := base_slug || '-' || substring(c.id::text, 1, 6);
    END IF;
    UPDATE public.crews SET slug = final_slug WHERE id = c.id;
  END LOOP;
END$$;

-- ------------------------------------------------------------
-- 4. Helper SECURITY DEFINER: la crew è pubblica?
--    (bypassa RLS per evitare ricorsione, come is_active_crew_member)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crew_is_public(p_crew_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM crews WHERE id = p_crew_id AND visibility = 'public'
  );
$$;

-- ============================================================
-- 5. Bacheca del coach: tabella crew_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crew_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_posts_crew ON public.crew_posts(crew_id, created_at DESC);

ALTER TABLE public.crew_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: visibile a chiunque per le crew pubbliche; ai soli membri attivi per le private
DROP POLICY IF EXISTS "crew_posts_select" ON public.crew_posts;
CREATE POLICY "crew_posts_select" ON public.crew_posts FOR SELECT USING (
  public.crew_is_public(crew_id)
  OR public.is_active_crew_member(crew_id)
);

-- INSERT: solo owner/admin della crew, e solo a proprio nome
DROP POLICY IF EXISTS "crew_posts_insert" ON public.crew_posts;
CREATE POLICY "crew_posts_insert" ON public.crew_posts FOR INSERT WITH CHECK (
  public.is_crew_admin(crew_id)
  AND author_id = auth.uid()
);

-- UPDATE: autore o admin della crew (es. pin/unpin)
DROP POLICY IF EXISTS "crew_posts_update" ON public.crew_posts;
CREATE POLICY "crew_posts_update" ON public.crew_posts FOR UPDATE USING (
  author_id = auth.uid()
  OR public.is_crew_admin(crew_id)
);

-- DELETE: autore o admin della crew
DROP POLICY IF EXISTS "crew_posts_delete" ON public.crew_posts;
CREATE POLICY "crew_posts_delete" ON public.crew_posts FOR DELETE USING (
  author_id = auth.uid()
  OR public.is_crew_admin(crew_id)
);

-- ------------------------------------------------------------
-- 6. Trigger: notifica i membri attivi quando il coach pubblica
--    (specchio di notify_crew_new_run in crews.sql)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_crew_new_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec record;
  crew_name text;
BEGIN
  SELECT name INTO crew_name FROM public.crews WHERE id = NEW.crew_id;

  FOR rec IN
    SELECT user_id FROM public.crew_members
    WHERE crew_id = NEW.crew_id
      AND status = 'active'
      AND user_id != NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
    VALUES (
      rec.user_id,
      'crew_new_post',
      'Nuovo messaggio in ' || crew_name,
      left(NEW.body, 120),
      NULL,
      NEW.author_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_crew_new_post ON public.crew_posts;
CREATE TRIGGER trg_notify_crew_new_post
AFTER INSERT ON public.crew_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_crew_new_post();

-- ============================================================
-- 7. Storage bucket: crew-covers (immagine di testata)
--    path: crew-covers/{crew_id}/cover.<ext>
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crew-covers',
  'crew-covers',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lettura pubblica (le testate sono pubbliche)
DROP POLICY IF EXISTS "Crew covers are publicly accessible" ON storage.objects;
CREATE POLICY "Crew covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crew-covers');

-- Scrittura: solo owner/admin della crew corrispondente alla cartella
DROP POLICY IF EXISTS "Crew admins can upload cover" ON storage.objects;
CREATE POLICY "Crew admins can upload cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'crew-covers'
    AND public.is_crew_admin(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Crew admins can update cover" ON storage.objects;
CREATE POLICY "Crew admins can update cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'crew-covers'
    AND public.is_crew_admin(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Crew admins can delete cover" ON storage.objects;
CREATE POLICY "Crew admins can delete cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'crew-covers'
    AND public.is_crew_admin(((storage.foldername(name))[1])::uuid)
  );
