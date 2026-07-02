-- =============================================================================
-- SQL #28 — admin.sql — Sezione backend admin
-- =============================================================================
-- Prerequisiti: races-moderation.sql (#27) applicato → profiles.is_admin esiste.
-- Esegui in Supabase Dashboard → SQL Editor. Idempotente: ri-eseguibile in sicurezza.
--
-- Contenuto:
--   1. Moderazione utenti (ban graduale)      → user_moderation + colonne su profiles
--   2. Audit log azioni admin                 → admin_actions
--   3. Soft-delete contenuti                  → hidden_by_admin su runs/series/momenti/reviews/run_chat
--   4. Segnalazioni utenti                    → reports
--   5. Codici di recupero MFA                 → admin_recovery_codes
--   6. Funzioni helper (is_admin_aal2, is_active_user)
--   7. RLS: policy admin (is_admin + AAL2) + blocco scrittura utenti sospesi/bannati
--
-- ⚠️ MFA: abilitare TOTP in Dashboard → Authentication → MFA (config manuale).
-- =============================================================================


-- =============================================================================
-- 1. MODERAZIONE UTENTI (ban graduale: warning → suspension → ban)
-- =============================================================================

-- Storico di ogni provvedimento (append-only, ogni azione è una riga)
create table if not exists public.user_moderation (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  admin_id    uuid not null references public.profiles(id) on delete set null,
  action      text not null check (action in ('warning', 'suspension', 'ban')),
  reason      text not null,
  note        text,
  expires_at  timestamptz,               -- solo per suspension (null = permanente)
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,               -- valorizzato se il provvedimento è stato revocato
  revoked_by  uuid references public.profiles(id) on delete set null
);

create index if not exists user_moderation_user_id_idx on public.user_moderation(user_id);
create index if not exists user_moderation_created_at_idx on public.user_moderation(created_at desc);

-- Stato materializzato sul profilo (aggiornato dalle server action admin)
alter table public.profiles
  add column if not exists moderation_status text not null default 'active'
    check (moderation_status in ('active', 'warned', 'suspended', 'banned')),
  add column if not exists warned_count int not null default 0,
  add column if not exists moderation_until timestamptz;  -- fine sospensione


-- =============================================================================
-- 2. AUDIT LOG — ogni azione sensibile admin viene tracciata
-- =============================================================================

create table if not exists public.admin_actions (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references public.profiles(id) on delete set null,
  action_type   text not null,            -- es. 'user.ban', 'content.hide', 'mfa.recovery'
  entity_table  text,                     -- tabella dell'entità toccata
  entity_id     text,                     -- id dell'entità (text: copre uuid e altro)
  reason        text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx on public.admin_actions(created_at desc);
create index if not exists admin_actions_admin_id_idx on public.admin_actions(admin_id);


-- =============================================================================
-- 3. SOFT-DELETE CONTENUTI — mai DELETE fisico, sempre reversibile e tracciato
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array['runs', 'series', 'momenti', 'reviews', 'run_chat'] loop
    execute format('alter table public.%I add column if not exists hidden_by_admin boolean not null default false', t);
    execute format('alter table public.%I add column if not exists hidden_reason text', t);
    execute format('alter table public.%I add column if not exists hidden_at timestamptz', t);
    execute format('alter table public.%I add column if not exists hidden_by uuid references public.profiles(id) on delete set null', t);
    execute format('create index if not exists %I on public.%I(hidden_by_admin) where hidden_by_admin', t || '_hidden_idx', t);
  end loop;
end $$;


-- =============================================================================
-- 4. SEGNALAZIONI UTENTI (report su contenuti o persone)
-- =============================================================================

create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  entity_table     text not null,          -- 'runs' | 'momenti' | 'reviews' | 'profiles' | ...
  entity_id        text not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason           text not null,
  status           text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by      uuid references public.profiles(id) on delete set null,
  resolution_note  text,
  created_at       timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_created_at_idx on public.reports(created_at desc);


-- =============================================================================
-- 5. CODICI DI RECUPERO MFA (Supabase non li fornisce nativi)
-- =============================================================================
-- Generati alla configurazione MFA, mostrati una sola volta all'admin.
-- In DB salviamo solo l'hash (sha256). Un codice usato marca used_at.

create table if not exists public.admin_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_recovery_codes_user_id_idx on public.admin_recovery_codes(user_id);

alter table public.admin_recovery_codes enable row level security;
-- Nessuna policy per authenticated: l'accesso avviene solo via service-role (server-side).


-- =============================================================================
-- 6. FUNZIONI HELPER (SECURITY DEFINER per evitare ricorsione RLS su profiles)
-- =============================================================================

-- Admin con sessione elevata a AAL2 (2FA superato). Usata dalle policy admin.
create or replace function public.is_admin_aal2()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    );
$$;

-- Utente non sospeso/bannato → può scrivere. Gestisce la scadenza della sospensione
-- senza cron: una sospensione con moderation_until passato NON blocca più.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.moderation_status = 'banned'
        or (
          p.moderation_status = 'suspended'
          and (p.moderation_until is null or p.moderation_until > now())
        )
      )
  );
