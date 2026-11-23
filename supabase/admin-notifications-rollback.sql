-- Rollback di supabase/admin-notifications.sql (SQL #52)
-- Toglie trigger, funzioni, job e tabelle delle notifiche agli admin. Le coda e le impostazioni si perdono.

select cron.unschedule('notify-admins-every-15min')
where exists (select 1 from cron.job where jobname = 'notify-admins-every-15min');

drop trigger  if exists trg_admin_event_run    on public.runs;
drop trigger  if exists trg_admin_event_signup on public.profiles;
drop function if exists public.admin_event_run_created();
drop function if exists public.admin_event_user_signup();
drop function if exists public.enqueue_admin_event(text, uuid, jsonb);

drop table if exists public.admin_event_queue;
drop table if exists public.admin_notification_prefs;
drop table if exists public.admin_notification_settings;
drop table if exists public.admin_notification_rules;
