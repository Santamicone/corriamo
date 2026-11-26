-- Rollback di #54 (chat-delete.sql).
-- I messaggi già eliminati restano come righe con testo 'Messaggio eliminato'.
drop function if exists public.delete_crew_chat_message(uuid);
drop function if exists public.delete_run_chat_message(uuid);
alter table public.crew_chat drop column if exists deleted_at;
alter table public.run_chat  drop column if exists deleted_at;
