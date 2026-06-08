-- ============================================================
-- FIX: infinite recursion in crews / crew_members RLS policies
--
-- Il problema: crews_select controlla crew_members,
-- crew_members_select controlla crews → ciclo infinito.
--
-- Soluzione: funzioni SECURITY DEFINER che eseguono le query
-- bypassando RLS, spezzando la dipendenza circolare.
-- ============================================================

-- 1. Drop delle policy ricorsive
DROP POLICY IF EXISTS "crews_select"        ON public.crews;
DROP POLICY IF EXISTS "crew_members_select" ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_update" ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_insert_admin" ON public.crew_members;

-- 2. Funzione helper: verifica appartenenza attiva a una crew (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_active_crew_member(p_crew_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = p_crew_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- 3. Funzione helper: verifica ruolo admin/owner in una crew (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_crew_admin(p_crew_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = p_crew_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- 4. Ricrea policy crews_select senza riferimenti a crew_members
CREATE POLICY "crews_select" ON public.crews FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR public.is_active_crew_member(id)
);

-- 5. Ricrea policy crew_members_select senza riferimenti a crews
CREATE POLICY "crew_members_select" ON public.crew_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_crew_admin(crew_id)
  OR public.is_active_crew_member(crew_id)
);

-- 6. Ricrea policy crew_members_update senza riferimenti a crews
CREATE POLICY "crew_members_update" ON public.crew_members FOR UPDATE USING (
  public.is_crew_admin(crew_id)
  OR user_id = auth.uid()
);

-- 7. Ricrea policy crew_members_insert_admin senza riferimenti a crews
CREATE POLICY "crew_members_insert_admin" ON public.crew_members FOR INSERT WITH CHECK (
  public.is_crew_admin(crew_id)
);
