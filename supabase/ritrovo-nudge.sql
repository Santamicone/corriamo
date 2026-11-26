-- Ritrovo: arrivi e sollecito a chi manca — SQL #58
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §5
--
-- Perché una tabella degli arrivi
--   "Ho trovato il gruppo — Disattiva" (app e sito) CANCELLA la riga di check_ins, che quindi
--   significa "ho lo schermo del ritrovo acceso", non "sono arrivato". Per contare gli arrivi
--   serve una traccia che resti: run_arrivals, scritta da un trigger al primo "Sono qui".
--   Vale così anche per le app già pubblicate, che continuano a usare solo check_ins.
--
-- Cosa fa
--   * run_arrivals: la legge chi organizza la corsa (e ognuno la propria riga). Nessuno la
--     scrive a mano. Recupera i check-in ancora presenti; quelli già cancellati sono persi.
--   * run_nudges: ultimo sollecito per corsa (tabella a parte: aggiornare `runs` farebbe
--     partire le notifiche di corsa modificata). La legge chi organizza.
--   * nudge_missing(run_id): solo chi organizza, da 10 minuti prima a 30 dopo la partenza,
--     al massimo una volta ogni 5 minuti. Notifica gli approvati non arrivati, esclusi i
--     blocchi. "Siamo già tutti qui" solo se mancano al massimo 2 persone e almeno un'altra
--     persona approvata è arrivata; altrimenti un testo neutro.
--     Errori (nel messaggio): not_authenticated, user_suspended, run_not_found, not_organizer,
--     run_cancelled, outside_window, nobody_missing, too_soon
--   * call_send_push(): come in run-proposals.sql (#53) + 'sollecito_ritrovo'.
--
-- ── PRIMA di eseguire questo file ──────────────────────────────────────────
--   supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api
-- (dalla cartella del sito `corriamo`). La versione vecchia segnerebbe i solleciti come inviati
-- senza inviarli.
--
-- COMPATIBILITÀ: additivo, tranne la ridefinizione di call_send_push() (solo un tipo in più).
-- Eseguire dopo: checkins-fix.sql (#57), run-proposals.sql (#53).
-- Rollback: supabase/ritrovo-nudge-rollback.sql

do $$
begin
  if to_regprocedure('public.is_active_user()') is null then
    raise exception 'Manca is_active_user(): esegui prima admin.sql';
  end if;
  if to_regclass('public.user_blocks') is null then
    raise exception 'Manca la tabella public.user_blocks (user-blocks.sql)';
  end if;
  if to_regprocedure('public.call_send_push()') is null then
    raise exception 'Manca call_send_push(): esegui prima push-tokens.sql (#41)';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'check_ins'
                  and policyname = 'check_ins_insert' and with_check like '%p.run_id = check_ins.run_id%') then
    raise exception 'Manca la correzione dei check-in: esegui prima checkins-fix.sql (#57)';
  end if;
end $$;

begin;

-- 1. Arrivi ----------------------------------------------------------------------------------
create table if not exists public.run_arrivals (
  run_id     uuid        not null references public.runs(id)     on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  arrived_at timestamptz not null default now(),
  primary key (run_id, user_id)
);

alter table public.run_arrivals enable row level security;

drop policy if exists "run_arrivals_select" on public.run_arrivals;
create policy "run_arrivals_select" on public.run_arrivals
  for select using (
    run_arrivals.user_id = auth.uid()
    or exists (select 1 from public.runs r
                where r.id = run_arrivals.run_id and r.organizer_id = auth.uid())
  );

create or replace function public.record_run_arrival()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.run_arrivals as a (run_id, user_id, arrived_at)
  values (new.run_id, new.user_id, coalesce(new.checked_in_at, now()))
  -- Un arrivo di ore prima (corsa spostata) viene aggiornato; altrimenti resta il primo
  on conflict (run_id, user_id) do update set arrived_at = excluded.arrived_at
    where a.arrived_at < excluded.arrived_at - interval '3 hours';
  return new;
exception when others then
  -- La traccia dell'arrivo non deve MAI far fallire "Sono qui"
  return new;
end;
$$;

drop trigger if exists trg_check_ins_arrival on public.check_ins;
create trigger trg_check_ins_arrival
  after insert on public.check_ins
  for each row execute function public.record_run_arrival();

-- Recupero dei check-in ancora presenti, solo di chi organizza o è approvato
insert into public.run_arrivals (run_id, user_id, arrived_at)
select ci.run_id, ci.user_id, coalesce(ci.checked_in_at, now())
  from public.check_ins ci
  join public.runs r on r.id = ci.run_id
 where ci.user_id = r.organizer_id
    or exists (select 1 from public.participations p
                where p.run_id = ci.run_id and p.user_id = ci.user_id and p.status = 'approvata')
on conflict (run_id, user_id) do nothing;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'run_arrivals') then
    alter publication supabase_realtime add table public.run_arrivals;
  end if;
