-- Crew: ingresso solo su richiesta — SQL #55
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §2
--
-- Perché (sicurezza)
--   Le policy precedenti permettevano di entrare in una crew senza approvazione usando
--   direttamente le API di Supabase:
--     * crew_members_insert_self controllava solo user_id = auth.uid(): ci si poteva inserire
--       già 'active', anche come 'owner' o 'admin';
--     * crew_members_update lasciava modificare la propria riga senza limiti (pending → active,
--       promozione, cambio di crew_id);
--     * un owner/admin poteva aggiungere chiunque (policy insert_admin, o cambiando user_id).
--
-- Cosa fa
--   * INSERT: solo se stessi, come 'member' e 'pending'. Via la policy insert_admin.
--   * UPDATE: solo owner/admin della crew. In più un trigger rende non modificabili
--     crew_id e user_id, protegge la riga del proprietario e riserva i ruoli al proprietario.
--   * accept_crew_invite: il link di invito non fa più entrare, crea una richiesta in attesa
--     (i gestori ricevono la solita notifica). Corregge anche un errore della versione
--     precedente, che nelle prove falliva con "column reference crew_id is ambiguous".
--
-- Chi resta fuori da queste regole: il trigger che iscrive il proprietario alla creazione
-- (SECURITY DEFINER) e le operazioni senza utente (SQL Editor, service_role).
--
-- COMPATIBILITÀ: restringe i permessi, non tocca dati né struttura. Le app 1.0.x/1.1.x/1.2.x
-- chiedono l'ingresso con ('member','pending') e approvano aggiornando solo `status`:
-- continuano a funzionare. Non chiamano accept_crew_invite.
--
-- Eseguire subito prima di pubblicare il sito aggiornato.
-- Rollback: supabase/crew-join-request-rollback.sql (riapre i varchi descritti sopra).

begin;

-- 1. INSERT ------------------------------------------------------------------------------
drop policy if exists "crew_members_insert_admin" on public.crew_members;

drop policy if exists "crew_members_insert_self" on public.crew_members;
create policy "crew_members_insert_self" on public.crew_members for insert
  with check (auth.uid() = user_id and role = 'member' and status = 'pending');

-- 2. UPDATE ------------------------------------------------------------------------------
drop policy if exists "crew_members_update" on public.crew_members;
create policy "crew_members_update" on public.crew_members for update
  using (public.is_crew_admin(crew_id))
  with check (public.is_crew_admin(crew_id));

create or replace function public.crew_members_protect_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  -- Manutenzione senza utente (SQL Editor, service_role): nessun vincolo.
  if auth.uid() is null then return new; end if;

  if new.crew_id is distinct from old.crew_id or new.user_id is distinct from old.user_id then
    raise exception 'crew_members: crew_id e user_id non sono modificabili' using errcode = '42501';
  end if;

  if new.role is not distinct from old.role and new.status is not distinct from old.status then
    return new;
  end if;

  select owner_id into v_owner from public.crews where id = old.crew_id;

  if old.user_id = v_owner then
    raise exception 'crew_members: ruolo e stato del proprietario non sono modificabili' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if new.role = 'owner' then
      raise exception 'crew_members: il ruolo owner non è assegnabile' using errcode = '42501';
    end if;
    if auth.uid() is distinct from v_owner then
      raise exception 'crew_members: solo il proprietario può cambiare i ruoli' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crew_members_protect_update on public.crew_members;
create trigger trg_crew_members_protect_update
  before update on public.crew_members
  for each row execute function public.crew_members_protect_update();

-- 3. Link di invito: richiesta, non ingresso ----------------------------------------------
-- Esiti: requested | already_requested | already_member | expired | exhausted | not_found
--        | not_authenticated
create or replace function public.accept_crew_invite(p_token uuid)
returns table (crew_id uuid, result text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_invite   public.crew_invites%rowtype;
  v_uid      uuid := auth.uid();
  v_existing text;
begin
  if v_uid is null then
    return query select null::uuid, 'not_authenticated'; return;
  end if;

  -- for update: due richieste contemporanee non superano max_uses
  select * into v_invite from public.crew_invites where token = p_token for update;
  if not found then
    return query select null::uuid, 'not_found'; return;
  end if;

  select status into v_existing from public.crew_members
   where crew_id = v_invite.crew_id and user_id = v_uid;

  -- Chi è già dentro o ha già chiesto lo scopre anche con un link ormai scaduto
  if v_existing = 'active' then
    return query select v_invite.crew_id, 'already_member'; return;
  end if;
  if v_existing = 'pending' then
    return query select v_invite.crew_id, 'already_requested'; return;
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return query select v_invite.crew_id, 'expired'; return;
  end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    return query select v_invite.crew_id, 'exhausted'; return;
  end if;

  -- Richiesta rifiutata in passato: si ricrea la riga, così parte di nuovo la notifica ai
  -- gestori (il trigger è AFTER INSERT).
  if v_existing = 'rejected' then
    delete from public.crew_members where crew_id = v_invite.crew_id and user_id = v_uid;
  end if;

  insert into public.crew_members (crew_id, user_id, role, status)
  values (v_invite.crew_id, v_uid, 'member', 'pending')
  on conflict (crew_id, user_id) do nothing;

  if not found then
    return query select v_invite.crew_id, 'already_requested'; return;
  end if;

  update public.crew_invites set use_count = use_count + 1 where id = v_invite.id;

  return query select v_invite.crew_id, 'requested';
end;
$$;

revoke all on function public.accept_crew_invite(uuid) from public, anon;
grant execute on function public.accept_crew_invite(uuid) to authenticated;

-- 4. Controllo: nessun'altra policy permissiva deve riaprire INSERT o UPDATE --------------
do $$
declare
  v_extra text;
begin
  select string_agg(policyname || ' (' || cmd || ')', ', ') into v_extra
  from pg_policies
  where schemaname = 'public' and tablename = 'crew_members'
    and permissive = 'PERMISSIVE'
    and cmd in ('INSERT', 'UPDATE', 'ALL')
    and policyname not in ('crew_members_insert_self', 'crew_members_update');

  if v_extra is not null then
    raise exception 'Policy inattese su crew_members: %. Niente è stato modificato.', v_extra;
  end if;
end;
$$;

commit;

-- Risultato atteso: una policy per DELETE, INSERT, SELECT e UPDATE; niente insert_admin.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'crew_members'
order by cmd, policyname;

-- DOPO, a mano (sola lettura): ruoli 'owner' che non corrispondono al proprietario della crew.
-- select c.name, m.user_id, m.status, m.joined_at
-- from public.crew_members m join public.crews c on c.id = m.crew_id
-- where m.role = 'owner' and m.user_id is distinct from c.owner_id;
