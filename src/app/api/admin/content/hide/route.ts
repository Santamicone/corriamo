import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const ALLOWED = ['runs', 'series', 'momenti', 'reviews', 'run_chat'] as const
type Table = typeof ALLOWED[number]

/** Nasconde (soft-delete) o ripristina un contenuto. Admin AAL2. */
export async function POST(request: Request) {
  const guard = await guardAdminApi()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { user: admin } = guard

  const { table, id, hide, reason } = await request.json().catch(() => ({}))
  if (!ALLOWED.includes(table) || !id) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }
  const t = table as Table

  const svc = createServiceRoleClient()
  const patch = hide
    ? { hidden_by_admin: true, hidden_reason: reason?.trim() || null, hidden_at: new Date().toISOString(), hidden_by: admin.id }
    : { hidden_by_admin: false, hidden_reason: null, hidden_at: null, hidden_by: null }

  const { error } = await svc.from(t).update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await svc.from('admin_actions').insert({
    admin_id: admin.id, action_type: hide ? 'content.hide' : 'content.restore',
    entity_table: t, entity_id: String(id), reason: reason?.trim() || null,
  })

  return NextResponse.json({ ok: true })
}
