-- Co-organizzatore per le serie ricorrenti (richiesta feedback utente).
-- Un secondo runner che può gestire la serie insieme all'organizzatore
-- (utile quando chi crea la serie non è sempre presente agli allenamenti).

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS co_organizer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Il co-organizzatore può modificare la serie (titolo, pausa/ripresa, ecc.)
-- esattamente come l'organizzatore principale.
DROP POLICY IF EXISTS "Organizer can update their series" ON public.series;
CREATE POLICY "Organizer can update their series"
  ON public.series FOR UPDATE
  USING (auth.uid() = organizer_id OR auth.uid() = co_organizer_id);

-- Nessuna migrazione dati necessaria: co_organizer_id è null per le serie esistenti
