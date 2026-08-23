-- Fix bug: il form di creazione serie invia `location_public` anche per la
-- tabella `series`, ma la colonna era stata aggiunta solo a `runs`
-- (add-location-public.sql). Risultato: ogni creazione di serie falliva con
-- "Could not find the 'location_public' column of 'series' in the schema cache".

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS location_public boolean DEFAULT true;

-- Tutte le serie esistenti rimangono pubbliche (default true)
-- Nessuna migrazione dati necessaria
