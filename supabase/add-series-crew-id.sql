-- ============================================================
-- ADD SERIES CREW ID (SQL #39)
-- Eseguire dopo: add-crew-location.sql (#38)
-- Collega le serie ricorrenti a una crew, sul modello di
-- runs.crew_id (crews.sql), per mostrare gli appuntamenti fissi
-- di una crew nella discovery pubblica.
-- ============================================================

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_series_crew_id ON public.series(crew_id);
