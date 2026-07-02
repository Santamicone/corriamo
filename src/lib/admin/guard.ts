import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export interface AdminContext {
  supabase: SupabaseClient
  user: User
}

/**
 * Verifica base della sezione admin: utente loggato + is_admin.
 * NON verifica l'AAL2 (serve alle pagine MFA stesse). Usata dal layout /admin.
 * - non loggato        → redirect /login
 * - loggato non admin  → notFound() (nasconde l'esistenza della sezione)
 */
export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) notFound()

  return { supabase, user }
}

/**
 * Richiede sessione elevata a AAL2 (2FA superato). Da chiamare in ogni pagina
 * admin "operativa" (dashboard, azioni), NON nelle pagine /admin/mfa/*.
 * - fattore TOTP non ancora configurato → redirect /admin/mfa/setup
 * - fattore presente ma sessione aal1   → redirect /admin/mfa/verifica
 * - sessione aal2                        → prosegue
 */
export async function requireAal2(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) redirect('/admin/mfa/setup')

  const { currentLevel, nextLevel } = data
  if (currentLevel === 'aal2') return
  // nextLevel === 'aal2' → esiste un fattore verificato da sfidare
  if (nextLevel === 'aal2') redirect('/admin/mfa/verifica')
  // nessun fattore verificato → primo enroll
  redirect('/admin/mfa/setup')
}

/** Scorciatoia: contesto admin + AAL2 garantito. Per le pagine operative. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext()
  await requireAal2(ctx.supabase)
  return ctx
}
