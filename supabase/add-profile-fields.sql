-- Arricchimento profilo runner:
-- età, perché corro, personal best, nuovi livelli, rimozione ritmo min/max dal form

-- 1. Estendi i valori accettati per profiles.level
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_level_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_level_check
  CHECK (level IN ('principiante', 'intermedio', 'avanzato', 'tutti', 'amatore_gare', 'atleta'));

-- 2. Nuove colonne
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age integer CHECK (age IS NULL OR (age >= 10 AND age <= 100)),
  ADD COLUMN IF NOT EXISTS why_i_run text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pb_5k text,
  ADD COLUMN IF NOT EXISTS pb_10k text,
  ADD COLUMN IF NOT EXISTS pb_21k text,
  ADD COLUMN IF NOT EXISTS pb_42k text;

-- Nota: pace_min e pace_max rimangono nel DB per compatibilità con i dati esistenti,
-- ma non vengono più mostrati/modificati dall'interfaccia.
