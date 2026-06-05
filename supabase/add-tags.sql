-- Tag caratteristiche corsa/serie
-- Esegui in Supabase Dashboard → SQL Editor

alter table public.runs
  add column if not exists tags text[] default '{}';

alter table public.series
  add column if not exists tags text[] default '{}';

-- Indice GIN per query veloci su array (es: WHERE tags @> ARRAY['trail'])
create index if not exists runs_tags_idx   on public.runs   using gin(tags);
create index if not exists series_tags_idx on public.series using gin(tags);

comment on column public.runs.tags   is 'Array di tag: no_chiacchiere, caffe_dopo, trail, ecc.';
comment on column public.series.tags is 'Array di tag: no_chiacchiere, caffe_dopo, trail, ecc.';
