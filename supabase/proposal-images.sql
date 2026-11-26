-- Proposte: immagine e tipologia "Test di gara" — SQL #56
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §6
--
-- Cosa fa
--   * run_proposals.image_url (facoltativa): immagine propria della proposta. Se è vuota, sito e
--     app mostrano il segnaposto della tipologia.
--   * Nuova tipologia 'test_gara' (si allarga il CHECK su run_proposals.kind).
--   * Bucket pubblico 'proposal-images'. Nessuna policy di scrittura: carica solo il server del
--     sito con la service-role, dalle API admin.
--   * proposals_discover e proposal_detail restituiscono anche image_url. Cambiando le colonne
--     restituite vanno eliminate e ricreate: avviene dentro la transazione.
--
-- COMPATIBILITÀ: per le app già pubblicate cambia solo che le due funzioni hanno un campo in più.
-- L'app 1.2.0 mostra una proposta 'test_gara' con l'icona generica e senza nome della tipologia.
--
-- Eseguire dopo: run-proposals.sql (#53). Eseguire prima di pubblicare il sito aggiornato.
-- Rollback: supabase/proposal-images-rollback.sql

begin;

-- 1. Colonna --------------------------------------------------------------------------------
alter table public.run_proposals add column if not exists image_url text;

alter table public.run_proposals drop constraint if exists run_proposals_image_url_check;
alter table public.run_proposals add constraint run_proposals_image_url_check
  check (image_url is null or image_url like 'https://%');

-- 2. Tipologie ------------------------------------------------------------------------------
-- Tenere allineato con PROPOSAL_KINDS in sito e app.
alter table public.run_proposals drop constraint if exists run_proposals_kind_check;
alter table public.run_proposals add constraint run_proposals_kind_check
  check (kind in
    ('principianti', 'tranquilla', 'aerobica', 'veloce', 'lungo', 'trail', 'rigenerante', 'test_gara'));

-- 3. Archivio immagini ----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proposal-images', 'proposal-images', true, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Lettura: stesso corpo di #53, con image_url in coda ------------------------------------
drop function if exists public.proposals_discover(text, integer);
create function public.proposals_discover(
  p_city  text    default null,
  p_limit integer default 10
)
returns table (
  id              uuid,
  kind            text,
  title           text,
  description     text,
  city            text,
  zone            text,
  lat             numeric,
  lng             numeric,
  target_date     date,
  time_from       time,
  time_to         time,
  distance_min_km numeric,
  distance_max_km numeric,
  pace_target     text,
  level           text,
  expires_at      timestamptz,
  interest_count  integer,
  i_am_interested boolean,
  image_url       text
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id, p.kind, p.title, p.description, p.city, p.zone, p.lat, p.lng,
    p.target_date, p.time_from, p.time_to, p.distance_min_km, p.distance_max_km,
    p.pace_target, p.level, p.expires_at,
    (select count(*)::integer from public.proposal_interests i where i.proposal_id = p.id),
    coalesce(auth.uid() is not null and exists (
      select 1 from public.proposal_interests i
      where i.proposal_id = p.id and i.user_id = auth.uid()), false),
    p.image_url
  from public.run_proposals p
  where p.status = 'aperta'
    and p.expires_at > now()
    and p.target_date >= (now() at time zone 'Europe/Rome')::date
    and (p_city is null or btrim(p_city) = '' or p.city ilike '%' || btrim(p_city) || '%')
    and not exists (
      select 1 from public.runs r
      where lower(r.city) = lower(p.city)
        and r.status = 'aperta'
        and r.run_visibility = 'public'
        and coalesce(r.type, 'allenamento') <> 'gara'
        and not r.hidden_by_admin
        and r.date between p.target_date - 1 and p.target_date + 1
        and r.distance_km between coalesce(p.distance_min_km, 0) and coalesce(p.distance_max_km, 1000)
    )
  order by p.target_date, p.time_from, p.created_at
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

drop function if exists public.proposal_detail(uuid);
create function public.proposal_detail(p_id uuid)
returns table (
  id              uuid,
  kind            text,
  title           text,
  description     text,
  city            text,
  zone            text,
  lat             numeric,
  lng             numeric,
  target_date     date,
  time_from       time,
  time_to         time,
  distance_min_km numeric,
  distance_max_km numeric,
  pace_target     text,
  level           text,
  status          text,
  expires_at      timestamptz,
  adopted_run_id  uuid,
  adopted_by      uuid,
  adopted_by_name text,
  interest_count  integer,
  i_am_interested boolean,
  image_url       text
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id, p.kind, p.title, p.description, p.city, p.zone, p.lat, p.lng,
    p.target_date, p.time_from, p.time_to, p.distance_min_km, p.distance_max_km,
    p.pace_target, p.level,
    -- Una proposta oltre la scadenza ma non ancora toccata dal cron si mostra già scaduta
    case when p.status = 'aperta' and p.expires_at <= now() then 'scaduta' else p.status end,
    p.expires_at, p.adopted_run_id, p.adopted_by, a.full_name,
    (select count(*)::integer from public.proposal_interests i where i.proposal_id = p.id),
    coalesce(auth.uid() is not null and exists (
      select 1 from public.proposal_interests i
      where i.proposal_id = p.id and i.user_id = auth.uid()), false),
    p.image_url
  from public.run_proposals p
  left join public.profiles a on a.id = p.adopted_by
  where p.id = p_id;
$$;

revoke all on function public.proposals_discover(text, integer) from public;
revoke all on function public.proposal_detail(uuid)             from public;
grant execute on function public.proposals_discover(text, integer) to anon, authenticated;
grant execute on function public.proposal_detail(uuid)             to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Risultato atteso: una riga con tutti i valori 'true'.
select
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'run_proposals' and column_name = 'image_url') as colonna,
  pg_get_constraintdef((select oid from pg_constraint where conname = 'run_proposals_kind_check'))
    like '%test_gara%' as tipologia_test_gara,
  exists (select 1 from storage.buckets where id = 'proposal-images' and public) as bucket,
  pg_get_function_result('public.proposals_discover(text, integer)'::regprocedure) like '%image_url%' as lista,
  pg_get_function_result('public.proposal_detail(uuid)'::regprocedure) like '%image_url%' as scheda,
  has_function_privilege('anon', 'public.proposals_discover(text, integer)', 'execute') as anon_legge;
