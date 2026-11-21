-- Push notification per l'app mobile (Expo) — SQL #41
--
-- ADDITIVO: nuova tabella, una funzione RPC, 2 colonne con default, un trigger
-- e un job cron NUOVI. Non modifica né sostituisce i trigger esistenti
-- (notifiche in-app, email immediate, digest).
-- Rollback: supabase/push-tokens-rollback.sql
--
-- ── PRIMA di eseguire ────────────────────────────────────────────────────────
-- 1. Genera un segreto casuale (una sola volta):
--      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
-- 2. Salvalo nel Vault (SQL Editor), sostituendo <SEGRETO>:
--      select vault.create_secret('<SEGRETO>', 'push_function_secret');
-- 3. Imposta lo STESSO valore come secret della Edge Function:
--      supabase secrets set PUSH_FUNCTION_SECRET=<SEGRETO>
-- 4. Pubblica la funzione (senza verifica JWT: si autentica con il segreto):
--      supabase functions deploy send-push --no-verify-jwt
--
-- Così la service role key NON viene incollata di nuovo nel corpo di una
-- funzione SQL (come avviene per call_send_immediate).

-- ── Controlli preliminari: se manca qualcosa lo script si ferma subito ───────
do $$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault non attivo: abilitalo da Database → Extensions (supabase_vault)';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_function_secret') then
    raise exception 'Manca il secret "push_function_secret" nel Vault (vedi istruzioni in cima al file)';
  end if;
end $$;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── Token dei dispositivi ────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  token       text        not null unique,          -- ExponentPushToken[...]
  platform    text        not null check (platform in ('ios', 'android')),
  device_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Ognuno vede e cancella solo i propri token (il logout dall'app li rimuove).
-- Nessuna policy di INSERT/UPDATE: la registrazione passa dalla funzione sotto,
-- così un token già usato da un altro account (stesso telefono) viene riassegnato.
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens
  for delete using (auth.uid() = user_id);

create or replace function public.register_push_token(
  p_token       text,
  p_platform    text,
  p_device_name text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_tokens (user_id, token, platform, device_name)
  values (auth.uid(), p_token, p_platform, p_device_name)
  on conflict (token) do update
    set user_id     = excluded.user_id,
        platform    = excluded.platform,
        device_name = excluded.device_name,
        updated_at  = now();
end;
$$;

revoke all on function public.register_push_token(text, text, text) from public;
grant execute on function public.register_push_token(text, text, text) to authenticated;

-- ── Interruttore push dell'utente (un solo switch, nel Profilo dell'app) ─────
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

-- ── Notifiche: traccia se la push è già stata inviata ────────────────────────
alter table public.notifications
  add column if not exists push_sent boolean not null default false;

create index if not exists notifications_push_pending_idx
  on public.notifications(show_after)
  where not push_sent;

-- ── Trigger: invio immediato alla creazione della notifica ───────────────────
-- Tipi che diventano push. Tenere allineato con PUSH_TYPES in
-- supabase/functions/send-push/index.ts.
create or replace function public.call_send_push()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
begin
  -- I promemoria hanno show_after nel futuro: li invia il cron quando scadono
  if new.show_after > now() then
    return new;
  end if;

  if new.type not in (
    'richiesta_approvata', 'richiesta_rifiutata', 'nuova_richiesta',
    'corsa_annullata', 'corsa_modificata', 'promemoria_corsa',
    'crew_join_request', 'crew_request_approved', 'crew_new_run',
    'nuovo_messaggio'
  ) then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_function_secret';
  if v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('notification_id', new.id)
  );

  return new;
exception when others then
  -- Una push mancata non deve MAI far fallire l'inserimento della notifica
  return new;
end;
$$;

drop trigger if exists trg_push_immediate on public.notifications;
create trigger trg_push_immediate
  after insert on public.notifications
  for each row execute function public.call_send_push();

-- ── Cron: promemoria scaduti + recupero invii falliti ────────────────────────
-- Ogni 5 minuti la funzione prende le notifiche con show_after passato (ma
-- non oltre 12 ore fa, per non inviare mai notifiche vecchie) e push_sent = false.
select cron.unschedule('push-due-every-5min')
where exists (select 1 from cron.job where jobname = 'push-due-every-5min');

select cron.schedule(
  'push-due-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://wshjtgtmxbxhpdqtxpiq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_function_secret')
    ),
    body    := '{"mode":"due"}'::jsonb
  );
  $$
);
