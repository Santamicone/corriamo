-- Dedup potenziato del catalogo gare (calendario gare) — SQL #28
-- Affianca al match "country + data + distanza" una SIMILARITÀ SUL NOME (pg_trgm),
-- così una stessa gara presente in più fonti (es. una maratona IT in AIMS *e* in
-- Podisti.Net) viene SEGNALATA come possibile doppione. Non fonde né elimina nulla
-- in automatico: la decisione è sempre umana (pagina /calendario-gare/duplicati).
--
-- Riusato anche dall'ingestione AI (#3): find_duplicate_races() controlla un
-- candidato contro il catalogo prima di inserirlo come 'pending'.
--
-- Esegui in Supabase Dashboard → SQL Editor (dopo races.sql e races-moderation.sql).

-- 1. Estensione trigram + indice per la ricerca di similarità sul nome
create extension if not exists pg_trgm;
create index if not exists races_name_trgm_idx
  on public.races using gin (name gin_trgm_ops);

-- 2. Coppie marcate "NON è un doppione": non ricompaiono nella revisione.
--    Ordine canonico race_a < race_b (evita la coppia speculare).
create table if not exists public.race_not_duplicates (
  race_a     uuid not null references public.races(id) on delete cascade,
  race_b     uuid not null references public.races(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  primary key (race_a, race_b),
  check (race_a < race_b)
);

alter table public.race_not_duplicates enable row level security;

create policy "Admins manage not-duplicates"
  on public.race_not_duplicates for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 3. Vista delle coppie candidate a doppione (per la pagina admin).
--    security_invoker: applica la RLS di chi interroga (le pubblicate sono
--    comunque leggibili). Filtri: stesso paese, data entro ±3 giorni,
--    similarità nome ≥ 0.35, distanze compatibili (o una delle due vuota).
create or replace view public.race_duplicate_candidates
with (security_invoker = on) as
select
  a.id as id_a, a.name as name_a, a.city as city_a, a.region as region_a,
  a.country as country_a, a.event_date as date_a, a.distances as distances_a,
  a.source as source_a, a.official_url as url_a,
  b.id as id_b, b.name as name_b, b.city as city_b, b.region as region_b,
  b.country as country_b, b.event_date as date_b, b.distances as distances_b,
  b.source as source_b, b.official_url as url_b,
  round(similarity(a.name, b.name)::numeric, 2) as name_sim,
  abs(a.event_date - b.event_date) as days_apart
from public.races a
join public.races b
  on a.id < b.id
 and a.status = 'published'
 and b.status = 'published'
 and a.country = b.country
 and abs(a.event_date - b.event_date) <= 3
 and similarity(a.name, b.name) >= 0.35
 and (a.distances && b.distances
      or cardinality(a.distances) = 0
      or cardinality(b.distances) = 0)
where not exists (
  select 1 from public.race_not_duplicates nd
  where nd.race_a = a.id and nd.race_b = b.id
)
order by name_sim desc, days_apart;

-- 4. Funzione riutilizzabile: dato un candidato, torna le gare simili già in
--    catalogo. Usata dall'ingestione AI (#3) e utilizzabile per check puntuali.
create or replace function public.find_duplicate_races(
  p_name       text,
  p_event_date date,
  p_country    text default 'IT',
  p_distances  text[] default '{}',
  p_min_sim    real default 0.35,
  p_days       int default 3
)
returns table (
  id           uuid,
  name         text,
  city         text,
  event_date   date,
  distances    text[],
  source       text,
  official_url text,
  name_sim     real
)
language sql
stable
as $$
  select r.id, r.name, r.city, r.event_date, r.distances, r.source, r.official_url,
         round(similarity(r.name, p_name)::numeric, 2)::real as name_sim
  from public.races r
  where r.status = 'published'
    and r.country = p_country
    and abs(r.event_date - p_event_date) <= p_days
    and similarity(r.name, p_name) >= p_min_sim
    and (cardinality(p_distances) = 0
         or cardinality(r.distances) = 0
         or r.distances && p_distances)
  order by similarity(r.name, p_name) desc;
$$;

-- 5. Grant espliciti per PostgREST (ruolo authenticated): la RLS resta il vero
--    controllo d'accesso; questi grant evitano "permission denied" sulle nuove
--    relazioni. La vista è security_invoker → applica comunque la RLS delle races.
grant select, insert, delete on public.race_not_duplicates to authenticated;
grant select on public.race_duplicate_candidates to authenticated;
grant execute on function public.find_duplicate_races(text, date, text, text[], real, int) to authenticated;
