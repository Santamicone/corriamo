-- Rollback di crew-join-request.sql (SQL #55)
-- ATTENZIONE: ripristina le policy di prima e quindi riapre l'ingresso nelle crew senza
-- approvazione tramite API. Da usare solo se il #55 rompe qualcosa, e per il minor tempo possibile.
-- Nota: la vecchia accept_crew_invite, ripristinata qui così com'era, nelle prove va in errore
-- ("column reference crew_id is ambiguous"): dopo il rollback i link di invito delle crew
-- private non funzionano.

begin;

drop trigger if exists trg_crew_members_protect_update on public.crew_members;
drop function if exists public.crew_members_protect_update();

drop policy if exists "crew_members_insert_self" on public.crew_members;
create policy "crew_members_insert_self" on public.crew_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "crew_members_insert_admin" on public.crew_members;
create policy "crew_members_insert_admin" on public.crew_members for insert
  with check (public.is_crew_admin(crew_id));

drop policy if exists "crew_members_update" on public.crew_members;
create policy "crew_members_update" on public.crew_members for update
  using (public.is_crew_admin(crew_id) or user_id = auth.uid());

-- Versione di crew-invite-accept.sql
create or replace function public.accept_crew_invite(p_token uuid)
returns table (crew_id uuid, result text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite   public.crew_invites%rowtype;
  v_uid      uuid := auth.uid();
  v_existing text;
begin
  if v_uid is null then
    return query select null::uuid, 'not_authenticated'; return;
  end if;

  select * into v_invite from public.crew_invites where token = p_token;
  if not found then
    return query select null::uuid, 'not_found'; return;
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return query select v_invite.crew_id, 'expired'; return;
  end if;

  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    return query select v_invite.crew_id, 'exhausted'; return;
  end if;

  select status into v_existing from public.crew_members
    where crew_id = v_invite.crew_id and user_id = v_uid;

  if v_existing = 'active' then
    return query select v_invite.crew_id, 'already_member'; return;
  end if;

  insert into public.crew_members (crew_id, user_id, role, status)
    values (v_invite.crew_id, v_uid, 'member', 'active')
    on conflict (crew_id, user_id)
    do update set status = 'active', role = 'member';

  update public.crew_invites set use_count = use_count + 1 where id = v_invite.id;

  return query select v_invite.crew_id, 'joined';
end;
$$;

grant execute on function public.accept_crew_invite(uuid) to authenticated;

commit;
