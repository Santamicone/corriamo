-- Preferenza utente: filtrare automaticamente la bacheca per la propria città
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS filter_by_city boolean DEFAULT false;
