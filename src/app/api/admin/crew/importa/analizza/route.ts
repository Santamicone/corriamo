import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { parseCrewTable, type AnalyzedRow } from '@/lib/crews/import'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Analisi di un CSV o di una tabella incollata: controlla le righe e cerca i doppioni.
 * NON scrive nulla e NON cerca le posizioni (lo fa /geocodifica a blocchi): l'inserimento
 * avviene solo in /salva, dopo la revisione dell'admin.
 * Livello base (AAL1), come l'import del calendario gare.
 */
export async function POST(request: Request) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const body = (await request.json().catch(() => null)) as { text?: string } | null
    const text = body?.text
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Incolla un CSV o una tabella da analizzare.' }, { status: 400 })
    }
    if (text.length > 400_000) {
      return NextResponse.json({ error: 'Il testo è troppo grande.' }, { status: 413 })
    }

    const parsed = parseCrewTable(text)
    if (parsed.fatal) {
      return NextResponse.json({ error: parsed.fatal, headers: parsed.headers }, { status: 400 })
    }

    const svc = createServiceRoleClient()
    const rows: AnalyzedRow[] = []
    let dedupAvailable = true

    for (const r of parsed.rows) {
      let duplicates: AnalyzedRow['duplicates'] = []
      if (r.row && dedupAvailable) {
        const { data, error } = await svc.rpc('find_duplicate_crews', { p_name: r.row.name, p_city: r.row.city })
        if (error) {
          // Funzione assente = SQL #50 non ancora applicato: meglio dirlo chiaramente che importare alla cieca
          console.error('[crew/importa/analizza] find_duplicate_crews:', error.message)
          dedupAvailable = false
        } else {
          duplicates = (data ?? []) as AnalyzedRow['duplicates']
        }
      }
      rows.push({
        line: r.line,
        row: r.row,
        errors: r.errors,
        warnings: r.warnings,
        pin_precision: r.row?.meeting_point ? 'area' : 'city',
        duplicates,
      })
    }

    if (!dedupAvailable) {
      return NextResponse.json(
        { error: 'Il controllo dei doppioni non è disponibile: lo SQL #50 (crew-directory.sql) non risulta applicato.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ rows, unknownHeaders: parsed.headers.unknown })
  } catch (e) {
    console.error('[crew/importa/analizza] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
