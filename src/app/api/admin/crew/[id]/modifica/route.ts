import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'
import { validateRow, type CrewImportRow } from '@/lib/crews/import'

export const runtime = 'nodejs'

type Body = {
  row?: CrewImportRow
  lat?: number | null
  lng?: number | null
  show_on_map?: boolean
  /** Aggiorna "Dati controllati il ..." a oggi */
  mark_checked?: boolean
}

/** Italia con margine: scarta posizioni assurde (un errore di geocoding non deve spedire un pin in mare). */
const inItaly = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' &&
  lat >= 35 && lat <= 48 && lng >= 6 && lng <= 19

const EDITABLE = [
  'name', 'city', 'zone', 'crew_type', 'meeting_point', 'schedule_text',
  'website_url', 'instagram_url', 'description', 'avatar_url',
  'lat', 'lng', 'pin_precision', 'show_on_map',
] as const

/**
 * Modifica di una scheda informativa da parte dell'admin (docs/MAPPA-CREW.md §9).
 * I dati si RICONTROLLANO qui con le stesse regole dell'import (il client non è mai fidato).
 * Si modificano solo le schede senza proprietario: quelle gestite le cura il loro gestore.
 * Mai toccati: slug (gli indirizzi restano stabili) e i campi di fiducia (stato, origine, proprietario).
 * Livello base (AAL1); la scrittura usa il service-role.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Id non valido' }, { status: 400 })

    const body = (await request.json().catch(() => null)) as Body | null
    const r = body?.row
    if (!r || typeof r !== 'object') return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const check = validateRow({
      name: r.name, city: r.city, zone: r.zone ?? '', crew_type: r.crew_type,
      meeting_point: r.meeting_point ?? '', schedule_text: r.schedule_text ?? '',
      website_url: r.website_url ?? '', instagram_url: r.instagram_url ?? '',
      description: r.description ?? '', contact_email: r.contact_email ?? '', avatar_url: r.avatar_url ?? '',
    })
    if (!check.row) return NextResponse.json({ error: check.errors.join('; ') }, { status: 400 })
    const c = check.row

    const hasPoint = inItaly(body?.lat, body?.lng)
    if (body?.show_on_map && !hasPoint) {
      return NextResponse.json({ error: 'Per mostrare la crew sulla mappa serve una posizione valida' }, { status: 400 })
    }

    const svc = createServiceRoleClient()

    const { data: before, error: readErr } = await svc
      .from('crews')
      .select('id, owner_id, ' + EDITABLE.join(', '))
      .eq('id', id)
      .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!before) return NextResponse.json({ error: 'Crew non trovata' }, { status: 404 })
    const current = before as unknown as Record<string, unknown> & { owner_id: string | null }
    if (current.owner_id !== null) {
      return NextResponse.json({ error: 'Questa crew ha un gestore: la modifica spetta a lui' }, { status: 403 })
    }

    // Con un ritrovo il pin è "zona" (~1 km), altrimenti "città". MAI "exact" da qui.
    const patch: Record<string, unknown> = {
      name: c.name,
      city: c.city,
      zone: c.zone,
      crew_type: c.crew_type,
      meeting_point: c.meeting_point,
      schedule_text: c.schedule_text,
      website_url: c.website_url,
      instagram_url: c.instagram_url,
      description: c.description,
      avatar_url: c.avatar_url,
      pin_precision: c.meeting_point ? 'area' : 'city',
      lat: hasPoint ? body?.lat : null,
      lng: hasPoint ? body?.lng : null,
      show_on_map: hasPoint && body?.show_on_map === true,
    }
    if (body?.mark_checked) patch.last_confirmed_at = new Date().toISOString()

    const { error: updErr } = await svc.from('crews').update(patch).eq('id', id)
    if (updErr) {
      console.error('[admin/crew/modifica] update:', updErr.message)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Email di contatto (tabella privata). Quella "dichiarata" da chi rivendica non si tocca da qui.
    let emailChanged = false
    const { data: contact } = await svc.from('crew_contacts').select('email, origin').eq('crew_id', id).maybeSingle()
    if (!contact || contact.origin === 'pubblica') {
      const prev = contact?.email ?? null
      if (c.contact_email !== prev) {
        const { error: cErr } = c.contact_email
          ? await svc.from('crew_contacts').upsert({ crew_id: id, email: c.contact_email, origin: 'pubblica' })
          : await svc.from('crew_contacts').delete().eq('crew_id', id)
        if (cErr) console.error('[admin/crew/modifica] crew_contacts:', cErr.message)
        else emailChanged = true
      }
    }

    // Cosa è cambiato davvero (i valori precedenti restano nel registro, l'email solo come "cambiata")
    // (lat e lng si confrontano a 2 decimali: il database le arrotonda prima di scriverle)
    const norm = (k: string, v: unknown) => (v == null ? null : (k === 'lat' || k === 'lng') ? Math.round(Number(v) * 100) / 100 : v)
    const changed = EDITABLE.filter(k => norm(k, patch[k]) !== norm(k, current[k]))
    await logAdminAction(svc, {
      admin_id: guard.user.id,
      action_type: 'crew.update',
      entity_table: 'crews',
      entity_id: id,
      metadata: {
        name: c.name,
        changed,
        before: Object.fromEntries(changed.map(k => [k, current[k] ?? null])),
        ...(emailChanged ? { contact_email_changed: true } : {}),
        ...(body?.mark_checked ? { marked_checked: true } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/crew/modifica] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
