-- Modifica corsa: aggiunta updated_at su runs
-- Eseguire su Supabase Dashboard → SQL Editor

-- Colonna updated_at
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION set_runs_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION set_runs_updated_at();
