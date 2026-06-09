-- ============================================================================
-- MIGRAZIONE CONSOLIDATA — file in sospeso #18–#23
-- ============================================================================
-- Combina, in ordine di dipendenza e in forma IDEMPOTENTE, i file:
--   18. reliability.sql
--   22. edit-run.sql
--   19. crews.sql        (con le RLS già nella versione corretta, #21)
--   21. crews-fix-rls.sql (funzioni helper + policy non ricorsive)
--   20. crew-invites.sql
--   23. email-notifications.sql  (solo schema, nessun segreto)
--
-- NON incluso: email-triggers.sql (#24) — richiede la service_role key e le
--   Edge Functions deployate. Va eseguito separatamente come ULTIMO step.
--
-- SICUREZZA:
--   • Tutto è racchiuso in una transazione: o passa tutto, o rollback.
--   • Ogni statement è idempotente: si può rieseguire senza errori, anche
--     se la produzione è in uno stato parzialmente applicato.
--   • Nessuna operazione distruttiva sui dati esistenti (solo ADD/CREATE
--     IF NOT EXISTS e DROP POLICY/TRIGGER IF EXISTS prima del CREATE).
--
-- USO: Supabase Dashboard → SQL Editor → incolla → Run.
--      Poi eseguire verify-pending.sql per confermare l'esito.
-- ============================================================================

BEGIN;

-- ============================================================================
-- #18 — RELIABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.run_confirmations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed   boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, user_id)
);

ALTER TABLE public.run_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read confirmations"     ON public.run_confirmations;
DROP POLICY IF EXISTS "User insert own confirmation"  ON public.run_confirmations;
DROP POLICY IF EXISTS "User update own confirmation"  ON public.run_confirmations;

CREATE POLICY "Public read confirmations"
  ON public.run_confirmations FOR SELECT USING (true);
CREATE POLICY "User insert own confirmation"
  ON public.run_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User update own confirmation"
  ON public.run_confirmations FOR UPDATE USING (auth.uid() = user_id);

-- Realtime — guardato per evitare errore se già membro della publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'run_confirmations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.run_confirmations;
  END IF;
END$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reliability_score     numeric(5,2),
  ADD COLUMN IF NOT EXISTS reliability_eligible  numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reliability_confirmed numeric(5,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_reliability_score(organizer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r               RECORD;
  total_eligible  numeric := 0;
  total_confirmed numeric := 0;
  weight          numeric;
  is_confirmed    boolean;
  run_datetime    timestamptz;
BEGIN
  FOR r IN
    SELECT
      ru.id,
      ru.date,
      ru.time,
      COALESCE((ru.is_spot)::boolean, false) AS is_spot,
      EXISTS(
        SELECT 1 FROM public.check_ins ci
        WHERE ci.run_id = ru.id AND ci.user_id = organizer_id
      ) AS has_checkin,
      EXISTS(
        SELECT 1 FROM public.reviews rv
        WHERE rv.run_id = ru.id AND rv.reviewed_id = organizer_id
      ) AS has_review,
      COALESCE((
        SELECT
          SUM(CASE WHEN rc.confirmed THEN 1.0 ELSE 0 END) /
          NULLIF(COUNT(*), 0) >= 0.5
        FROM public.run_confirmations rc
        WHERE rc.run_id = ru.id
      ), false) AS has_confirmations,
      EXISTS(
        SELECT 1 FROM public.participations p
        WHERE p.run_id = ru.id AND p.status = 'approvata'
      ) AS has_participants
    FROM public.runs ru
    WHERE ru.organizer_id = organizer_id
      AND ru.status != 'annullata'
  LOOP
    run_datetime := (r.date::text || ' ' || r.time::text || '+00')::timestamptz
      AT TIME ZONE 'Europe/Rome';

    CONTINUE WHEN NOT (
      r.has_participants AND
      run_datetime < now() - interval '24 hours'
    );

    weight       := CASE WHEN r.is_spot THEN 0.5 ELSE 1.0 END;
    is_confirmed := r.has_checkin OR r.has_review OR r.has_confirmations;

    total_eligible  := total_eligible  + weight;
    total_confirmed := total_confirmed + CASE WHEN is_confirmed THEN weight ELSE 0 END;
  END LOOP;

  UPDATE public.profiles SET
    reliability_eligible  = total_eligible,
    reliability_confirmed = total_confirmed,
    reliability_score     = CASE
      WHEN total_eligible >= 3
      THEN ROUND((total_confirmed / total_eligible * 100)::numeric, 2)
      ELSE NULL
    END
  WHERE id = organizer_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_reliability_from_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organizer_id INTO org_id
  FROM public.runs
  WHERE id = COALESCE(NEW.run_id, OLD.run_id);

  IF org_id IS NOT NULL THEN
    PERFORM update_reliability_score(org_id);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_reliability_from_run_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM update_reliability_score(NEW.organizer_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reliability_checkin       ON public.check_ins;
DROP TRIGGER IF EXISTS trg_reliability_review        ON public.reviews;
DROP TRIGGER IF EXISTS trg_reliability_confirmation  ON public.run_confirmations;
DROP TRIGGER IF EXISTS trg_reliability_run_status    ON public.runs;

CREATE TRIGGER trg_reliability_checkin
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();
CREATE TRIGGER trg_reliability_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();
CREATE TRIGGER trg_reliability_confirmation
  AFTER INSERT OR UPDATE ON public.run_confirmations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run();
CREATE TRIGGER trg_reliability_run_status
  AFTER UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reliability_from_run_status();

-- ============================================================================
-- #22 — EDIT RUN (updated_at)
-- ============================================================================

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION set_runs_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_runs_updated_at ON public.runs;
CREATE TRIGGER trg_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION set_runs_updated_at();

-- ============================================================================
-- #19 + #21 — CREWS (tabelle, colonne, indici, RLS già nella versione corretta)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crews (
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

CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(crew_id, user_id)
);

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS run_visibility text NOT NULL DEFAULT 'public'
    CHECK (run_visibility IN ('public', 'crew_only', 'invite_only'));

CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON public.crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_crew_id         ON public.runs(crew_id);

ALTER TABLE public.crews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Funzioni helper SECURITY DEFINER (rompono la ricorsione RLS) — definite PRIMA
-- delle policy che le usano.
CREATE OR REPLACE FUNCTION public.is_active_crew_member(p_crew_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = p_crew_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

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

-- Policy crews
DROP POLICY IF EXISTS "crews_select" ON public.crews;
DROP POLICY IF EXISTS "crews_insert" ON public.crews;
DROP POLICY IF EXISTS "crews_update" ON public.crews;
DROP POLICY IF EXISTS "crews_delete" ON public.crews;

CREATE POLICY "crews_select" ON public.crews FOR SELECT USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR public.is_active_crew_member(id)
);
CREATE POLICY "crews_insert" ON public.crews FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
CREATE POLICY "crews_update" ON public.crews FOR UPDATE USING (
  auth.uid() = owner_id
);
CREATE POLICY "crews_delete" ON public.crews FOR DELETE USING (
  auth.uid() = owner_id
);

-- Policy crew_members (versioni non ricorsive)
DROP POLICY IF EXISTS "crew_members_select"        ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_insert_self"   ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_insert_admin"  ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_update"        ON public.crew_members;
DROP POLICY IF EXISTS "crew_members_delete"        ON public.crew_members;

CREATE POLICY "crew_members_select" ON public.crew_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_crew_admin(crew_id)
  OR public.is_active_crew_member(crew_id)
);
CREATE POLICY "crew_members_insert_self" ON public.crew_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "crew_members_insert_admin" ON public.crew_members FOR INSERT WITH CHECK (
  public.is_crew_admin(crew_id)
);
CREATE POLICY "crew_members_update" ON public.crew_members FOR UPDATE USING (
  public.is_crew_admin(crew_id)
  OR user_id = auth.uid()
);
CREATE POLICY "crew_members_delete" ON public.crew_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crews
    WHERE id = crew_members.crew_id
      AND owner_id = auth.uid()
  )
);

