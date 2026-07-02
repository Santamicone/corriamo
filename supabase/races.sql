-- Catalogo gare (eventi reali) — sezione /calendario-gare
-- Distinta dai post community type='gara' su public.runs.
-- Popolata da tre motori d'import: AIMS ICS (source='aims'),
-- FIDAL maratone/mezze (source='fidal'), costanti Major/SuperHalfs
-- (source='editoriale'), oltre alle segnalazioni utenti (source='utente').
-- Esegui in Supabase Dashboard → SQL Editor

create table public.races (
  id                  uuid        default uuid_generate_v4() primary key,
  slug                text        not null unique,                    -- es. 'maratona-di-roma-2027'
  name                text        not null,
  city                text        not null,
  region              text,                                           -- es. 'Lazio' (null per estero)
  country             text        not null default 'IT',              -- ISO-2
  event_date          date        not null,
  end_date            date,                                           -- per eventi multi-giorno
  distances           text[]      not null default '{}',              -- 5k|10k|21k|42k|trail|ultra|other
  race_type           text        not null default 'competitiva',     -- competitiva|non_competitiva|federale|internazionale|charity
  level_hint          text,                                           -- principiante|intermedio|avanzato|agonista
  elevation_m         integer,
  course_profile      text[]      default '{}',                       -- veloce|panoramico|tecnico|cittadino|collinare
  participants_est    integer,
  official_url        text,                                           -- deep-link FIDAL / sito ufficiale
  registration_status text        not null default 'da_verificare',   -- aperte|chiuse|da_verificare
  circuit             text,                                           -- major|superhalfs|wa_label|aims
  tags                text[]      default '{}',                       -- da_pb|turistica|prima_mezza|prima_maratona|affollata|clima_fresco...
  gpx_path            text,                                           -- collega al tool Strategia gara
  featured            boolean     not null default false,
  source              text        not null default 'editoriale',      -- editoriale|utente|aims|fidal
  external_ref        text,                                           -- UID AIMS / COD FIDAL (dedup import)
  status              text        not null default 'published',       -- published|pending|rejected
  created_by          uuid        references public.profiles(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.races enable row level security;

-- Lettura pubblica: solo gare pubblicate
create policy "Published races are public"
  on public.races for select
  using (status = 'published');

-- Gli utenti loggati possono proporre una gara, sempre come 'pending'
create policy "Users can propose races"
  on public.races for insert
  with check (
    auth.uid() = created_by
    and status = 'pending'
    and source = 'utente'
  );

-- Indici
create index races_event_date_idx     on public.races(event_date);
create index races_country_region_idx on public.races(country, region);
create index races_distances_gin      on public.races using gin(distances);
create index races_tags_gin           on public.races using gin(tags);

-- Idempotenza degli import: nessun duplicato per stessa fonte + riferimento esterno
create unique index races_source_ref_idx
  on public.races(source, external_ref)
  where external_ref is not null;

-- Trigger updated_at (riusa la funzione già definita in reviews.sql)
create trigger races_updated_at
  before update on public.races
  for each row execute procedure public.set_updated_at();
