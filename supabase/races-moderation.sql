-- Moderazione gare proposte dagli utenti (calendario gare).
-- Gli utenti loggati possono già proporre gare (status='pending', source='utente')
-- via la policy "Users can propose races" in races.sql. Qui aggiungiamo:
--  1. un flag admin sui profili
--  2. una policy che consente agli admin di vedere/gestire tutte le gare
--     (incluse le pending) e di pubblicarle o rifiutarle
-- Esegui in Supabase Dashboard → SQL Editor (dopo races.sql)

-- 1. Flag admin
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Gli admin gestiscono tutte le gare (select su pending + update stato)
create policy "Admins can manage races"
  on public.races for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- 3. Nomina admin il proprietario (necessario perché la moderazione funzioni).
--    Aggiorna l'email se serve.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'm.santamicone@gmail.com');
