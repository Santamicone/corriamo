-- ============================================================
-- CREW FEATURE
-- Eseguire dopo: reliability.sql (#18)
-- ============================================================

-- 1. Tabella crews
CREATE TABLE public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crew_type text NOT NULL CHECK (crew_type IN ('training_group', 'running_club', 'friends')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  whatsapp_group_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabella crew_members
CREATE TABLE public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(crew_id, user_id)
);

-- 3. Colonne su runs
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS run_visibility text NOT NULL DEFAULT 'public'
    CHECK (run_visibility IN ('public', 'crew_only', 'invite_only'));

-- 4. Indici
CREATE INDEX idx_crew_members_crew_id ON public.crew_members(crew_id);
CREATE INDEX idx_crew_members_user_id ON public.crew_members(user_id);
CREATE INDEX idx_runs_crew_id ON public.runs(crew_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- crews: lettura
-- Le crew pubbliche sono visibili a tutti; le private solo ai membri
CREATE POLICY "crews_select" ON public.crews FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE crew_id = crews.id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- crews: inserimento — chiunque autenticato può creare una crew
CREATE POLICY "crews_insert" ON public.crews FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);

-- crews: modifica — solo owner
CREATE POLICY "crews_update" ON public.crews FOR UPDATE USING (
  auth.uid() = owner_id
);

-- crews: eliminazione — solo owner
CREATE POLICY "crews_delete" ON public.crews FOR DELETE USING (
  auth.uid() = owner_id
);

-- crew_members: lettura — visibile ai membri attivi della stessa crew e all'owner
CREATE POLICY "crew_members_select" ON public.crew_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crews
    WHERE id = crew_members.crew_id
      AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.crew_members cm2
    WHERE cm2.crew_id = crew_members.crew_id
      AND cm2.user_id = auth.uid()
      AND cm2.status = 'active'
  )
);

-- crew_members: un utente può inserire solo se stesso (richiesta ingresso)
CREATE POLICY "crew_members_insert_self" ON public.crew_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- crew_members: owner e admin possono inserire altri membri
CREATE POLICY "crew_members_insert_admin" ON public.crew_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crew_members cm
    WHERE cm.crew_id = crew_members.crew_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.status = 'active'
  )
);

-- crew_members: owner e admin possono aggiornare status/role
CREATE POLICY "crew_members_update" ON public.crew_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.crew_members cm
    WHERE cm.crew_id = crew_members.crew_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
      AND cm.status = 'active'
  )
  OR user_id = auth.uid() -- un membro può abbandonare (delete)
);

-- crew_members: owner rimuove membri; membri si auto-rimuovono
CREATE POLICY "crew_members_delete" ON public.crew_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crews
    WHERE id = crew_members.crew_id
      AND owner_id = auth.uid()
  )
);

-- ============================================================
-- TRIGGER: auto-inserisci owner come membro al momento della creazione
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_crew_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.crew_members (crew_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_crew_owner
AFTER INSERT ON public.crews
FOR EACH ROW EXECUTE FUNCTION public.add_crew_owner_as_member();

-- ============================================================
-- TRIGGER: notifica owner/admin quando arriva una richiesta di ingresso
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_crew_join_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec record;
  crew_name text;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT name INTO crew_name FROM public.crews WHERE id = NEW.crew_id;

    FOR rec IN
      SELECT user_id FROM public.crew_members
      WHERE crew_id = NEW.crew_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
      VALUES (
        rec.user_id,
        'crew_join_request',
        'Nuova richiesta per ' || crew_name,
        (SELECT full_name FROM public.profiles WHERE id = NEW.user_id) || ' vuole entrare nella crew.',
        NULL,
        NEW.user_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_crew_join_request
AFTER INSERT ON public.crew_members
FOR EACH ROW EXECUTE FUNCTION public.notify_crew_join_request();

-- ============================================================
-- TRIGGER: notifica utente quando la richiesta viene approvata/rifiutata
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_crew_request_outcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  crew_name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('active', 'rejected') THEN
    SELECT name INTO crew_name FROM public.crews WHERE id = NEW.crew_id;

    IF NEW.status = 'active' THEN
      INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
      VALUES (
        NEW.user_id,
        'crew_request_approved',
        'Sei entrato in ' || crew_name,
        'La tua richiesta di ingresso è stata approvata.',
        NULL,
        NULL
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
      VALUES (
        NEW.user_id,
        'crew_request_rejected',
        'Richiesta non accettata',
        'La tua richiesta di ingresso a ' || crew_name || ' non è stata accettata.',
        NULL,
        NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_crew_request_outcome
AFTER UPDATE ON public.crew_members
FOR EACH ROW EXECUTE FUNCTION public.notify_crew_request_outcome();

-- ============================================================
-- TRIGGER: notifica tutti i membri quando viene creata una corsa crew_only
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_crew_new_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec record;
BEGIN
  IF NEW.run_visibility = 'crew_only' AND NEW.crew_id IS NOT NULL THEN
    FOR rec IN
      SELECT user_id FROM public.crew_members
      WHERE crew_id = NEW.crew_id
        AND status = 'active'
        AND user_id != NEW.organizer_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
      VALUES (
        rec.user_id,
        'crew_new_run',
        'Nuova corsa della crew',
        NEW.title || ' — ' || to_char(NEW.date, 'DD Mon') || ' ore ' || NEW.time::text,
        NEW.id,
        NEW.organizer_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_crew_new_run
AFTER INSERT ON public.runs
FOR EACH ROW EXECUTE FUNCTION public.notify_crew_new_run();

-- ============================================================
-- Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
