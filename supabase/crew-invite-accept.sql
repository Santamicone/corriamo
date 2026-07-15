-- ============================================================================
-- Fix accettazione inviti crew
-- ============================================================================
-- Problema: la policy RLS `crew_invites_select` consente la lettura solo agli
-- admin della crew (`is_crew_admin`). Ma chi riceve un link di invito NON è
-- ancora membro (spesso è anonimo o loggato ma esterno): la sua query sul token
-- non restituisce righe → la pagina invito lo interpreta come "link esaurito".
-- L'intero flusso di invito era quindi rotto per i destinatari.
--
-- Non possiamo aprire la SELECT a `USING (true)`: esporrebbe TUTTI i token,
-- permettendo a chiunque di entrare in qualsiasi crew. Usiamo invece due
-- funzioni SECURITY DEFINER che lavorano solo su un token specifico.
--
-- Applicare a mano su Supabase (vedi workflow migrazioni del progetto).
-- ============================================================================

-- 1) Lettura di un invito per token (bypassa RLS in modo controllato).
--    Restituisce i dati della crew + i flag di validità. Nessun token viene
--    mai esposto: si accede solo conoscendo già il token.
CREATE OR REPLACE FUNCTION public.get_crew_invite(p_token uuid)
RETURNS TABLE (
  crew_id      uuid,
  crew_name    text,
  crew_type    text,
  crew_slug    text,
  is_expired   boolean,
  is_exhausted boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.crew_type,
    c.slug,
    (i.expires_at IS NOT NULL AND i.expires_at < now())                AS is_expired,
    (i.max_uses  IS NOT NULL AND i.use_count >= i.max_uses)            AS is_exhausted
  FROM public.crew_invites i
  JOIN public.crews c ON c.id = i.crew_id
  WHERE i.token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.get_crew_invite(uuid) TO anon, authenticated;

-- 2) Accettazione dell'invito da parte dell'utente loggato. Atomica: valida il
--    token, inserisce (o riattiva) la membership come membro attivo — il link
--    bypassa l'approvazione — e incrementa use_count. Ritorna lo stato esito.
CREATE OR REPLACE FUNCTION public.accept_crew_invite(p_token uuid)
RETURNS TABLE (crew_id uuid, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite   public.crew_invites%ROWTYPE;
  v_uid      uuid := auth.uid();
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'not_authenticated'; RETURN;
  END IF;

  SELECT * INTO v_invite FROM public.crew_invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'not_found'; RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT v_invite.crew_id, 'expired'; RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT v_invite.crew_id, 'exhausted'; RETURN;
  END IF;

  SELECT status INTO v_existing FROM public.crew_members
    WHERE crew_id = v_invite.crew_id AND user_id = v_uid;

  IF v_existing = 'active' THEN
    RETURN QUERY SELECT v_invite.crew_id, 'already_member'; RETURN;
  END IF;

  INSERT INTO public.crew_members (crew_id, user_id, role, status)
    VALUES (v_invite.crew_id, v_uid, 'member', 'active')
    ON CONFLICT (crew_id, user_id)
    DO UPDATE SET status = 'active', role = 'member';

  UPDATE public.crew_invites SET use_count = use_count + 1 WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.crew_id, 'joined';
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_crew_invite(uuid) TO authenticated;
