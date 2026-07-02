-- Ponte tra i post community (public.runs, type='gara') e il catalogo gare (public.races).
-- Permette a una scheda del calendario di mostrare "Chi ci va?" leggendo i post collegati,
-- riusando interessi e messaggi esistenti. Colonna nullable: i post gara restano validi senza collegamento.
-- Esegui in Supabase Dashboard → SQL Editor (dopo races.sql)

alter table public.runs
  add column race_id uuid references public.races(id) on delete set null;

create index runs_race_id_idx on public.runs(race_id) where race_id is not null;
