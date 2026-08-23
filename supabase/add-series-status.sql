-- Aggiunge lo stato attiva/in_pausa alle serie ricorrenti.
-- Permette all'organizzatore di mettere in pausa una serie (es. il locale
-- chiude d'estate, l'organizzatore va in vacanza) senza doverla eliminare:
-- la serie sparisce dalla bacheca pubblica ma resta visibile e gestibile
-- nell'area personale dell'organizzatore, che può riprenderla quando vuole.

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('attiva', 'in_pausa'))
    DEFAULT 'attiva'
    NOT NULL;

-- Tutte le serie esistenti restano attive (default 'attiva')
-- Nessuna migrazione dati necessaria
