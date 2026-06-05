-- Sistema recensioni organizzatori
-- Esegui in Supabase Dashboard → SQL Editor

create table public.reviews (
  id          uuid        default uuid_generate_v4() primary key,
  run_id      uuid        references public.runs(id) on delete cascade not null,
  reviewer_id uuid        references public.profiles(id) on delete cascade not null,
  reviewed_id uuid        references public.profiles(id) on delete cascade not null,
  rating      integer     not null check (rating between 1 and 5),
  body        text        check (body is null or char_length(body) <= 1000),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(run_id, reviewer_id)  -- una sola recensione per corsa per reviewer
);

alter table public.reviews enable row level security;

-- Tutti possono leggere le recensioni
create policy "Reviews are public"
  on public.reviews for select
  using (true);

-- Solo il reviewer può inserire la propria
create policy "Authenticated users can review"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

-- Solo il reviewer può modificare la propria
create policy "Reviewer can update own review"
  on public.reviews for update
  using (auth.uid() = reviewer_id);

-- Solo il reviewer può eliminare la propria
create policy "Reviewer can delete own review"
  on public.reviews for delete
  using (auth.uid() = reviewer_id);

-- Indici
create index reviews_reviewed_idx on public.reviews(reviewed_id);
create index reviews_reviewer_idx on public.reviews(reviewer_id);
create index reviews_run_idx      on public.reviews(run_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();
