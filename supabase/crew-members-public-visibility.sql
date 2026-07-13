-- ============================================================
-- FIX: coerenza visibilità pagina crew (membri vs bacheca)
--
-- Due aggiustamenti alle policy RLS della pagina crew:
--
-- 1) MEMBRI delle crew pubbliche visibili ai non-membri.
--    Sintomo: da sloggato la card statistiche mostra "2 Atleti"
--    (RPC crew_stats, SECURITY DEFINER → bypassa RLS) mentre la
--    lista membri mostra "0 Atleti" (query diretta su crew_members
--    → soggetta a RLS). Da anonimo auth.uid() è NULL, quindi
--    crew_members_select non torna righe nemmeno per le crew
--    pubbliche, che invece sono interamente pubbliche (crews_select
--    ammette visibility = 'public').
--    → I membri ATTIVI di una crew PUBBLICA diventano leggibili da
--      tutti; le crew private restano riservate ai membri; i pending
--      restano nascosti.
--
-- 2) BACHECA DEL COACH riservata ai soli membri.
--    Attualmente crew_posts_select espone i post anche per le crew
--    pubbliche. La bacheca deve essere visibile solo ai membri
--    attivi (owner/admin inclusi, che sono membri attivi).
--
-- Riusa l'helper esistente public.crew_is_public(uuid).
-- Idempotente: rieseguibile senza effetti collaterali.
-- Eseguire dopo: crews-fix-rls.sql, crew-enhancements.sql
-- ============================================================

-- 1) Membri: aggiungi la clausola crew pubblica
DROP POLICY IF EXISTS "crew_members_select" ON public.crew_members;

CREATE POLICY "crew_members_select" ON public.crew_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_crew_admin(crew_id)
  OR public.is_active_crew_member(crew_id)
  OR (status = 'active' AND public.crew_is_public(crew_id))
);

-- 2) Bacheca del coach: solo membri attivi (rimossa la clausola pubblica)
DROP POLICY IF EXISTS "crew_posts_select" ON public.crew_posts;

CREATE POLICY "crew_posts_select" ON public.crew_posts FOR SELECT USING (
  public.is_active_crew_member(crew_id)
);
