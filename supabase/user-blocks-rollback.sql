-- Rollback di supabase/user-blocks.sql (SQL #42)
-- Elimina la tabella dei blocchi. Il resto dell'app non viene toccato.

drop table if exists public.user_blocks;
