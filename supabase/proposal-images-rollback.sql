-- Rollback di #56 (proposal-images.sql).
-- ATTENZIONE: le proposte 'test_gara' diventano 'veloce' (il vecchio vincolo non le ammette) e i
-- collegamenti alle immagini caricate si perdono. Il bucket 'proposal-images' e i suoi file restano:
-- eventualmente si eliminano da Storage nel Dashboard.
-- Prima va ripubblicato il sito precedente: quello nuovo non può creare proposte senza la colonna.

begin;

drop function if exists public.proposals_discover(text, integer);
drop function if exists public.proposal_detail(uuid);

-- Le due funzioni come in run-proposals.sql (#53)
create or replace function public.proposals_discover(
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
  i_am_interested boolean
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
      where i.proposal_id = p.id and i.user_id = auth.uid()), false)
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

create or replace function public.proposal_detail(p_id uuid)
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
  i_am_interested boolean
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
      where i.proposal_id = p.id and i.user_id = auth.uid()), false)
  from public.run_proposals p
  left join public.profiles a on a.id = p.adopted_by
  where p.id = p_id;
$$;

revoke all on function public.proposals_discover(text, integer) from public;
revoke all on function public.proposal_detail(uuid)             from public;
grant execute on function public.proposals_discover(text, integer) to anon, authenticated;
grant execute on function public.proposal_detail(uuid)             to anon, authenticated;

update public.run_proposals set kind = 'veloce' where kind = 'test_gara';
alter table public.run_proposals drop constraint if exists run_proposals_kind_check;
alter table public.run_proposals add constraint run_proposals_kind_check
  check (kind in
    ('principianti', 'tranquilla', 'aerobica', 'veloce', 'lungo', 'trail', 'rigenerante'));

alter table public.run_proposals drop constraint if exists run_proposals_image_url_check;
alter table public.run_proposals drop column if exists image_url;

notify pgrst, 'reload schema';

commit;
