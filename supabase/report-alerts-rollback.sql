-- Rollback di supabase/report-alerts.sql (SQL #43)
-- Toglie solo il trigger e la funzione che avvisano lo staff.

drop trigger  if exists trg_report_alert on public.reports;
drop function if exists public.call_notify_report();
