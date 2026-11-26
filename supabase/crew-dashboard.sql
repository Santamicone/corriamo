-- Statistiche della crew — SQL #60
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §4
--
-- Nomi nuovi di proposito: crew_stats(crew_id) (#34) esiste già ed è usata da sito e app.
--
--   * crew_dashboard_summary(crew_id, from, to) → jsonb, per i membri attivi: solo numeri della
--     crew, corse più partecipate e andamento degli ultimi mesi.
--   * crew_dashboard_members(crew_id, from, to) → una riga per membro attivo, SOLO owner/admin.
--   Errori (nel messaggio): not_authenticated, not_a_member, not_manager
--
-- Cosa si conta
--   * Corse della crew già iniziate (ora italiana), non annullate e non nascoste dallo staff.
--   * Partecipanti di una corsa: chi ha l'iscrizione approvata, più chi organizza (una sola volta).
--     Chi si cancella sparisce dal database: non c'è uno storico delle rinunce.
--   * "Presenze rilevate": partecipanti con un arrivo al ritrovo, un check-in o un "Sì" a
--     "La corsa si è svolta?". Sono un MINIMO: la mancanza non significa assenza. Per questo non
--     si calcolano tassi di presenza né affidabilità.
--   * Stato di un membro (non dipende dal periodo scelto): 'attivo' se ha partecipato a una corsa
--     della crew negli ultimi 60 giorni; altrimenti 'nuovo' se è entrato da meno di 60 giorni;
--     altrimenti 'inattivo'.
--
-- COMPATIBILITÀ: additivo. Eseguire dopo: ritrovo-nudge.sql (#58, run_arrivals).
-- Rollback: supabase/crew-dashboard-rollback.sql

do $$
begin
  if to_regclass('public.run_arrivals') is null then
    raise exception 'Manca public.run_arrivals: esegui prima ritrovo-nudge.sql (#58)';
  end if;
end $$;

begin;

-- Coppie (corsa, partecipante) delle corse della crew nel periodo. Solo per le due funzioni
-- qui sotto: nessun ruolo può chiamarla direttamente.
create or replace function public.crew_dashboard_signups(p_crew_id uuid, p_from date, p_to date)
returns table (run_id uuid, run_date date, title text, user_id uuid, detected boolean)
language sql stable security definer set search_path = public as $$
  with crew_runs as (
    select r.id, r.date, r.title, r.organizer_id
    from public.runs r
    where r.crew_id = p_crew_id
      and r.status <> 'annullata'
      and not r.hidden_by_admin
      and (r.date + r.time) at time zone 'Europe/Rome' <= now()
      and (p_from is null or r.date >= p_from)
      and (p_to is null or r.date <= p_to)
  ),
  people as (
    select cr.id as run_id, pa.user_id
    from crew_runs cr
    join public.participations pa on pa.run_id = cr.id and pa.status = 'approvata'
    union -- chi organizza conta una volta sola, anche se ha pure un'iscrizione
    select cr.id, cr.organizer_id from crew_runs cr
  )
  select pe.run_id, cr.date, cr.title, pe.user_id,
         exists (select 1 from public.run_arrivals a where a.run_id = pe.run_id and a.user_id = pe.user_id)
      or exists (select 1 from public.check_ins c where c.run_id = pe.run_id and c.user_id = pe.user_id)
      or exists (select 1 from public.run_confirmations rc
                  where rc.run_id = pe.run_id and rc.user_id = pe.user_id and rc.confirmed)
  from people pe
  join crew_runs cr on cr.id = pe.run_id;
$$;

revoke all on function public.crew_dashboard_signups(uuid, date, date) from public, anon, authenticated;

create or replace function public.crew_dashboard_summary(
  p_crew_id uuid,
  p_from    date default null,
  p_to      date default null
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today  date := (now() at time zone 'Europe/Rome')::date;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;

  with s as (
    select * from public.crew_dashboard_signups(p_crew_id, p_from, p_to)
  ),
  per_run as (
    select s.run_id, s.run_date, s.title, count(*)::int as signups
    from s group by s.run_id, s.run_date, s.title
  ),
  -- Fino a 12 mesi, dal primo mese con corse nel periodo a quello attuale, senza buchi
  months as (
    select m::date as month
    from generate_series(
      greatest(
        (select date_trunc('month', min(run_date)::timestamp) from per_run),
        date_trunc('month', v_today::timestamp) - interval '11 months'
      ),
      date_trunc('month', least(coalesce(p_to, v_today), v_today)::timestamp),
      interval '1 month') as m
    where exists (select 1 from per_run)
  )
  select jsonb_build_object(
    'runs',     (select count(*) from per_run),
    'signups',  (select count(*) from s),
    'avg_per_run', coalesce((select round(avg(signups), 1) from per_run), 0),
    'people',   (select count(distinct user_id) from s),
    'guests',   (select count(distinct s.user_id) from s
                  where not exists (select 1 from public.crew_members cm
                                     where cm.crew_id = p_crew_id and cm.user_id = s.user_id and cm.status = 'active')),
    'detected', (select count(*) from s where s.detected),
    'active_members', (select count(*) from public.crew_members cm
                        where cm.crew_id = p_crew_id and cm.status = 'active'),
    'top_runs', coalesce((
        select jsonb_agg(jsonb_build_object('id', t.run_id, 'title', t.title, 'date', t.run_date, 'signups', t.signups)
                         order by t.signups desc, t.run_date desc)
        from (select * from per_run order by signups desc, run_date desc limit 5) t), '[]'::jsonb),
    'monthly',  coalesce((
        select jsonb_agg(jsonb_build_object(
                 'month', to_char(mo.month, 'YYYY-MM'),
                 'runs', (select count(*) from per_run pr where date_trunc('month', pr.run_date::timestamp) = mo.month),
                 'signups', (select coalesce(sum(pr.signups), 0) from per_run pr where date_trunc('month', pr.run_date::timestamp) = mo.month)
               ) order by mo.month)
        from months mo), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.crew_dashboard_members(
  p_crew_id uuid,
  p_from    date default null,
  p_to      date default null
)
returns table (
  user_id      uuid,
  full_name    text,
  avatar_url   text,
  role         text,
  joined_at    timestamptz,
  signups      integer,
  detected     integer,
  last_run     date,
  activity     text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_crew_admin(p_crew_id) then raise exception 'not_manager'; end if;

  return query
  with period as (
    select * from public.crew_dashboard_signups(p_crew_id, p_from, p_to)
  ),
  ever as (
    select s.user_id, max(s.run_date) as last_run
    from public.crew_dashboard_signups(p_crew_id, null, null) s
    group by s.user_id
  )
  select cm.user_id, pr.full_name, pr.avatar_url, cm.role, cm.joined_at,
         (select count(*)::int from period p where p.user_id = cm.user_id),
         (select count(*)::int from period p where p.user_id = cm.user_id and p.detected),
         e.last_run,
         case
           when e.last_run >= (now() at time zone 'Europe/Rome')::date - 60 then 'attivo'
           when cm.joined_at > now() - interval '60 days' then 'nuovo'
           else 'inattivo'
         end
  from public.crew_members cm
  join public.profiles pr on pr.id = cm.user_id
  left join ever e on e.user_id = cm.user_id
  where cm.crew_id = p_crew_id and cm.status = 'active'
  order by 6 desc, pr.full_name;
end;
$$;

revoke all on function public.crew_dashboard_summary(uuid, date, date) from public, anon;
revoke all on function public.crew_dashboard_members(uuid, date, date) from public, anon;
grant execute on function public.crew_dashboard_summary(uuid, date, date) to authenticated;
grant execute on function public.crew_dashboard_members(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Risultato atteso: una riga con tutti i valori 'true'.
select
  has_function_privilege('authenticated', 'public.crew_dashboard_summary(uuid, date, date)', 'execute') as riepilogo,
  has_function_privilege('authenticated', 'public.crew_dashboard_members(uuid, date, date)', 'execute') as membri,
  not has_function_privilege('anon', 'public.crew_dashboard_summary(uuid, date, date)', 'execute') as anonimi_no_riepilogo,
  not has_function_privilege('anon', 'public.crew_dashboard_members(uuid, date, date)', 'execute') as anonimi_no_membri,
  not has_function_privilege('authenticated', 'public.crew_dashboard_signups(uuid, date, date)', 'execute') as base_non_accessibile;
