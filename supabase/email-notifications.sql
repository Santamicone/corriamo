-- Sistema email notifiche
-- Eseguire su Supabase Dashboard → SQL Editor

-- ── Abilita pg_net per chiamate HTTP dai trigger ──
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── notifications: traccia se email già inviata ──
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS notifications_email_pending_idx
  ON public.notifications(user_id, created_at)
  WHERE NOT email_sent AND NOT read;

-- ── profiles: last_seen_at + email_prefs ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_prefs  jsonb NOT NULL DEFAULT '{
    "immediate": true,
    "digest":    true,
    "reminders": true
  }'::jsonb;
