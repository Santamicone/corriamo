-- Eliminazione "alla WhatsApp" dei messaggi di chat — SQL #54
-- Spec: vieniacorrere-app/docs/evoluzioni-crew.md §1
--
-- Cosa fa
--   * crew_chat.deleted_at e run_chat.deleted_at: un messaggio eliminato resta come riga,
--     con `body` sostituito da 'Messaggio eliminato' (il contenuto originale sparisce davvero)
--     e `deleted_at` valorizzato. L'app nuova mostra "Messaggio eliminato" in corsivo.
--   * delete_crew_chat_message(id): autore oppure owner/admin della crew.
--   * delete_run_chat_message(id): autore oppure organizzatore della corsa.
--     (Fino a oggi chi organizza non poteva togliere i messaggi altrui.)
--
-- COMPATIBILITÀ: additivo. Le app già pubblicate continuano a fare DELETE fisico (le policy
-- esistenti restano) e a leggere `*`: un messaggio eliminato dalla nuova app compare nelle
-- vecchie come testo normale "Messaggio eliminato", senza rotture.
-- Non servono policy di UPDATE: le modifiche passano solo dalle RPC (SECURITY DEFINER).
--
-- Realtime: gli UPDATE sono già pubblicati (le tabelle sono in supabase_realtime).
-- Rollback: supabase/chat-delete-rollback.sql

alter table public.crew_chat add column if not exists deleted_at timestamptz;
alter table public.run_chat  add column if not exists deleted_at timestamptz;

create or replace function public.delete_crew_chat_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_crew   uuid;
  v_author uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select crew_id, author_id into v_crew, v_author
  from public.crew_chat where id = p_message_id;
  if not found then raise exception 'message_not_found'; end if;

  if v_author <> auth.uid() and not public.is_crew_admin(v_crew) then
    raise exception 'forbidden';
  end if;

  update public.crew_chat
     set body = 'Messaggio eliminato', deleted_at = now()
   where id = p_message_id and deleted_at is null;
end;
$$;

create or replace function public.delete_run_chat_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_run       uuid;
  v_author    uuid;
  v_organizer uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select c.run_id, c.author_id, r.organizer_id into v_run, v_author, v_organizer
  from public.run_chat c join public.runs r on r.id = c.run_id
  where c.id = p_message_id;
  if not found then raise exception 'message_not_found'; end if;

  if v_author <> auth.uid() and v_organizer <> auth.uid() then
    raise exception 'forbidden';
  end if;

  update public.run_chat
     set body = 'Messaggio eliminato', deleted_at = now()
   where id = p_message_id and deleted_at is null;
end;
$$;

revoke all on function public.delete_crew_chat_message(uuid) from public, anon;
revoke all on function public.delete_run_chat_message(uuid)  from public, anon;
grant execute on function public.delete_crew_chat_message(uuid) to authenticated;
grant execute on function public.delete_run_chat_message(uuid)  to authenticated;
