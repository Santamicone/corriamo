-- Rollback di supabase/run-counts-reminders.sql (SQL #45)
--
-- Toglie la funzione dei conteggi e il cron dei promemoria. ATTENZIONE: se
-- torni indietro MA lasci pubblicata la nuova send-immediate, i promemoria
-- non partono più (la funzione ignora quelli con show_after nel futuro e il
-- cron che li invia non esiste più). In quel caso ripubblica anche la vecchia
-- versione di send-immediate (git: supabase/functions/send-immediate).

select cron.unschedule('email-reminders-every-15min')
where exists (select 1 from cron.job where jobname = 'email-reminders-every-15min');

drop function if exists public.run_participant_counts(uuid[]);
