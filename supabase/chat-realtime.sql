-- Tempo reale per chat della corsa e messaggi privati — SQL #61
--
-- Problema (verificato il 26/11/2026): il server rifiuta l'iscrizione in tempo reale a
-- `run_chat` e `messages` anche con utente autenticato. La chat della corsa (sito e app) e
-- il badge dei messaggi (sito) si aggiornano solo ricaricando.
--
-- Cosa fa: aggiunge le due tabelle alla publication `supabase_realtime`, se mancano.
-- Non tocca colonne, dati, policy né permessi.
--
-- Chi riceve cosa: per INSERT e UPDATE il tempo reale applica le policy di lettura (RLS),
-- quindi `messages` arriva solo a mittente e destinatario, `run_chat` solo a organizzatore
-- e partecipanti approvati. Gli eventi DELETE non passano dalle policy, ma con RLS attiva
-- contengono soltanto l'id della riga. Lo script si ferma se la RLS non è attiva.
--
-- COMPATIBILITÀ: additivo. Rieseguibile senza errori.
-- Rollback: supabase/chat-realtime-rollback.sql

begin;

do $$
declare
  t text;
begin
  foreach t in array array['run_chat', 'messages'] loop
    if not (select relrowsecurity from pg_class where oid = format('public.%I', t)::regclass) then
      raise exception 'RLS non attiva su public.%: nessuna modifica eseguita', t;
    end if;

    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

commit;

-- Risultato atteso: una riga con i due valori 'true'.
select
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'run_chat') as chat_corsa,
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') as messaggi;
