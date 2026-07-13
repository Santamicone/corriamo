import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { slugify, type RaceRow } from '@/lib/calendario/ingest'

export const runtime = 'nodejs'

/**
 * Inserisce le gare candidate confermate come pending (source='editoriale',
 * provenienza indistinguibile). Vanno poi pubblicate da /calendario-gare/modera.
 * Solo admin (is_admin, AAL1).
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi(false)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = (await request.json().catch(() => null)) as { candidates?: RaceRow[] } | null
  const candidates = body?.candidates
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'Nessuna gara da salvare' }, { status: 400 })
  }

  const svc = createServiceRoleClient()

  // Slug univoci verso la tabella e dentro il batch
  const { data: existing, error: exErr } = await svc.from('races').select('slug')
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
  const taken = new Set((existing ?? []).map(r => r.slug))

  const rows = candidates.map((c, i) => {
    const base = c.slug || `gara-${slugify(c.name || String(i))}`
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    taken.add(slug)
    return {
      slug,
      name: c.name,
      city: c.city,
      region: c.region,
      country: 'IT',
      event_date: c.event_date,
      distances: c.distances,
      race_type: c.race_type,
      official_url: c.official_url,
      source: 'editoriale',
      status: 'pending',
      created_by: guard.user.id,
    }
  })

  const { error } = await svc.from('races').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: rows.length })
}
