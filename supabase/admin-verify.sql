-- Verifica read-only dello stato di admin.sql (#28). Non modifica nulla.
-- Esegui in Supabase Dashboard → SQL Editor.

select 'user_moderation'      as oggetto, to_regclass('public.user_moderation')     is not null as presente
union all select 'admin_actions',        to_regclass('public.admin_actions')        is not null
union all select 'reports',              to_regclass('public.reports')              is not null
union all select 'admin_recovery_codes', to_regclass('public.admin_recovery_codes') is not null
union all select 'fn is_admin_aal2',     to_regprocedure('public.is_admin_aal2()')  is not null
union all select 'fn is_active_user',    to_regprocedure('public.is_active_user()') is not null
union all select 'profiles.moderation_status',
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='profiles' and column_name='moderation_status')
union all select 'runs.hidden_by_admin',
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='runs' and column_name='hidden_by_admin');
