-- ============================================================
-- CREW INVITES — link di invito con token
-- Eseguire dopo: crews.sql (#19)
-- ============================================================

CREATE TABLE public.crew_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  max_uses int, -- NULL = illimitato
  use_count int NOT NULL DEFAULT 0,
  expires_at timestamptz, -- NULL = nessuna scadenza
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crew_invites_token ON public.crew_invites(token);
CREATE INDEX idx_crew_invites_crew_id ON public.crew_invites(crew_id);

ALTER TABLE public.crew_invites ENABLE ROW LEVEL SECURITY;

-- Solo owner e admin della crew possono creare/vedere inviti
CREATE POLICY "crew_invites_select" ON public.crew_invites FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE crew_id = crew_invites.crew_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
);

CREATE POLICY "crew_invites_insert" ON public.crew_invites FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE crew_id = crew_invites.crew_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
);

CREATE POLICY "crew_invites_delete" ON public.crew_invites FOR DELETE USING (
  invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crews
    WHERE id = crew_invites.crew_id AND owner_id = auth.uid()
  )
);