end $$;

-- 2. Ultimo sollecito ------------------------------------------------------------------------
create table if not exists public.run_nudges (
  run_id        uuid        primary key references public.runs(id) on delete cascade,
  last_nudge_at timestamptz not null
);

alter table public.run_nudges enable row level security;

drop policy if exists "run_nudges_select" on public.run_nudges;
create policy "run_nudges_select" on public.run_nudges
  for select using (
    exists (select 1 from public.runs r
             where r.id = run_nudges.run_id and r.organizer_id = auth.uid())
  );

-- 3. Sollecito -------------------------------------------------------------------------------
create or replace function public.nudge_missing(p_run_id uuid)
returns table (notified integer, next_allowed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c_every  constant interval := interval '5 minutes';
  v_uid    uuid := auth.uid();
  v_run    public.runs%rowtype;
  v_start  timestamptz;
  v_missing uuid[];
  v_arrived integer;
  v_title  text;
  v_count  integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_active_user() then raise exception 'user_suspended'; end if;

  select * into v_run from public.runs where id = p_run_id;
  if not found then raise exception 'run_not_found'; end if;
  if v_run.organizer_id <> v_uid then raise exception 'not_organizer'; end if;
  if v_run.status = 'annullata' then raise exception 'run_cancelled'; end if;

  v_start := (v_run.date + v_run.time) at time zone 'Europe/Rome';
  if now() < v_start - interval '10 minutes' or now() > v_start + interval '30 minutes' then
    raise exception 'outside_window';
  end if;

  -- Approvati senza arrivo. Conta solo un arrivo vicino a QUESTA partenza (corse spostate)
  select coalesce(array_agg(p.user_id) filter (where a.user_id is null), '{}'),
         count(a.user_id)
    into v_missing, v_arrived
    from public.participations p
    left join public.run_arrivals a
      on a.run_id = p.run_id and a.user_id = p.user_id
     and a.arrived_at >= v_start - interval '2 hours'
   where p.run_id = p_run_id and p.status = 'approvata' and p.user_id <> v_uid;

  if cardinality(v_missing) = 0 then raise exception 'nobody_missing'; end if;

  v_title := case
    when cardinality(v_missing) <= 2 and v_arrived >= 1
      then 'Ehi siamo già tutti qui, ti stiamo aspettando!'
    else 'Siamo al ritrovo, ti aspettiamo!'
  end;

  -- Un solo sollecito ogni 5 minuti, anche con due tocchi contemporanei: se la riga è recente
  -- l'update non avviene e non è "found"
  insert into public.run_nudges as n (run_id, last_nudge_at)
  values (p_run_id, now())
  on conflict (run_id) do update set last_nudge_at = excluded.last_nudge_at
    where n.last_nudge_at <= excluded.last_nudge_at - c_every;
  if not found then raise exception 'too_soon'; end if;

  insert into public.notifications (user_id, type, title, body, run_id, actor_id)
  select m.user_id, 'sollecito_ritrovo', v_title,
         v_run.title || ' · partenza alle ' || to_char(v_run.time, 'HH24:MI'),
         p_run_id, v_uid
    from unnest(v_missing) as m(user_id)
   where not exists (
     select 1 from public.user_blocks b
      where (b.blocker_id = m.user_id and b.blocked_id = v_uid)
         or (b.blocker_id = v_uid and b.blocked_id = m.user_id));
  get diagnostics v_count = row_count;

  return query select v_count, now() + c_every;
end;
$$;

revoke all on function public.nudge_missing(uuid) from public, anon;
grant execute on function public.nudge_missing(uuid) to authenticated;
revoke all on function public.record_run_arrival() from public, anon, authenticated;

-- 4. Push: stessa funzione di run-proposals.sql (#53) + 'sollecito_ritrovo' -------------------
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
    'nuovo_messaggio', 'chat_corsa', 'proposta_adottata', 'sollecito_ritrovo'
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

notify pgrst, 'reload schema';

commit;

-- Risultato atteso: una riga con tutti i valori 'true'.
select
  to_regclass('public.run_arrivals') is not null as arrivi,
  to_regclass('public.run_nudges') is not null as solleciti,
  exists (select 1 from pg_trigger where tgname = 'trg_check_ins_arrival') as trigger_arrivo,
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'run_arrivals') as realtime,
  has_function_privilege('authenticated', 'public.nudge_missing(uuid)', 'execute') as utenti_possono,
  not has_function_privilege('anon', 'public.nudge_missing(uuid)', 'execute') as anonimi_no,
  pg_get_functiondef('public.call_send_push()'::regprocedure) like '%sollecito_ritrovo%' as push;
