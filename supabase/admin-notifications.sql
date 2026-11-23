-- Notifiche email agli admin: nuove registrazioni e nuove corse — SQL #52
--
-- ADDITIVO: quattro tabelle nuove, due trigger nuovi (su `profiles` e su `runs`) e un job
-- pg_cron. Non modifica né colonne né policy esistenti.
-- Rollback: supabase/admin-notifications-rollback.sql
--
-- Come funziona (stesso schema delle push e di `notify-report`):
--   1. un trigger registra l'evento in `admin_event_queue` (solo se l'evento è attivo);
--   2. frequenza "immediate": il trigger chiama subito la Edge Function `notify-admins`;
--      frequenza "hourly"/"daily": ci pensa il job che gira ogni 15 minuti.
--   3. l'email parte a tutti gli admin che non hanno disattivato gli avvisi.
-- Le impostazioni (eventi, frequenza, destinatari) si gestiscono da /admin/notifiche.
--
-- ── PRIMA di eseguire ────────────────────────────────────────────────────────
-- Riusa lo STESSO segreto delle push (Vault "push_function_secret" e secret della
-- funzione PUSH_FUNCTION_SECRET): non serve crearne un altro. RESEND_API_KEY c'è già.
--   1. supabase functions deploy notify-admins --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
--   2. Esegui questo file nel SQL Editor.
-- Attenzione: appena applicato, gli avvisi sono ATTIVI (frequenza "subito") per entrambi
-- gli eventi. Per partire spenti, cambia `enabled` a false negli INSERT qui sotto.

do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault non attivo';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_function_secret') then
    raise exception 'Manca il secret "push_function_secret" nel Vault (si crea con push-tokens.sql)';
  end if;
  if to_regclass('public.profiles') is null or to_regclass('public.runs') is null then
    raise exception 'Mancano le tabelle public.profiles / public.runs';
  end if;
end $$;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. Impostazioni ------------------------------------------------------------------
-- Un evento per riga: attivo o no, e ogni quanto avvisare.
create table if not exists public.admin_notification_rules (
  event_type   text primary key check (event_type in ('user_signup', 'run_created')),
  enabled      boolean     not null default true,
  frequency    text        not null default 'immediate' check (frequency in ('immediate', 'hourly', 'daily')),
  last_sent_at timestamptz,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id) on delete set null
);

insert into public.admin_notification_rules (event_type, enabled, frequency) values
  ('user_signup', true, 'immediate'),
  ('run_created', true, 'immediate')
on conflict (event_type) do nothing;

-- Una sola riga: a che ora (Europe/Rome) parte il riepilogo "giornaliero".
create table if not exists public.admin_notification_settings (
  id         boolean  primary key default true check (id),
  daily_hour smallint not null default 8 check (daily_hour between 0 and 23)
);
insert into public.admin_notification_settings (id) values (true) on conflict (id) do nothing;

-- Chi NON vuole gli avvisi. Chi non ha una riga li riceve (ogni admin è destinatario di default).
create table if not exists public.admin_notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true
);

-- 2. Coda degli eventi ---------------------------------------------------------------
-- Il contenuto è una copia minima (nome, città, titolo): niente email né dati sensibili.
create table if not exists public.admin_event_queue (
  id         uuid        primary key default gen_random_uuid(),
  event_type text        not null check (event_type in ('user_signup', 'run_created')),
  entity_id  uuid,
  payload    jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index if not exists admin_event_queue_pending_idx
  on public.admin_event_queue (event_type, created_at) where sent_at is null;
create index if not exists admin_event_queue_series_idx
  on public.admin_event_queue ((payload ->> 'series_id')) where event_type = 'run_created';

-- RLS attiva e NESSUNA policy: le tabelle le leggono e scrivono solo il service-role
-- (pagina e API admin, Edge Function) e le funzioni SECURITY DEFINER qui sotto.
alter table public.admin_notification_rules    enable row level security;
alter table public.admin_notification_settings enable row level security;
alter table public.admin_notification_prefs    enable row level security;
alter table public.admin_event_queue           enable row level security;

-- 3. Registrazione dell'evento ---------------------------------------------------------
create or replace function public.enqueue_admin_event(p_type text, p_entity uuid, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rule   public.admin_notification_rules;
  v_id     uuid;
  v_secret text;
begin
  select * into v_rule from public.admin_notification_rules where event_type = p_type;
  if not found or not v_rule.enabled then
    return;
  end if;

  insert into public.admin_event_queue (event_type, entity_id, payload)
  values (p_type, p_entity, p_payload)
  returning id into v_id;

  -- "Subito": chiama la funzione (la richiesta parte dopo il commit). Se non va a buon fine,
  -- l'evento resta in coda e lo recupera il job ogni 15 minuti.
  if v_rule.frequency = 'immediate' then
    select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_function_secret';
    if v_secret is not null then
      perform net.http_post(
        url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/notify-admins',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
        body    := jsonb_build_object('mode', 'event', 'queue_id', v_id)
      );
    end if;
  end if;
end;
$$;

revoke all on function public.enqueue_admin_event(text, uuid, jsonb) from public, anon, authenticated;

-- 4. Trigger: nuova registrazione ---------------------------------------------------------
-- `profiles` nasce dal trigger di `auth.users` (anche per Apple/Google/Facebook).
create or replace function public.admin_event_user_signup()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_admin_event(
    'user_signup', new.id,
    jsonb_build_object('full_name', new.full_name, 'city', new.city)
  );
  return new;
exception when others then
  -- Un avviso mancato non deve MAI far fallire la registrazione
  return new;
end;
$$;

drop trigger if exists trg_admin_event_signup on public.profiles;
create trigger trg_admin_event_signup
  after insert on public.profiles
  for each row execute function public.admin_event_user_signup();

-- 5. Trigger: nuova corsa -------------------------------------------------------------------
-- Una serie crea più corse insieme: si avvisa UNA volta sola per serie.
create or replace function public.admin_event_run_created()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series_id is not null and exists (
    select 1 from public.admin_event_queue
    where event_type = 'run_created' and payload ->> 'series_id' = new.series_id::text
  ) then
    return new;
  end if;

  perform public.enqueue_admin_event(
    'run_created', new.id,
    jsonb_build_object(
      'title', new.title, 'date', new.date, 'time', new.time,
      'city', new.city, 'location', new.location,
      'distance_km', new.distance_km,
      'organizer_id', new.organizer_id,
      'organizer_name', (select full_name from public.profiles where id = new.organizer_id),
      'series_id', new.series_id
    )
  );
  return new;
exception when others then
  -- Un avviso mancato non deve MAI far fallire la creazione della corsa
  return new;
end;
$$;

drop trigger if exists trg_admin_event_run on public.runs;
create trigger trg_admin_event_run
  after insert on public.runs
  for each row execute function public.admin_event_run_created();

-- 6. Cron: riepiloghi orari/giornalieri + recupero degli invii falliti --------------------------
select cron.unschedule('notify-admins-every-15min')
where exists (select 1 from cron.job where jobname = 'notify-admins-every-15min');

select cron.schedule(
  'notify-admins-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/notify-admins',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_function_secret')
    ),
    body    := '{"mode":"due"}'::jsonb
  );
  $$
);
