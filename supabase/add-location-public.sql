-- Aggiunge il flag location_public alle corse:
-- true (default) = luogo visibile a tutti
-- false = luogo visibile solo a organizzatore e partecipanti approvati

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS location_public boolean DEFAULT true;

-- Tutte le corse esistenti rimangono pubbliche (default true)
-- Nessuna migrazione dati necessaria
