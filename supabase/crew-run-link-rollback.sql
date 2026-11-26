-- Rollback di #59 (crew-run-link.sql).
-- ATTENZIONE: chiunque potrà di nuovo collegare via API le proprie corse a qualsiasi crew.

drop trigger if exists trg_runs_crew_link on public.runs;
drop trigger if exists trg_series_crew_link on public.series;
drop function if exists public.crew_link_guard();
