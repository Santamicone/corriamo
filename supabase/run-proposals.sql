-- Proposte di corsa adottabili — SQL #53
-- Spec: vieniacorrere-app/docs/proposte-adottabili.md (§2 decisioni, §4 modello dati, §9 Q1–Q5)
--
-- Cosa fa
--   * run_proposals: corse SENZA organizzatore proposte dal servizio ("cerca organizzatore").
--     Tabella separata da `runs` di proposito: le app 1.0.x / 1.1.0 leggono `runs` e fanno il
--     join obbligatorio con l'organizzatore, quindi non devono mai vedere le proposte.
--   * proposal_interests: "Mi interesserebbe" (privato: si espone solo il numero).
--   * runs.proposal_id e notifications.proposal_id: tracciabilità (colonne nuove, nullable).
--   * proposals_discover(city, limit) e proposal_detail(id): lettura per sito e app, anche anon (Q2).
--   * adopt_proposal(id, run jsonb): "La organizzo io", atomica (una sola adozione per proposta);
--     crea la corsa reale, copia gli interessi in `interests`, notifica `proposta_adottata`.
--   * expire_run_proposals() + cron orario: le proposte scadute passano a 'scaduta'.
--   * call_send_push(): stesso corpo di run-notifications.sql (#44) + 'proposta_adottata'.
--
-- COMPATIBILITÀ: additivo, tranne la ridefinizione di call_send_push() (solo un tipo in più).
-- Le app già pubblicate non leggono le tabelle nuove; la notifica `proposta_adottata` ha
-- run_id = la corsa nuova, quindi nelle app vecchie apre la corsa (icona generica).
-- Rollback: supabase/run-proposals-rollback.sql (CANCELLA proposte e interessi raccolti).
--
-- ── PRIMA (o subito dopo) di eseguire questo file ───────────────────────────
--   supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
-- (PUSH_TYPES in send-push/index.ts include ora 'proposta_adottata'; da eseguire nella cartella
-- del sito `corriamo`). Pubblicarla prima è innocuo e garantisce che nessuna push di adozione
-- venga scartata dalla versione vecchia.

do $$
begin
  if to_regprocedure('public.is_admin_aal2()') is null or to_regprocedure('public.is_active_user()') is null then
    raise exception 'Mancano is_admin_aal2() / is_active_user(): esegui prima admin.sql';
  end if;
  if to_regclass('public.interests') is null then
    raise exception 'Manca la tabella public.interests (add-interests.sql)';
  end if;
  if to_regclass('public.user_blocks') is null then
    raise exception 'Manca la tabella public.user_blocks (user-blocks.sql)';
  end if;
  if to_regprocedure('public.call_send_push()') is null then
    raise exception 'Manca call_send_push(): esegui prima push-tokens.sql (#41) e run-notifications.sql (#44)';
  end if;
end $$;

create extension if not exists pg_cron;

-- 1. Proposte --------------------------------------------------------------------------
create table if not exists public.run_proposals (
  id              uuid        primary key default gen_random_uuid(),
  kind            text        not null check (kind in
                    ('principianti', 'tranquilla', 'aerobica', 'veloce', 'lungo', 'trail', 'rigenerante')),
  title           text        not null check (char_length(btrim(title)) between 3 and 120),
  description     text,
  city            text        not null check (btrim(city) <> ''),
  zone            text,                                   -- indicativa (es. "Percorso Verde")
  lat             numeric(7, 2),                          -- numeric(7,2) arrotonda da sé (D6)
  lng             numeric(7, 2),
  target_date     date        not null,
  time_from       time        not null,
  time_to         time        not null,
  distance_min_km numeric(5, 1) check (distance_min_km is null or distance_min_km > 0),
  distance_max_km numeric(5, 1) check (distance_max_km is null or distance_max_km > 0),
  pace_target     text,                                   -- stesso formato di runs.pace_target
  level           text        not null default 'tutti'
                    check (level in ('principiante', 'intermedio', 'avanzato', 'tutti')),
  status          text        not null default 'aperta'
                    check (status in ('aperta', 'adottata', 'scaduta', 'ritirata')),
  expires_at      timestamptz not null,
  adopted_run_id  uuid        references public.runs(id)     on delete set null,
  adopted_by      uuid        references public.profiles(id) on delete set null,
  adopted_at      timestamptz,
  source          text        not null default 'admin' check (source in ('admin', 'auto')),
  created_by      uuid        references public.profiles(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  check (time_to > time_from),
  check (distance_min_km is null or distance_max_km is null or distance_max_km >= distance_min_km)
);

create index if not exists run_proposals_open_idx
  on public.run_proposals (lower(city), target_date) where status = 'aperta';
create index if not exists run_proposals_expiry_idx
  on public.run_proposals (expires_at) where status = 'aperta';

-- Scadenza di default: la prima tra "creata + 7 giorni" e "il giorno prima alle 20:00" (ora italiana)
create or replace function public.run_proposals_set_expiry()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.expires_at is null then
    new.expires_at := least(
      coalesce(new.created_at, now()) + interval '7 days',
      ((new.target_date - 1) + time '20:00') at time zone 'Europe/Rome'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_run_proposals_expiry on public.run_proposals;
create trigger trg_run_proposals_expiry
  before insert on public.run_proposals
  for each row execute function public.run_proposals_set_expiry();

alter table public.run_proposals enable row level security;

-- Lettura pubblica (Q2). Scrittura solo admin AAL2; l'adozione passa da adopt_proposal().
drop policy if exists "run_proposals_select" on public.run_proposals;
create policy "run_proposals_select" on public.run_proposals
  for select using (true);

drop policy if exists "run_proposals_admin" on public.run_proposals;
create policy "run_proposals_admin" on public.run_proposals
  for all using (public.is_admin_aal2()) with check (public.is_admin_aal2());

-- 2. "Mi interesserebbe" -----------------------------------------------------------------
create table if not exists public.proposal_interests (
  proposal_id uuid        not null references public.run_proposals(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id)      on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index if not exists proposal_interests_user_idx on public.proposal_interests (user_id);

alter table public.proposal_interests enable row level security;

drop policy if exists "proposal_interests_select_own" on public.proposal_interests;
create policy "proposal_interests_select_own" on public.proposal_interests
  for select using (user_id = auth.uid());

drop policy if exists "proposal_interests_insert_own" on public.proposal_interests;
create policy "proposal_interests_insert_own" on public.proposal_interests
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.run_proposals p
      where p.id = proposal_id and p.status = 'aperta' and p.expires_at > now()
    )
  );

drop policy if exists "proposal_interests_delete_own" on public.proposal_interests;
create policy "proposal_interests_delete_own" on public.proposal_interests
  for delete using (user_id = auth.uid());

-- Come per le altre tabelle in admin.sql: gli utenti sospesi/bannati non scrivono
drop policy if exists "Active users only insert proposal_interests" on public.proposal_interests;
create policy "Active users only insert proposal_interests" on public.proposal_interests
  as restrictive for insert to authenticated with check (public.is_active_user());

-- 3. Tracciabilità ---------------------------------------------------------------------
alter table public.runs
  add column if not exists proposal_id uuid references public.run_proposals(id) on delete set null;
-- Una proposta genera al massimo una corsa
create unique index if not exists runs_proposal_id_key
  on public.runs (proposal_id) where proposal_id is not null;

alter table public.notifications
  add column if not exists proposal_id uuid references public.run_proposals(id) on delete cascade;

-- 4. Lettura ------------------------------------------------------------------------------
-- SECURITY DEFINER perché il conteggio legge proposal_interests, che ognuno vede solo per sé.
-- Espone solo i campi pubblici della proposta, il numero di interessati e "io sono interessato".

-- Proposte aperte e future. Con p_city filtra sulla città (come la Bacheca, ilike); senza, tutte.
-- Nasconde le proposte per cui esiste già una corsa reale compatibile (stessa città, data ±1
-- giorno, distanza nell'intervallo): le corse reali hanno la precedenza.
create or replace function public.proposals_discover(
  p_city  text    default null,
  p_limit integer default 10
)
returns table (
  id              uuid,
  kind            text,
  title           text,
  description     text,
  city            text,
  zone            text,
  lat             numeric,
  lng             numeric,
  target_date     date,
  time_from       time,
  time_to         time,
  distance_min_km numeric,
  distance_max_km numeric,
  pace_target     text,
  level           text,
  expires_at      timestamptz,
  interest_count  integer,
  i_am_interested boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id, p.kind, p.title, p.description, p.city, p.zone, p.lat, p.lng,
    p.target_date, p.time_from, p.time_to, p.distance_min_km, p.distance_max_km,
    p.pace_target, p.level, p.expires_at,
    (select count(*)::integer from public.proposal_interests i where i.proposal_id = p.id),
    coalesce(auth.uid() is not null and exists (
      select 1 from public.proposal_interests i
      where i.proposal_id = p.id and i.user_id = auth.uid()), false)
  from public.run_proposals p
  where p.status = 'aperta'
    and p.expires_at > now()
    and p.target_date >= (now() at time zone 'Europe/Rome')::date
    and (p_city is null or btrim(p_city) = '' or p.city ilike '%' || btrim(p_city) || '%')
    and not exists (
      select 1 from public.runs r
      where lower(r.city) = lower(p.city)
        and r.status = 'aperta'
        and r.run_visibility = 'public'
        and coalesce(r.type, 'allenamento') <> 'gara'
        and not r.hidden_by_admin
        and r.date between p.target_date - 1 and p.target_date + 1
        and r.distance_km between coalesce(p.distance_min_km, 0) and coalesce(p.distance_max_km, 1000)
    )
  order by p.target_date, p.time_from, p.created_at
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

-- Una proposta in qualunque stato (per la scheda), con chi l'ha adottata e la corsa nata.
create or replace function public.proposal_detail(p_id uuid)
returns table (
  id              uuid,
  kind            text,
  title           text,
  description     text,
  city            text,
  zone            text,
  lat             numeric,
  lng             numeric,
  target_date     date,
  time_from       time,
  time_to         time,
  distance_min_km numeric,
  distance_max_km numeric,
  pace_target     text,
  level           text,
  status          text,
  expires_at      timestamptz,
  adopted_run_id  uuid,
  adopted_by      uuid,
  adopted_by_name text,
  interest_count  integer,
  i_am_interested boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id, p.kind, p.title, p.description, p.city, p.zone, p.lat, p.lng,
    p.target_date, p.time_from, p.time_to, p.distance_min_km, p.distance_max_km,
    p.pace_target, p.level,
    -- Una proposta oltre la scadenza ma non ancora toccata dal cron si mostra già scaduta
    case when p.status = 'aperta' and p.expires_at <= now() then 'scaduta' else p.status end,
    p.expires_at, p.adopted_run_id, p.adopted_by, a.full_name,
    (select count(*)::integer from public.proposal_interests i where i.proposal_id = p.id),
    coalesce(auth.uid() is not null and exists (
      select 1 from public.proposal_interests i
      where i.proposal_id = p.id and i.user_id = auth.uid()), false)
  from public.run_proposals p
  left join public.profiles a on a.id = p.adopted_by
  where p.id = p_id;
$$;

revoke all on function public.proposals_discover(text, integer) from public;
revoke all on function public.proposal_detail(uuid)             from public;
grant execute on function public.proposals_discover(text, integer) to anon, authenticated;
grant execute on function public.proposal_detail(uuid)             to anon, authenticated;

-- 5. Adozione ("La organizzo io") ------------------------------------------------------------
-- p_run ha gli stessi campi di NewRunInput dell'app / del modulo del sito:
--   title, description, date, time, location, city, distance_km, pace_target, level,
--   max_participants, is_no_drop, location_public, tags, lat, lng
-- Errori (nel messaggio, da tradurre nel client):
--   not_authenticated, user_suspended, proposal_not_found, proposal_taken, proposal_expired,
--   adopt_limit, date_out_of_range, invalid_run
create or replace function public.adopt_proposal(p_proposal_id uuid, p_run jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_today  date := (now() at time zone 'Europe/Rome')::date;
  v_p      public.run_proposals%rowtype;
  v_date   date;
  v_time   time;
  v_title  text;
  v_loc    text;
  v_city   text;
  v_run_id uuid;
  v_name   text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_active_user() then
    raise exception 'user_suspended';
  end if;

  -- Blocca la proposta: chi arriva secondo aspetta e poi trova status = 'adottata'
  select * into v_p from public.run_proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal_not_found';
  end if;
  if v_p.status = 'adottata' then
    raise exception 'proposal_taken';
  end if;
  if v_p.status <> 'aperta' or v_p.expires_at <= now() then
    raise exception 'proposal_expired';
  end if;

  -- Anti-abuso: al massimo 2 corse future nate da proposte per organizzatore
  if (select count(*) from public.runs r
       where r.organizer_id = v_uid and r.proposal_id is not null
         and r.status = 'aperta' and r.date >= v_today) >= 2 then
    raise exception 'adopt_limit';
  end if;

  begin
    v_date  := (p_run ->> 'date')::date;
    v_time  := (p_run ->> 'time')::time;
  exception when others then
    raise exception 'invalid_run';
  end;
  v_title := nullif(btrim(p_run ->> 'title'), '');
  v_loc   := nullif(btrim(p_run ->> 'location'), '');
  v_city  := coalesce(nullif(btrim(p_run ->> 'city'), ''), v_p.city);
  if v_date is null or v_time is null or v_title is null or v_loc is null then
    raise exception 'invalid_run';
  end if;

  -- Q1: la data si può spostare di ±2 giorni, mai nel passato
  if v_date < v_today or v_date not between v_p.target_date - 2 and v_p.target_date + 2 then
    raise exception 'date_out_of_range';
  end if;

  -- Stessi valori di createRun() nell'app; i CHECK di `runs` validano il resto
  insert into public.runs (
    organizer_id, title, description, date, time, location, city,
    distance_km, pace_target, level, max_participants, is_no_drop,
    location_public, tags, lat, lng,
    status, run_visibility, crew_id, series_id, proposal_id
  ) values (
    v_uid, v_title, nullif(btrim(p_run ->> 'description'), ''), v_date, v_time, v_loc, v_city,
    nullif(p_run ->> 'distance_km', '')::numeric,
    nullif(btrim(p_run ->> 'pace_target'), ''),
    coalesce(nullif(p_run ->> 'level', ''), v_p.level),
    nullif(p_run ->> 'max_participants', '')::integer,
    coalesce((p_run ->> 'is_no_drop')::boolean, false),
    coalesce((p_run ->> 'location_public')::boolean, true),
    coalesce(array(select jsonb_array_elements_text(
      case when jsonb_typeof(p_run -> 'tags') = 'array' then p_run -> 'tags' else '[]'::jsonb end)), '{}'),
    nullif(p_run ->> 'lat', '')::numeric,
    nullif(p_run ->> 'lng', '')::numeric,
    'aperta', 'public', null, null, p_proposal_id
  )
  returning id into v_run_id;

  update public.run_proposals
     set status = 'adottata', adopted_run_id = v_run_id, adopted_by = v_uid, adopted_at = now()
   where id = p_proposal_id;

  -- D4: gli interessati diventano "Mi interessa" della corsa nuova (non partecipanti).
  -- Esclusi chi adotta e chi ha un blocco con lui, in un senso o nell'altro.
  insert into public.interests (run_id, user_id)
  select v_run_id, pi.user_id
    from public.proposal_interests pi
   where pi.proposal_id = p_proposal_id
     and pi.user_id <> v_uid
     and not exists (
       select 1 from public.user_blocks b
        where (b.blocker_id = pi.user_id and b.blocked_id = v_uid)
           or (b.blocker_id = v_uid and b.blocked_id = pi.user_id))
  on conflict (run_id, user_id) do nothing;

  select full_name into v_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, body, run_id, actor_id, proposal_id)
  select pi.user_id,
         'proposta_adottata',
         coalesce(v_name, 'Un runner') || ' organizza «' || v_title || '»',
         to_char(v_date, 'DD/MM') || ' alle ' || to_char(v_time, 'HH24:MI') || ' · ' || v_city
           || '. Ti interessava: iscriviti!',
         v_run_id, v_uid, p_proposal_id
    from public.proposal_interests pi
   where pi.proposal_id = p_proposal_id
     and pi.user_id <> v_uid
     and not exists (
       select 1 from public.user_blocks b
        where (b.blocker_id = pi.user_id and b.blocked_id = v_uid)
           or (b.blocker_id = v_uid and b.blocked_id = pi.user_id));

  return v_run_id;
end;
$$;

revoke all on function public.adopt_proposal(uuid, jsonb) from public, anon;
grant execute on function public.adopt_proposal(uuid, jsonb) to authenticated;

-- 6. Scadenza -------------------------------------------------------------------------------
create or replace function public.expire_run_proposals()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.run_proposals
     set status = 'scaduta'
   where status = 'aperta' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_run_proposals() from public, anon, authenticated;

select cron.unschedule('expire-run-proposals')
where exists (select 1 from cron.job where jobname = 'expire-run-proposals');

select cron.schedule('expire-run-proposals', '7 * * * *', $$select public.expire_run_proposals();$$);

-- 7. Push: stessa funzione di run-notifications.sql (#44) + 'proposta_adottata' -------------
-- Tenere allineato con PUSH_TYPES in supabase/functions/send-push/index.ts.
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
    'nuovo_messaggio', 'chat_corsa', 'proposta_adottata'
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
