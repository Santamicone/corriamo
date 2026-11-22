import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'

export const runtime = 'nodejs'

const ACTIONS = {
  hide:       { patch: { moderation_status: 'hidden' },    audit: 'crew.hide' },
  show:       { patch: { moderation_status: 'published' }, audit: 'crew.show' },
  deactivate: { patch: { activity_status: 'inactive' },    audit: 'crew.deactivate' },
  activate:   { patch: { activity_status: 'active' },      audit: 'crew.activate' },
} as const

/**
 * Azioni dell'admin su una scheda: nascondi/mostra e segna come non più attiva/attiva.
 * Non si cancella mai (anti-riapparizione, docs/MAPPA-CREW.md §4.6): "nascondi" imposta `hidden`.
 * Livello base (AAL1); le scritture usano il service-role (i campi di fiducia sono protetti da trigger).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Id non valido' }, { status: 400 })

    const body = (await request.json().catch(() => null)) as { action?: keyof typeof ACTIONS; reason?: string } | null
    const action = body?.action && ACTIONS[body.action]
    if (!action) return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })

    const svc = createServiceRoleClient()
    const { data, error } = await svc.from('crews').update(action.patch).eq('id', id).select('id, name').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Crew non trovata' }, { status: 404 })

    await logAdminAction(svc, {
      admin_id: guard.user.id,
      action_type: action.audit,
      entity_table: 'crews',
      entity_id: id,
      reason: body?.reason?.slice(0, 300) ?? null,
      metadata: { name: data.name },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/crew/[id]] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
