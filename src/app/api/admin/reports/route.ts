import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const

/** Aggiorna lo stato di una segnalazione. Admin AAL2. */
export async function POST(request: Request) {
  const guard = await guardAdminApi()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { user: admin } = guard

  const { id, status, note } = await request.json().catch(() => ({}))
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'dismissed') {
    patch.resolved_by = admin.id
    patch.resolution_note = note?.trim() || null
  }
  const { error } = await svc.from('reports').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await svc.from('admin_actions').insert({
    admin_id: admin.id, action_type: `report.${status}`, entity_table: 'reports', entity_id: String(id),
  })

  return NextResponse.json({ ok: true })
}
