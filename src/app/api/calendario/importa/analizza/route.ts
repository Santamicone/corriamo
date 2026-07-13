import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { extractRaces, normalizeToRaceRow, type IngestPayload } from '@/lib/calendario/ingest'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Ingestione fonti grezze → gare candidate + controllo doppioni.
 * Solo admin (is_admin, AAL1). NON scrive nulla: l'inserimento avviene su
 * /api/calendario/importa/salva dopo la revisione umana.
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi(false)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const payload = (await request.json().catch(() => null)) as IngestPayload | null
  if (!payload?.type) return NextResponse.json({ error: 'Payload mancante' }, { status: 400 })

  let candidates
  try {
    candidates = await extractRaces(payload)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const svc = createServiceRoleClient()
  const enriched = []
  for (const c of candidates) {
    const row = normalizeToRaceRow(c)
    const { data: duplicates } = await svc.rpc('find_duplicate_races', {
      p_name: row.name,
      p_event_date: row.event_date,
      p_country: 'IT',
      p_distances: row.distances,
    })
    enriched.push({ ...row, confidence: c.confidence, duplicates: duplicates ?? [] })
  }

  return NextResponse.json({ candidates: enriched })
}