-- Trigger crews
CREATE OR REPLACE FUNCTION public.add_crew_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.crew_members (crew_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$;

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
        NEW.user_id, 'crew_request_approved',
        'Sei entrato in ' || crew_name,
        'La tua richiesta di ingresso è stata approvata.', NULL, NULL
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, run_id, actor_id)
      VALUES (
        NEW.user_id, 'crew_request_rejected',
        'Richiesta non accettata',
        'La tua richiesta di ingresso a ' || crew_name || ' non è stata accettata.', NULL, NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
        rec.user_id, 'crew_new_run', 'Nuova corsa della crew',
        NEW.title || ' — ' || to_char(NEW.date, 'DD Mon') || ' ore ' || NEW.time::text,
        NEW.id, NEW.organizer_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_crew_owner             ON public.crews;
DROP TRIGGER IF EXISTS trg_notify_crew_join_request   ON public.crew_members;
DROP TRIGGER IF EXISTS trg_notify_crew_request_outcome ON public.crew_members;
DROP TRIGGER IF EXISTS trg_notify_crew_new_run        ON public.runs;

CREATE TRIGGER trg_add_crew_owner
  AFTER INSERT ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.add_crew_owner_as_member();
CREATE TRIGGER trg_notify_crew_join_request
  AFTER INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_crew_join_request();
CREATE TRIGGER trg_notify_crew_request_outcome
  AFTER UPDATE ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_crew_request_outcome();
CREATE TRIGGER trg_notify_crew_new_run
  AFTER INSERT ON public.runs
  FOR EACH ROW EXECUTE FUNCTION public.notify_crew_new_run();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crew_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
  END IF;
END$$;

-- ============================================================================
-- #20 — CREW INVITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crew_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  max_uses int,
  use_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_invites_token   ON public.crew_invites(token);
CREATE INDEX IF NOT EXISTS idx_crew_invites_crew_id ON public.crew_invites(crew_id);

ALTER TABLE public.crew_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew_invites_select" ON public.crew_invites;
DROP POLICY IF EXISTS "crew_invites_insert" ON public.crew_invites;
DROP POLICY IF EXISTS "crew_invites_delete" ON public.crew_invites;

CREATE POLICY "crew_invites_select" ON public.crew_invites FOR SELECT USING (
  public.is_crew_admin(crew_id)
);
CREATE POLICY "crew_invites_insert" ON public.crew_invites FOR INSERT WITH CHECK (
  public.is_crew_admin(crew_id)
);
CREATE POLICY "crew_invites_delete" ON public.crew_invites FOR DELETE USING (
  invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crews
    WHERE id = crew_invites.crew_id AND owner_id = auth.uid()
  )
);

-- ============================================================================
-- #23 — EMAIL NOTIFICATIONS (solo schema — nessun segreto)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS notifications_email_pending_idx
  ON public.notifications(user_id, created_at)
  WHERE NOT email_sent AND NOT read;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_prefs  jsonb NOT NULL DEFAULT '{
    "immediate": true,
    "digest":    true,
    "reminders": true
  }'::jsonb;

COMMIT;

-- ============================================================================
-- FATTO. Esegui ora verify-pending.sql per confermare.
-- Lo step #24 (email-triggers.sql) va eseguito SEPARATAMENTE dopo aver
-- deployato le Edge Functions e impostato la service_role key.
-- ============================================================================
