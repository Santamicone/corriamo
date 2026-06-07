-- Check-in al ritrovo (Purple Screen)
-- Registra i runner che hanno attivato "Sono qui" prima della corsa

CREATE TABLE public.check_ins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid REFERENCES public.runs(id)    ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checked_in_at timestamptz DEFAULT now(),
  UNIQUE (run_id, user_id)
);

CREATE INDEX idx_check_ins_run_id ON public.check_ins (run_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Solo organizzatore e partecipanti approvati possono vedere i check-in
CREATE POLICY "check_ins_select" ON public.check_ins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.runs WHERE id = check_ins.run_id AND organizer_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.participations
            WHERE run_id = check_ins.run_id AND user_id = auth.uid() AND status = 'approvata')
  );

-- Ognuno può fare check-in solo per sé stesso (con accesso alla corsa)
CREATE POLICY "check_ins_insert" ON public.check_ins
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.runs WHERE id = run_id AND organizer_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM public.participations
              WHERE run_id = run_id AND user_id = auth.uid() AND status = 'approvata')
    )
  );

-- Ognuno può rimuovere solo il proprio check-in
CREATE POLICY "check_ins_delete" ON public.check_ins
  FOR DELETE USING (user_id = auth.uid());

-- Abilitare Realtime in Supabase Dashboard:
-- Database → Replication → check_ins → INSERT, DELETE
