import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { generateRecoveryCodes } from '@/lib/admin/recovery'
import { logAdminAction } from '@/lib/admin/audit'

/**
 * Genera (rigenera) i codici di recupero MFA per l'admin corrente.
 * Richiede sessione AAL2 (l'admin ha appena verificato il TOTP nel setup).
 * Restituisce i codici IN CHIARO una sola volta; in DB salva solo gli hash.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') {
    return NextResponse.json({ error: 'Sessione non elevata (2FA richiesto)' }, { status: 403 })
  }

  const { codes, hashes } = generateRecoveryCodes()
  const admin = createServiceRoleClient()

  // Invalida i codici precedenti e inserisce i nuovi
  await admin.from('admin_recovery_codes').delete().eq('user_id', user.id)
  const { error } = await admin.from('admin_recovery_codes')
    .insert(hashes.map(code_hash => ({ user_id: user.id, code_hash })))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, {
    admin_id: user.id, action_type: 'mfa.recovery_codes_generated',
    entity_table: 'admin_recovery_codes', entity_id: user.id,
  })

  return NextResponse.json({ codes })
}
