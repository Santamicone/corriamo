import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'

/**
 * Annuncio in-app a un segmento di utenti. Solo notifiche in-app (nessuna email
 * di massa: eviterebbe problemi di deliverability/costi/rate-limit — follow-up).
 * Esclude gli utenti bannati. Admin AAL2.
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { user: admin } = guard

  const { subject, body, segment, city } = await request.json().catch(() => ({}))
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Oggetto e messaggio obbligatori' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  let q = svc.from('profiles').select('id').neq('moderation_status', 'banned')
  if (segment === 'city') {
    if (!city?.trim()) return NextResponse.json({ error: 'Città obbligatoria per questo segmento' }, { status: 400 })
    q = q.ilike('city', city.trim())
  }
  const { data: targets, error: qErr } = await q
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const rows = (targets ?? []).map(t => ({
    user_id: t.id, type: 'annuncio_staff', title: subject.trim(), body: body.trim(),
  }))
  if (rows.length === 0) return NextResponse.json({ error: 'Nessun destinatario per il segmento scelto' }, { status: 400 })

  // Insert a blocchi per non superare i limiti di payload
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svc.from('notifications').insert(rows.slice(i, i + 500))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await svc.from('admin_actions').insert({
    admin_id: admin.id, action_type: 'broadcast.sent', entity_table: 'notifications',
    reason: subject.trim(), metadata: { segment: segment ?? 'all', city: city ?? null, recipients: rows.length },
  })

  return NextResponse.json({ ok: true, recipients: rows.length })
}
