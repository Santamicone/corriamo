import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildUnsubscribeUrl } from '@/lib/email/token'
import { emailSchedaRitmi } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/send'
import { computePaceZones, type Experience } from '@/lib/running/paceZones'
import { formatTime, formatPace, formatPaceRange } from '@/lib/running/time'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vieniacorrere.it'

const RACE_LABELS: Record<number, string> = {
  5000: '5K',
  10000: '10K',
  21097.5: 'Mezza maratona',
  42195: 'Maratona',
}

const VALID_EXPERIENCE: Experience[] = ['principiante', 'intermedio', 'avanzato']

/**
 * POST /api/tools/scheda-ritmi
 * Invia all'utente loggato la sua scheda zone di passo via email.
 * Ricalcola i ritmi lato server: non si fida dei valori del client.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Devi accedere per ricevere la scheda.' }, { status: 401 })
  }

  let body: { raceMeters?: number; raceTimeSec?: number; experience?: string; daysPerWeek?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const raceMeters = Number(body.raceMeters)
  const raceTimeSec = Number(body.raceTimeSec)
  const daysPerWeek = Number(body.daysPerWeek)
  const experience = body.experience as Experience

  if (
    !RACE_LABELS[raceMeters] ||
    !Number.isFinite(raceTimeSec) || raceTimeSec <= 0 || raceTimeSec > 86400 ||
    !VALID_EXPERIENCE.includes(experience) ||
    !Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7
  ) {
    return NextResponse.json({ error: 'Dati della gara non validi.' }, { status: 400 })
  }

  // Email dell'utente
  const toEmail = user.email
  if (!toEmail) {
    return NextResponse.json({ error: 'Nessuna email associata al tuo account.' }, { status: 400 })
  }

  // Nome dal profilo (fallback gentile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const recipientName = profile?.full_name?.split(' ')[0] || 'runner'

  // Ricalcolo lato server
  const result = computePaceZones({ raceMeters, raceTimeSec, experience, daysPerWeek })

  const zones = result.zones.map(z => ({
    label: z.label,
    hint: z.hint,
    range: formatPaceRange(z.loPace, z.hiPace),
  }))
  const racePaces = result.racePaces.map(r => ({
    label: r.label,
    time: formatTime(r.timeSec),
    pace: formatPace(r.paceSecPerKm),
  }))

  try {
    const unsubscribeUrl = await buildUnsubscribeUrl(user.id, SITE_URL)
    const { subject, html } = emailSchedaRitmi({
      recipientName,
      raceLabel: RACE_LABELS[raceMeters],
      raceTime: formatTime(raceTimeSec),
      zones,
      racePaces,
      unsubscribeUrl,
    })
    await sendEmail(toEmail, subject, html)
  } catch (err) {
    console.error('[scheda-ritmi]', err)
    return NextResponse.json({ error: 'Invio non riuscito, riprova più tardi.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sentTo: toEmail })
}
