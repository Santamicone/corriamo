import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Ok = { ok: true; user: User; supabase: SupabaseClient }
type Err = { ok: false; error: string; status: number }

/**
 * Guardia per le API route admin. Verifica: loggato + is_admin + sessione AAL2.
 * `requireAal2=false` per le operazioni ammesse in AAL1 (es. recupero MFA).
 */
export async function guardAdminApi(requireAal2 = true): Promise<Ok | Err> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato', status: 401 }

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { ok: false, error: 'Non autorizzato', status: 403 }

  if (requireAal2) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') return { ok: false, error: 'Sessione non elevata (2FA richiesto)', status: 403 }
  }

  return { ok: true, user, supabase }
}
