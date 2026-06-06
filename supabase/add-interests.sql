-- Tabella "Mi interessa" — interesse leggero, automatico, senza approvazione

CREATE TABLE public.interests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid REFERENCES public.runs(id)    ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (run_id, user_id)
);

CREATE INDEX idx_interests_run_id  ON public.interests (run_id);
CREATE INDEX idx_interests_user_id ON public.interests (user_id);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere (per contare gli interessi nelle card)
CREATE POLICY "interests_select" ON public.interests
  FOR SELECT USING (true);

-- Ognuno può segnare il proprio interesse
CREATE POLICY "interests_insert" ON public.interests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ognuno può rimuovere solo il proprio
CREATE POLICY "interests_delete" ON public.interests
  FOR DELETE USING (user_id = auth.uid());
