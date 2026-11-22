import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'
import { buildUniqueSlug, validateRow, LIMITS, type CrewImportRow } from '@/lib/crews/import'

export const runtime = 'nodejs'

type Incoming = {
  row: CrewImportRow
  lat?: number | null
  lng?: number | null
  pin_precision?: 'area' | 'city'
}

/** Italia con margine: scarta posizioni assurde (un errore di geocoding non deve spedire un pin in mare). */
const inItaly = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' &&
  lat >= 35 && lat <= 48 && lng >= 6 && lng <= 19

/**
 * Salva le schede informative confermate dopo la revisione (docs/MAPPA-CREW.md §9.1).
 * Ogni riga viene RICONTROLLATA qui: il client non è mai fidato. Le schede nascono senza proprietario
 * (visibility 'directory', trust 'unclaimed', source 'editoriale') e vanno online subito, oppure in
 * attesa con `publish: false`. Livello base (AAL1). Le scritture usano il service-role.
 */
export async function POST(request: Request) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const body = (await request.json().catch(() => null)) as { rows?: Incoming[]; publish?: boolean } | null
    const incoming = body?.rows
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'Nessuna crew da salvare' }, { status: 400 })
    }
    if (incoming.length > LIMITS.rows) {
      return NextResponse.json({ error: `Al massimo ${LIMITS.rows} crew per volta` }, { status: 400 })
    }
    const publish = body?.publish !== false

    const svc = createServiceRoleClient()

    // Slug già in uso (anche delle schede nascoste): un'unica lettura, poi si tiene l'insieme aggiornato
    const { data: existing, error: exErr } = await svc.from('crews').select('slug')
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
    const taken = new Set((existing ?? []).map(r => r.slug).filter(Boolean) as string[])

    const rejected: { index: number; name: string; errors: string[] }[] = []
    const toInsert: Record<string, unknown>[] = []
    const emails: (string | null)[] = []
    const origin: number[] = []

    incoming.forEach((item, index) => {
      const r = item?.row
      // Si ricontrolla come se arrivasse da un CSV
      const check = validateRow({
        name: r?.name, city: r?.city, zone: r?.zone ?? '', crew_type: r?.crew_type,
        meeting_point: r?.meeting_point ?? '', schedule_text: r?.schedule_text ?? '',
        website_url: r?.website_url ?? '', instagram_url: r?.instagram_url ?? '',
        description: r?.description ?? '', contact_email: r?.contact_email ?? '', avatar_url: r?.avatar_url ?? '',
      })
      if (!check.row) {
        rejected.push({ index, name: String(r?.name ?? ''), errors: check.errors })
        return
      }
      const c = check.row
      const hasPoint = inItaly(item.lat, item.lng)
      // Precisione scelta dal server: con un ritrovo "area" (~1 km), altrimenti "città". MAI "exact" per un import.
      const precision = c.meeting_point && item.pin_precision !== 'city' ? 'area' : 'city'

      toInsert.push({
        name: c.name,
        slug: buildUniqueSlug(c.name, c.city, taken),
        description: c.description,
        crew_type: c.crew_type,
        avatar_url: c.avatar_url,
        visibility: 'directory',
        owner_id: null,
        trust_level: 'unclaimed',
        moderation_status: publish ? 'published' : 'pending',
        source: 'editoriale',
        created_by: guard.user.id,
        city: c.city,
        zone: c.zone,
        meeting_point: c.meeting_point,
        schedule_text: c.schedule_text,
        website_url: c.website_url,
        instagram_url: c.instagram_url,
        pin_precision: precision,
        lat: hasPoint ? item.lat : null,
        lng: hasPoint ? item.lng : null,
        show_on_map: hasPoint,
      })
      emails.push(c.contact_email)
      origin.push(index)
    })

    if (toInsert.length === 0) {
      return NextResponse.json({ error: 'Nessuna riga valida da salvare', rejected }, { status: 400 })
    }

    const { data: created, error: insErr } = await svc.from('crews').insert(toInsert).select('id, slug, name')
    if (insErr) {
      console.error('[crew/importa/salva] insert:', insErr.message)
      return NextResponse.json({ error: insErr.message, rejected }, { status: 500 })
    }

    // Email di contatto: tabella privata (nessuna policy: solo service-role)
    const contacts = (created ?? []).flatMap((c, i) =>
      emails[i] ? [{ crew_id: c.id, email: emails[i] as string, origin: 'pubblica' as const }] : [])
    if (contacts.length > 0) {
      const { error: cErr } = await svc.from('crew_contacts').insert(contacts)
      if (cErr) console.error('[crew/importa/salva] crew_contacts:', cErr.message)
    }

    await logAdminAction(svc, {
      admin_id: guard.user.id,
      action_type: toInsert.length === 1 ? 'crew.create' : 'crew.import',
      entity_table: 'crews',
      entity_id: toInsert.length === 1 ? (created?.[0]?.id ?? null) : null,
      metadata: { count: created?.length ?? 0, published: publish, ids: (created ?? []).map(c => c.id).slice(0, 200) },
    })

    return NextResponse.json({ created: created ?? [], rejected })
  } catch (e) {
    console.error('[crew/importa/salva] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
