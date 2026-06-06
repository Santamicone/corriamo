-- Chat di gruppo per corsa
-- Messaggi visibili e scrivibili solo da organizzatore e partecipanti approvati

CREATE TABLE public.run_chat (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid REFERENCES public.runs(id)    ON DELETE CASCADE NOT NULL,
  author_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz DEFAULT now()
);

-- Indice per query per corsa in ordine cronologico
CREATE INDEX idx_run_chat_run_id ON public.run_chat (run_id, created_at);

-- RLS
ALTER TABLE public.run_chat ENABLE ROW LEVEL SECURITY;

-- Helper: controlla se l'utente è organizzatore o partecipante approvato
CREATE OR REPLACE FUNCTION public.can_access_run_chat(p_run_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.runs
    WHERE id = p_run_id AND organizer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.participations
    WHERE run_id = p_run_id
      AND user_id = auth.uid()
      AND status = 'approvata'
  );
$$;

-- SELECT: organizzatore o partecipante approvato
CREATE POLICY "run_chat_select" ON public.run_chat
  FOR SELECT USING (public.can_access_run_chat(run_id));

-- INSERT: stessa condizione + solo per sé stessi
CREATE POLICY "run_chat_insert" ON public.run_chat
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND public.can_access_run_chat(run_id)
  );

-- DELETE: solo i propri messaggi
CREATE POLICY "run_chat_delete" ON public.run_chat
  FOR DELETE USING (author_id = auth.uid());

-- Abilitare Realtime in Supabase Dashboard:
-- Database → Replication → run_chat → INSERT, DELETE
