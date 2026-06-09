-- ============================================================================
-- VERIFICA post-migrazione — esegui DOPO apply-all-pending.sql
-- Ogni riga deve risultare 'OK'. Se vedi 'MANCANTE', quella parte non è
-- stata applicata.
-- ============================================================================

-- Tabelle
SELECT 'table run_confirmations' AS oggetto,
  CASE WHEN to_regclass('public.run_confirmations') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END AS stato
UNION ALL SELECT 'table crews',
  CASE WHEN to_regclass('public.crews') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'table crew_members',
  CASE WHEN to_regclass('public.crew_members') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'table crew_invites',
  CASE WHEN to_regclass('public.crew_invites') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END

-- Colonne
UNION ALL SELECT 'col profiles.reliability_score',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='reliability_score') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col profiles.email_prefs',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='email_prefs') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col profiles.last_seen_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='last_seen_at') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col runs.updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='runs' AND column_name='updated_at') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col runs.crew_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='runs' AND column_name='crew_id') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col runs.run_visibility',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='runs' AND column_name='run_visibility') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'col notifications.email_sent',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='notifications' AND column_name='email_sent') THEN 'OK' ELSE 'MANCANTE' END

-- Funzioni
UNION ALL SELECT 'fn update_reliability_score',
  CASE WHEN to_regprocedure('public.update_reliability_score(uuid)') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'fn is_active_crew_member',
  CASE WHEN to_regprocedure('public.is_active_crew_member(uuid)') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'fn is_crew_admin',
  CASE WHEN to_regprocedure('public.is_crew_admin(uuid)') IS NOT NULL THEN 'OK' ELSE 'MANCANTE' END

-- Realtime publication
UNION ALL SELECT 'realtime run_confirmations',
  CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='run_confirmations') THEN 'OK' ELSE 'MANCANTE' END
UNION ALL SELECT 'realtime crew_members',
  CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='crew_members') THEN 'OK' ELSE 'MANCANTE' END

-- Extension
UNION ALL SELECT 'ext pg_net',
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN 'OK' ELSE 'MANCANTE' END

ORDER BY oggetto;

-- Conteggio trigger attesi (dovrebbe restituire 9)
SELECT count(*) AS trigger_attesi_9 FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND t.tgname IN (
    'trg_reliability_checkin','trg_reliability_review','trg_reliability_confirmation',
    'trg_reliability_run_status','trg_runs_updated_at','trg_add_crew_owner',
    'trg_notify_crew_join_request','trg_notify_crew_request_outcome','trg_notify_crew_new_run'
  );
