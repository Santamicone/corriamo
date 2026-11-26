-- Corse e serie collegate a una crew: solo da chi la gestisce — SQL #59
--
-- Perché (sicurezza)
--   Le policy di `runs` e `series` controllano solo chi organizza, non `crew_id`: via API si poteva
--   collegare una propria corsa a QUALSIASI crew. La corsa compariva sulla pagina e nei numeri
--   della crew e, se "solo crew", generava notifiche e push a tutti i membri (trigger
--   trg_notify_crew_new_run) con un titolo scelto da chi la creava.
--
-- Cosa fa
--   Trigger su runs e series: alla creazione, o quando crew_id CAMBIA, chi agisce deve essere
--   owner o admin attivo di quella crew. Togliere il collegamento è sempre permesso.
--
-- COMPATIBILITÀ: il sito propone solo le crew che si gestiscono; l'app crea corse e serie senza
-- crew; le modifiche che non cambiano crew_id non sono toccate (anche per corse già collegate).
-- Senza utente (SQL Editor, service_role) non ci sono vincoli. Non tocca dati.
--
-- Eseguire dopo: crews-fix-rls.sql (is_crew_admin), add-series-crew-id.sql (#39).
-- Rollback: supabase/crew-run-link-rollback.sql

begin;

create or replace function public.crew_link_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.crew_id is null or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.crew_id is not distinct from old.crew_id then
      return new;
    end if;
  end if;
  if not public.is_crew_admin(new.crew_id) then
    raise exception 'crew_link: puoi collegare corse e serie solo a una crew che gestisci'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.crew_link_guard() from public, anon, authenticated;

drop trigger if exists trg_runs_crew_link on public.runs;
create trigger trg_runs_crew_link
  before insert or update of crew_id on public.runs
  for each row execute function public.crew_link_guard();

drop trigger if exists trg_series_crew_link on public.series;
create trigger trg_series_crew_link
  before insert or update of crew_id on public.series
  for each row execute function public.crew_link_guard();

commit;

-- Risultato atteso: i due trigger a true. I conteggi sopra zero non provano un abuso (si può aver
-- perso il ruolo dopo): per vedere di quali corse si tratta, usare la query commentata sotto.
select
  exists (select 1 from pg_trigger where tgname = 'trg_runs_crew_link') as trigger_corse,
  exists (select 1 from pg_trigger where tgname = 'trg_series_crew_link') as trigger_serie,
  (select count(*) from public.runs r
    where r.crew_id is not null
      and not exists (select 1 from public.crew_members m
                       where m.crew_id = r.crew_id and m.user_id = r.organizer_id
                         and m.role in ('owner', 'admin') and m.status = 'active')) as corse_di_non_gestori,
  (select count(*) from public.series s
    where s.crew_id is not null
      and not exists (select 1 from public.crew_members m
                       where m.crew_id = s.crew_id and m.user_id = s.organizer_id
                         and m.role in ('owner', 'admin') and m.status = 'active')) as serie_di_non_gestori;

-- select c.name as crew, r.title, r.date, p.full_name as organizzatore, r.run_visibility
-- from public.runs r
-- join public.crews c on c.id = r.crew_id
-- join public.profiles p on p.id = r.organizer_id
-- where not exists (select 1 from public.crew_members m
--                    where m.crew_id = r.crew_id and m.user_id = r.organizer_id
--                      and m.role in ('owner', 'admin') and m.status = 'active');
