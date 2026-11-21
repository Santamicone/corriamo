-- Rollback di supabase/push-tokens.sql (SQL #41)
-- Rimuove tutto ciò che le push hanno aggiunto. Le notifiche in-app e le email
-- non vengono toccate.

select cron.unschedule('push-due-every-5min')
where exists (select 1 from cron.job where jobname = 'push-due-every-5min');

drop trigger  if exists trg_push_immediate on public.notifications;
drop function if exists public.call_send_push();

drop index if exists public.notifications_push_pending_idx;
alter table public.notifications drop column if exists push_sent;
alter table public.profiles      drop column if exists push_enabled;

drop function if exists public.register_push_token(text, text, text);
drop table    if exists public.push_tokens;

-- Facoltativo: rimuove il segreto dal Vault
-- delete from vault.secrets where name = 'push_function_secret';
