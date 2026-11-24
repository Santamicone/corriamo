import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'

export const runtime = 'nodejs'

/**
 * Ritira una proposta ancora aperta (status → 'ritirata'). Non si cancella: le proposte servono
 * alle metriche (tasso di adozione). Quelle già adottate non si toccano: la corsa è dell'organizzatore.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdminApi(false)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { id } = await params
  const { action } = await request.json().catch(() => ({}))
  if (action !== 'ritira') return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data, error } = await svc
    .from('run_proposals').update({ status: 'ritirata' })
    .eq('id', id).eq('status', 'aperta')
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'La proposta non è più aperta' }, { status: 409 })
  }

  await logAdminAction(svc, {
    admin_id: guard.user.id, action_type: 'proposal.withdraw',
    entity_table: 'run_proposals', entity_id: id,
  })
  return NextResponse.json({ ok: true })
}
