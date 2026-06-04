-- Corriamo? — Schema Supabase
-- Esegui questo SQL nell'editor SQL del tuo progetto Supabase

-- Abilita UUID
create extension if not exists "uuid-ossp";

-- =====================
-- PROFILES
-- =====================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  city text,
  level text check (level in ('principiante', 'intermedio', 'avanzato', 'tutti')) default 'tutti',
  pace_min numeric(4,2),
  pace_max numeric(4,2),
  bio text,
  strava_url text,
  garmin_url text,
  instagram_url text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- =====================
-- SERIES
-- =====================
create table public.series (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  location text not null,
  city text not null,
  distance_km numeric(5,2),
  pace_target text,
  level text check (level in ('principiante', 'intermedio', 'avanzato', 'tutti')) default 'tutti',
  max_participants integer,
  is_no_drop boolean default false,
  recurrence_type text check (recurrence_type in ('settimanale', 'bisettimanale', 'mensile')) not null,
  recurrence_day integer check (recurrence_day between 0 and 6) not null,
  recurrence_time time not null,
  start_date date not null,
  end_date date,
  created_at timestamptz default now()
);

alter table public.series enable row level security;

create policy "Series are viewable by everyone"
  on public.series for select using (true);

create policy "Authenticated users can create series"
  on public.series for insert with check (auth.uid() = organizer_id);

create policy "Organizer can update their series"
  on public.series for update using (auth.uid() = organizer_id);

create policy "Organizer can delete their series"
  on public.series for delete using (auth.uid() = organizer_id);

-- =====================
-- RUNS
-- =====================
create table public.runs (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  series_id uuid references public.series(id) on delete set null,
  title text not null,
  description text,
  date date not null,
  time time not null,
  location text not null,
  city text not null,
  distance_km numeric(5,2),
  pace_target text,
  level text check (level in ('principiante', 'intermedio', 'avanzato', 'tutti')) default 'tutti',
  max_participants integer,
  status text check (status in ('aperta', 'completa', 'annullata')) default 'aperta',
  is_no_drop boolean default false,
  created_at timestamptz default now()
);

alter table public.runs enable row level security;

create policy "Runs are viewable by everyone"
  on public.runs for select using (true);

create policy "Authenticated users can create runs"
  on public.runs for insert with check (auth.uid() = organizer_id);

create policy "Organizer can update their runs"
  on public.runs for update using (auth.uid() = organizer_id);

create policy "Organizer can delete their runs"
  on public.runs for delete using (auth.uid() = organizer_id);

-- =====================
-- PARTICIPATIONS
-- =====================
create table public.participations (
  id uuid default uuid_generate_v4() primary key,
  run_id uuid references public.runs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('in_attesa', 'approvata', 'rifiutata')) default 'in_attesa',
  message text,
  created_at timestamptz default now(),
  unique(run_id, user_id)
);

alter table public.participations enable row level security;

create policy "Participations visible to run organizer and participant"
  on public.participations for select using (
    auth.uid() = user_id or
    auth.uid() in (select organizer_id from public.runs where id = run_id)
  );

create policy "Authenticated users can join runs"
  on public.participations for insert with check (auth.uid() = user_id);

create policy "Participant can delete their own participation"
  on public.participations for delete using (auth.uid() = user_id);

create policy "Organizer can update participation status"
  on public.participations for update using (
    auth.uid() in (select organizer_id from public.runs where id = run_id)
  );

-- =====================
-- INDEXES
-- =====================
create index runs_date_idx on public.runs(date);
create index runs_city_idx on public.runs(city);
create index runs_organizer_idx on public.runs(organizer_id);
create index runs_series_idx on public.runs(series_id);
create index participations_run_idx on public.participations(run_id);
create index participations_user_idx on public.participations(user_id);