$$;


-- =============================================================================
-- 7. RLS
-- =============================================================================

-- --- 7a. Tabelle admin: lettura/gestione solo admin AAL2 ---------------------
alter table public.user_moderation enable row level security;
alter table public.admin_actions   enable row level security;
alter table public.reports         enable row level security;

drop policy if exists "Admins manage user_moderation" on public.user_moderation;
create policy "Admins manage user_moderation" on public.user_moderation
  for all to authenticated
  using (public.is_admin_aal2()) with check (public.is_admin_aal2());

-- L'utente può leggere i provvedimenti a proprio carico (per /account-sospeso)
drop policy if exists "Users read own moderation" on public.user_moderation;
create policy "Users read own moderation" on public.user_moderation
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read admin_actions" on public.admin_actions;
create policy "Admins read admin_actions" on public.admin_actions
  for select to authenticated
  using (public.is_admin_aal2());
drop policy if exists "Admins write admin_actions" on public.admin_actions;
create policy "Admins write admin_actions" on public.admin_actions
  for insert to authenticated
  with check (public.is_admin_aal2());

-- reports: chiunque loggato può segnalare; solo admin AAL2 legge/gestisce
drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());
drop policy if exists "Admins manage reports" on public.reports;
create policy "Admins manage reports" on public.reports
  for all to authenticated
  using (public.is_admin_aal2()) with check (public.is_admin_aal2());

-- --- 7b. Policy admin di gestione contenuti (soft-delete su tutte le tabelle) -
-- Additive: si affiancano alle policy owner esistenti, non le sostituiscono.
do $$
declare t text;
begin
  foreach t in array array['runs', 'series', 'momenti', 'reviews', 'run_chat'] loop
    execute format('drop policy if exists "Admins manage %1$s" on public.%1$s', t);
    execute format(
      'create policy "Admins manage %1$s" on public.%1$s for all to authenticated '
      'using (public.is_admin_aal2()) with check (public.is_admin_aal2())', t);
  end loop;
end $$;

-- --- 7c. Blocco scrittura per utenti sospesi/bannati (policy RESTRICTIVE) -----
-- Le RESTRICTIVE si combinano in AND con le permissive: se is_active_user() è
-- false, ogni INSERT/UPDATE viene rifiutato a livello DB, non aggirabile dal client.
do $$
declare t text;
begin
  foreach t in array array['runs', 'series', 'momenti', 'reviews', 'run_chat',
                           'messages', 'participations', 'interests', 'check_ins']
  loop
    execute format('drop policy if exists "Active users only insert %1$s" on public.%1$s', t);
    execute format(
      'create policy "Active users only insert %1$s" on public.%1$s '
      'as restrictive for insert to authenticated with check (public.is_active_user())', t);
    execute format('drop policy if exists "Active users only update %1$s" on public.%1$s', t);
    execute format(
      'create policy "Active users only update %1$s" on public.%1$s '
      'as restrictive for update to authenticated using (public.is_active_user())', t);
  end loop;
end $$;

-- =============================================================================
-- FINE. Ricorda: le query pubbliche dei contenuti devono filtrare
-- `hidden_by_admin = false` (gestito lato applicazione).
-- =============================================================================
