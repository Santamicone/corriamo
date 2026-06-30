import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildUnsubscribeUrl } from '@/lib/email/token'
import { emailPianoNutrizione } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/send'
import {
  computeNutritionPlan,
  buildMenuExamples,
  type NutritionInput,
  type RaceDistance,
  type GelExperience,
  type GastricSensitivity,
  type RaceGoal,
} from '@/lib/running/nutrition'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vieniacorrere.it'

const VALID_DISTANCE: RaceDistance[] = ['5k', '10k', '21k', '42k', 'trail']
const VALID_GEL: GelExperience[] = ['mai', 'qualcuna', 'abituale']
const VALID_GASTRIC: GastricSensitivity[] = ['bassa', 'media', 'alta']
const VALID_GOAL: RaceGoal[] = ['finire', 'pb', 'prima']

/** Numero opzionale entro un range, altrimenti undefined. */
function optNum(v: unknown, min: number, max: number): number | undefined {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return n
}

/**
 * POST /api/tools/piano-gara
 * Invia all'utente loggato il piano alimentazione gara via email, con menù tipo.
 * Ricalcola il piano lato server: non si fida dei valori del client.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Devi accedere per ricevere il piano.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  const distance = body.distance as RaceDistance
  const gelExperience = body.gelExperience as GelExperience
  const gastric = body.gastric as GastricSensitivity
  const goal = body.goal as RaceGoal

  if (
    !VALID_DISTANCE.includes(distance) ||
    !VALID_GEL.includes(gelExperience) ||
    !VALID_GASTRIC.includes(gastric) ||
    !VALID_GOAL.includes(goal)
  ) {
    return NextResponse.json({ error: 'Dati del piano non validi.' }, { status: 400 })
  }

  const startTime =
    typeof body.startTime === 'string' && /^\d{1,2}:\d{2}$/.test(body.startTime.trim())
      ? body.startTime.trim()
      : undefined

  const input: NutritionInput = {
    distance,
    gelExperience,
    gastric,
    goal,
    startTime,
    expectedMinutes: optNum(body.expectedMinutes, 1, 1440),
    weightKg: optNum(body.weightKg, 30, 200),
    temperatureC: optNum(body.temperatureC, -20, 50),
  }

  const toEmail = user.email
  if (!toEmail) {
    return NextResponse.json({ error: 'Nessuna email associata al tuo account.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const recipientName = profile?.full_name?.split(' ')[0] || 'runner'

  // Ricalcolo lato server
  const plan = computeNutritionPlan(input)
  const menus = buildMenuExamples(input)

  const gelSummary = plan.gel
    ? `Porta ${plan.gel.count} gel da ~${plan.gel.carbsPerGel} g di carbo (≈ ${plan.gel.carbsPerHour} g/h), primo al ${plan.gel.firstAtMin}', poi uno ogni ${plan.gel.everyMin}' circa.`
    : null

  try {
    const unsubscribeUrl = await buildUnsubscribeUrl(user.id, SITE_URL)
    const { subject, html } = emailPianoNutrizione({
      recipientName,
      headline: plan.headline,
      gelSummary,
      sections: plan.sections.map(s => ({ title: s.title, subtitle: s.subtitle, items: s.items })),
      menus: menus.map(m => ({ title: m.title, when: m.when, items: m.items })),
      unsubscribeUrl,
    })
    await sendEmail(toEmail, subject, html)
  } catch (err) {
    console.error('[piano-gara]', err)
    return NextResponse.json({ error: 'Invio non riuscito, riprova più tardi.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sentTo: toEmail })
}
