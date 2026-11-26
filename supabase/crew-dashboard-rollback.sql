-- Rollback di #60 (crew-dashboard.sql). Non tocca dati: rimuove solo le funzioni.
-- L'app 1.3.0 mostra un messaggio di errore nella schermata Statistiche.

begin;

drop function if exists public.crew_dashboard_members(uuid, date, date);
drop function if exists public.crew_dashboard_summary(uuid, date, date);
drop function if exists public.crew_dashboard_signups(uuid, date, date);

notify pgrst, 'reload schema';

commit;
