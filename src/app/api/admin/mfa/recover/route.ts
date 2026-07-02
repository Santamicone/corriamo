import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { hashRecoveryCode } from '@/lib/admin/recovery'

/**
 * Consuma un codice di recupero quando l'admin ha perso il dispositivo TOTP.
 * Caller: admin loggato in sessione AAL1 (non può superare il 2FA).
 * Se il codice è valido → rimuove i fattori TOTP dell'utente (service-role),
 * marca il codice come usato e traccia in admin_actions. L'admin poi ri-configura
 * il 2FA da /admin/mfa/setup.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { code } = await request.json().catch(() => ({ code: '' }))
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const code_hash = hashRecoveryCode(code)

  const { data: row } = await admin.from('admin_recovery_codes')
    .select('id').eq('user_id', user.id).eq('code_hash', code_hash)
    .is('used_at', null).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Codice non valido o già usato' }, { status: 400 })

  // Rimuove tutti i fattori MFA dell'utente
  const { data: userData } = await admin.auth.admin.getUserById(user.id)
  const factors = userData?.user?.factors ?? []
  for (const f of factors) {
    await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id })
  }

  await admin.from('admin_recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id)
  // Audit via service-role: la sessione è AAL1, la policy admin_actions richiede AAL2.
  await admin.from('admin_actions').insert({
    admin_id: user.id, action_type: 'mfa.recovery_used',
    entity_table: 'profiles', entity_id: user.id,
    metadata: { removed_factors: factors.length },
  })

  return NextResponse.json({ ok: true })
}
