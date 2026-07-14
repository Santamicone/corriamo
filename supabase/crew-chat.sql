-- ============================================================
-- CREW CHAT (SQL #35)
-- Chat di gruppo privata della crew — distinta da:
--   · crew_posts  (bacheca del coach, unidirezionale owner→membri)
--   · run_chat    (chat legata al singolo evento/corsa)
-- Scrivono e leggono SOLO i membri attivi (anche per crew pubbliche).
--
-- Eseguire dopo: crews.sql (#19), crews-fix-rls.sql (#21)
-- Idempotente: rieseguibile senza effetti collaterali.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabella crew_chat (specchio di run_chat)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_chat_crew ON public.crew_chat(crew_id, created_at);

ALTER TABLE public.crew_chat ENABLE ROW LEVEL SECURITY;

-- SELECT: solo i membri attivi (chat riservata, anche per crew pubbliche)
DROP POLICY IF EXISTS "crew_chat_select" ON public.crew_chat;
CREATE POLICY "crew_chat_select" ON public.crew_chat FOR SELECT USING (
  public.is_active_crew_member(crew_id)
);

-- INSERT: solo membri attivi, e solo a proprio nome
DROP POLICY IF EXISTS "crew_chat_insert" ON public.crew_chat;
CREATE POLICY "crew_chat_insert" ON public.crew_chat FOR INSERT WITH CHECK (
  public.is_active_crew_member(crew_id)
  AND author_id = auth.uid()
);

-- DELETE: l'autore del messaggio o un admin/owner della crew (moderazione)
DROP POLICY IF EXISTS "crew_chat_delete" ON public.crew_chat;
CREATE POLICY "crew_chat_delete" ON public.crew_chat FOR DELETE USING (
  author_id = auth.uid()
  OR public.is_crew_admin(crew_id)
);

-- ------------------------------------------------------------
-- 2. Realtime: abilita la pubblicazione per la chat crew
--    (necessario per l'aggiornamento live dei messaggi)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crew_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_chat;
  END IF;
END$$;
