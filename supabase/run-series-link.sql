-- Corse collegate a una serie: solo a una serie propria — SQL #63
--
-- Perché (sicurezza)
--   La policy di INSERT/UPDATE su `runs` controlla solo `organizer_id`, non `series_id`: via API si
--   poteva infilare una propria corsa dentro la serie di un altro. La corsa compariva nella pagina
--   della serie, e la serie (e la sua card in bacheca e in home) la mostrava come una delle sue
--   uscite, con titolo e luogo scelti da chi la creava. Stesso schema già chiuso per `crew_id`
--   da crew-run-link.sql (#59).
--
-- Cosa fa
--   Trigger su runs: alla creazione, o quando series_id CAMBIA, chi agisce deve essere organizzatore
--   o co-organizzatore di quella serie. Togliere il collegamento (series_id = null) è sempre
--   permesso. Una serie che non esiste viene già respinta dalla chiave esterna.
--
-- COMPATIBILITÀ: il sito propone solo le proprie serie e l'app crea serie e corse insieme con lo
-- stesso utente; le modifiche che non cambiano series_id non sono toccate (anche per corse già
-- collegate). Senza utente (SQL Editor, service_role) non ci sono vincoli. Non tocca dati.
--
-- Eseguire dopo: add-series-coorganizer.sql (co_organizer_id).
-- Rollback: supabase/run-series-link-rollback.sql

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'series' and column_name = 'co_organizer_id') then
    raise exception 'Manca series.co_organizer_id: esegui prima add-series-coorganizer.sql';
  end if;
end $$;

begin;

create or replace function public.run_series_link_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is null or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.series_id is not distinct from old.series_id then
      return new;
    end if;
  end if;
  if not exists (select 1 from public.series s
                  where s.id = new.series_id
                    and (s.organizer_id = auth.uid() or s.co_organizer_id = auth.uid())) then
    raise exception 'series_link: puoi collegare una corsa solo a una serie che organizzi'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.run_series_link_guard() from public, anon, authenticated;

drop trigger if exists trg_runs_series_link on public.runs;
create trigger trg_runs_series_link
  before insert or update of series_id on public.runs
  for each row execute function public.run_series_link_guard();

commit;

-- Risultato atteso: trigger a true. Un conteggio sopra zero non prova un abuso (la serie può essere
-- stata riassegnata o la corsa spostata): per vedere di quali corse si tratta, usa la query sotto.
select
  exists (select 1 from pg_trigger where tgname = 'trg_runs_series_link') as trigger_corse,
  (select count(*) from public.runs r
     join public.series s on s.id = r.series_id
    where r.organizer_id is distinct from s.organizer_id
      and r.organizer_id is distinct from s.co_organizer_id) as corse_in_serie_altrui;

-- select s.title as serie, so.full_name as organizzatore_serie, r.title as corsa, r.date, ro.full_name as organizzatore_corsa
-- from public.runs r
-- join public.series s on s.id = r.series_id
-- join public.profiles so on so.id = s.organizer_id
-- join public.profiles ro on ro.id = r.organizer_id
-- where r.organizer_id is distinct from s.organizer_id
--   and r.organizer_id is distinct from s.co_organizer_id;
