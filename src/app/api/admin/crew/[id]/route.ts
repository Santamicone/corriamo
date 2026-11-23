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
/**
 * Eliminazione DEFINITIVA di una scheda informativa. Non si può annullare: sparisce anche chi aveva
 * chiesto "Avvisami" (crew_interests, in cascata) e un nuovo import potrebbe ricrearla, perché
 * non resta più nulla che la riconosca come doppione. Per toglierla dalla vista senza perderla
 * si usa "Nascondi". Si eliminano solo le schede SENZA gestore: quelle gestite hanno membri,
 * bacheca e chat, e le cura chi le gestisce. Livello base (AAL1), come le altre azioni.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Id non valido' }, { status: 400 })

    const svc = createServiceRoleClient()
    const { data: crew, error: readErr } = await svc
      .from('crews')
      .select('id, name, slug, city, source, trust_level, moderation_status, owner_id')
      .eq('id', id)
      .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!crew) return NextResponse.json({ error: 'Crew non trovata' }, { status: 404 })
    if (crew.owner_id !== null) {
      return NextResponse.json({ error: 'Questa crew ha un gestore: non si elimina da qui (puoi nasconderla)' }, { status: 403 })
    }

    // Il filtro su owner_id rende l'eliminazione sicura anche se nel frattempo qualcuno l'ha rivendicata
    const { data: deleted, error: delErr } = await svc
      .from('crews').delete().eq('id', id).is('owner_id', null).select('id')
    if (delErr) {
      console.error('[admin/crew/[id]] delete:', delErr.message)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Crew non eliminata: è cambiata nel frattempo' }, { status: 409 })
    }

    await logAdminAction(svc, {
      admin_id: guard.user.id,
      action_type: 'crew.delete',
      entity_table: 'crews',
      entity_id: id,
      metadata: {
        name: crew.name, slug: crew.slug, city: crew.city, source: crew.source,
        trust_level: crew.trust_level, moderation_status: crew.moderation_status,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/crew/[id]] errore delete:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}

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
