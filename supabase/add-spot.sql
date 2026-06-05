-- Corse spontanee / ultimo momento
-- Esegui in Supabase Dashboard → SQL Editor

alter table public.runs
  add column if not exists is_spot boolean default false;

comment on column public.runs.is_spot
  is 'true = corsa spontanea (proposta con meno di 3h di anticipo o marcata come tale)';

create index if not exists runs_spot_idx
  on public.runs(is_spot, date, time)
  where is_spot = true and status = 'aperta';
