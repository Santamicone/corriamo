import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  fetchActivity,
  getValidAccessToken,
  isImportableRun,
  toActivityRow,
} from '@/lib/strava/api'
import { autoConfirmAttendance } from '@/lib/strava/attendance'

/**
 * GET /api/strava/webhook
 * Validation challenge richiesta da Strava alla creazione della subscription.
 * Rispondiamo con hub.challenge solo se hub.verify_token combacia.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN && challenge) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete'
  object_type: 'activity' | 'athlete'
  object_id: number
  owner_id: number   // strava_athlete_id
  updates?: Record<string, string>
}

/**
 * POST /api/strava/webhook
 * Riceve gli eventi Strava. Rispondiamo sempre 200 (anche su errore interno)
 * per non innescare i retry di Strava; gli errori vengono loggati.
 */
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent
  try {
    event = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  try {
    const admin = createServiceRoleClient()

    // Deautorizzazione dell'app da parte dell'utente → rimuovi connessione + attività
    if (event.object_type === 'athlete' && event.updates?.authorized === 'false') {
      const { data: conn } = await admin
        .from('strava_connections')
        .select('user_id')
        .eq('strava_athlete_id', event.owner_id)
        .maybeSingle()
      if (conn) {
        await admin.from('strava_activities').delete().eq('user_id', conn.user_id)
        await admin.from('strava_connections').delete().eq('user_id', conn.user_id)
      }
      return NextResponse.json({ ok: true })
    }

    if (event.object_type !== 'activity') return NextResponse.json({ ok: true })

    // Risali all'utente dall'athlete id
    const { data: conn } = await admin
      .from('strava_connections')
      .select('user_id, strava_athlete_id, access_token, refresh_token, expires_at')
      .eq('strava_athlete_id', event.owner_id)
      .maybeSingle()
    if (!conn) return NextResponse.json({ ok: true })

    if (event.aspect_type === 'delete') {
      await admin.from('strava_activities').delete().eq('strava_activity_id', event.object_id)
      return NextResponse.json({ ok: true })
    }

    // create | update → scarica il dettaglio e importa solo se è una corsa
    const accessToken = await getValidAccessToken(conn)
    const detail = await fetchActivity(accessToken, event.object_id)

    if (!isImportableRun(detail)) {
      // Se era stata importata e ora non è più una corsa/è privata: rimuovi
      await admin.from('strava_activities').delete().eq('strava_activity_id', detail.id)
      return NextResponse.json({ ok: true })
    }

    await admin
      .from('strava_activities')
      .upsert(toActivityRow(conn.user_id, detail), { onConflict: 'strava_activity_id' })

    // Auto-conferma presenze: la nuova corsa potrebbe combaciare con una corsa
    // a cui l'utente ha partecipato (best-effort, non blocca la risposta 200)
    try {
      await autoConfirmAttendance(conn.user_id)
    } catch (err) {
      console.error('[strava/webhook] attendance', err)
    }
  } catch (err) {
    console.error('[strava/webhook]', err)
  }

  return NextResponse.json({ ok: true })
}
