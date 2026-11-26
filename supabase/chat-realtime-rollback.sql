-- Rollback di chat-realtime.sql (SQL #61)
--
-- Toglie `run_chat` e `messages` dalla publication `supabase_realtime`. Non tocca dati né policy.
-- Attenzione: le toglie anche se una delle due era già pubblicata prima dello script #61.
-- Rieseguibile senza errori.

begin;

do $$
declare
  t text;
begin
  foreach t in array array['run_chat', 'messages'] loop
    if exists (select 1 from pg_publication_tables
                where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end;
$$;

commit;

-- Risultato atteso: nessuna riga.
select tablename from pg_publication_tables
 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('run_chat', 'messages');
