-- ============================================================
-- ADD CREW LOCATION (SQL #38)
-- Eseguire dopo: crew-attendance.sql (#37)
-- Città/zona esplicite sulla crew, per il filtro geografico
-- nella discovery pubblica "Scopri le Crew".
-- ============================================================

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS zone text;

CREATE INDEX IF NOT EXISTS idx_crews_city ON public.crews(city);
