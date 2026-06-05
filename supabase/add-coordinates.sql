-- Aggiunge le colonne lat/lng alla tabella runs
-- Esegui in Supabase Dashboard → SQL Editor

alter table public.runs
  add column if not exists lat numeric(10, 7),
  add column if not exists lng numeric(10, 7);

-- Indice spaziale per query geografiche future
create index if not exists runs_lat_lng_idx on public.runs(lat, lng)
  where lat is not null and lng is not null;

comment on column public.runs.lat is 'Latitudine del punto di ritrovo (da geocoding Nominatim)';
comment on column public.runs.lng is 'Longitudine del punto di ritrovo (da geocoding Nominatim)';
