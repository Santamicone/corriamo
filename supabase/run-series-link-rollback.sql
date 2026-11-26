-- Rollback di #63 (run-series-link.sql). Non tocca dati: rimuove solo il trigger e la funzione.
-- Dopo il rollback si può di nuovo collegare una propria corsa alla serie di un altro.

begin;

drop trigger if exists trg_runs_series_link on public.runs;
drop function if exists public.run_series_link_guard();

commit;
