-- Momenti post-corsa
-- Esegui in Supabase Dashboard → SQL Editor

create table public.momenti (
  id         uuid        default uuid_generate_v4() primary key,
  run_id     uuid        references public.runs(id) on delete cascade not null,
  author_id  uuid        references public.profiles(id) on delete cascade not null,
  photo_url  text,
  body       text        check (body is null or char_length(body) <= 300),
  created_at timestamptz default now(),
  constraint momenti_run_author_unique unique(run_id, author_id),
  constraint momenti_has_content check (photo_url is not null or (body is not null and body != ''))
);

alter table public.momenti enable row level security;

create policy "Momenti are public"
  on public.momenti for select using (true);

create policy "Authors can create momenti"
  on public.momenti for insert
  with check (auth.uid() = author_id);

create policy "Authors can update their momento"
  on public.momenti for update
  using (auth.uid() = author_id);

create policy "Authors can delete their momento"
  on public.momenti for delete
  using (auth.uid() = author_id);

create index momenti_run_idx    on public.momenti(run_id);
create index momenti_author_idx on public.momenti(author_id);

-- Storage bucket per le foto
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'momenti', 'momenti', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

create policy "Momento photos are public"
  on storage.objects for select using (bucket_id = 'momenti');

create policy "Authors can upload momento photos"
  on storage.objects for insert
  with check (bucket_id = 'momenti' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authors can update momento photos"
  on storage.objects for update
  using (bucket_id = 'momenti' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authors can delete momento photos"
  on storage.objects for delete
  using (bucket_id = 'momenti' and auth.uid()::text = (storage.foldername(name))[1]);
