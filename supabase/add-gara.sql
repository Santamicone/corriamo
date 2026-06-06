-- Aggiunge il supporto per le "gare": entry nella tabella runs con type='gara'
-- e colonne specifiche per trovare pacer/compagni di gara.

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'allenamento'
    CHECK (type IN ('allenamento', 'gara')),
  ADD COLUMN IF NOT EXISTS race_name text,
  ADD COLUMN IF NOT EXISTS race_distance text
    CHECK (race_distance IN ('5k', '10k', '21k', '42k')),
  ADD COLUMN IF NOT EXISTS race_target_time text,
  ADD COLUMN IF NOT EXISTS race_registered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';

-- Indice per filtrare per tipo nella bacheca
CREATE INDEX IF NOT EXISTS idx_runs_type ON runs (type);

-- Indice GIN per looking_for (array contains)
CREATE INDEX IF NOT EXISTS idx_runs_looking_for ON runs USING GIN (looking_for);
