import { NextResponse } from 'next/server'
import { addDays, format, parseISO } from 'date-fns'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'
import { PROPOSAL_KINDS, type ProposalKind } from '@/lib/proposals'
import { todayItaly } from '@/lib/utils'

export const runtime = 'nodejs'

/** Massimo di proposte aperte per città e zona (per Roma si lavora per zona: decisione Q5). */
const MAX_OPEN_PER_AREA = 3
const LEVELS = ['principiante', 'intermedio', 'avanzato', 'tutti']
const TIME_RE = /^\d{2}:\d{2}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Crea una proposta di corsa (SQL #53). Livello base (AAL1) e service-role, come le schede crew.
 * Senza `force`, restituisce 409 con gli avvisi: troppe proposte aperte nella stessa area, un'altra
 * proposta lo stesso giorno, una corsa reale compatibile. L'admin può confermare con `force: true`.
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi(false)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await request.json().catch(() => ({}))
  const kind = str(body.kind) as ProposalKind
  const title = str(body.title)
  const city = str(body.city)
  const zone = str(body.zone) || null
  const target_date = str(body.target_date)
  const time_from = str(body.time_from)
  const time_to = str(body.time_to)
  const level = str(body.level) || 'tutti'
  const distance_min_km = num(body.distance_min_km)
  const distance_max_km = num(body.distance_max_km)
  const lat = num(body.lat)
  const lng = num(body.lng)
  const today = todayItaly()

  const invalid = (error: string) => NextResponse.json({ error }, { status: 400 })
  if (!(kind in PROPOSAL_KINDS)) return invalid('Tipologia non valida')
  if (title.length < 3 || title.length > 120) return invalid('Il titolo deve avere tra 3 e 120 caratteri')
  if (!city) return invalid('La città è obbligatoria')
  if (!DATE_RE.test(target_date) || target_date < today) return invalid('La data deve essere oggi o nel futuro')
  if (target_date > format(addDays(parseISO(today), 60), 'yyyy-MM-dd')) return invalid('La data è oltre i 60 giorni')
  if (!TIME_RE.test(time_from) || !TIME_RE.test(time_to) || time_to <= time_from) return invalid('Finestra oraria non valida')
  if (!LEVELS.includes(level)) return invalid('Livello non valido')
  for (const n of [distance_min_km, distance_max_km, lat, lng]) if (Number.isNaN(n)) return invalid('Numero non valido')
  if (distance_min_km != null && distance_max_km != null && distance_max_km < distance_min_km) {
    return invalid('La distanza massima è minore della minima')
  }

  const svc = createServiceRoleClient()

  if (!body.force) {
    const warnings: string[] = []
    const { data: open } = await svc
      .from('run_proposals').select('id, zone, target_date')
      .eq('status', 'aperta').ilike('city', city)
    const sameArea = (open ?? []).filter(p => (p.zone ?? '').toLowerCase() === (zone ?? '').toLowerCase())
    if (sameArea.length >= MAX_OPEN_PER_AREA) {
      warnings.push(`Ci sono già ${sameArea.length} proposte aperte a ${city}${zone ? ` (${zone})` : ''}.`)
    }
    if (sameArea.some(p => p.target_date === target_date)) {
      warnings.push('C’è già una proposta aperta lo stesso giorno nella stessa area.')
    }
    let runs = svc
      .from('runs').select('id, title, date')
      .ilike('city', city).eq('status', 'aperta').eq('run_visibility', 'public')
      .gte('date', format(addDays(parseISO(target_date), -1), 'yyyy-MM-dd'))
      .lte('date', format(addDays(parseISO(target_date), 1), 'yyyy-MM-dd'))
    if (distance_min_km != null) runs = runs.gte('distance_km', distance_min_km)
    if (distance_max_km != null) runs = runs.lte('distance_km', distance_max_km)
    const { data: compatible } = await runs.limit(3)
    if (compatible && compatible.length > 0) {
      warnings.push(`Esiste già una corsa reale compatibile: «${compatible[0].title}» (${compatible[0].date}). La proposta non comparirebbe in bacheca finché c’è.`)
    }
    if (warnings.length > 0) return NextResponse.json({ warnings }, { status: 409 })
  }

  const { data, error } = await svc.from('run_proposals').insert({
    kind, title, city, zone, target_date, time_from, time_to, level,
    description: str(body.description) || null,
    pace_target: str(body.pace_target) || null,
    distance_min_km, distance_max_km, lat, lng,
    source: 'admin',
    created_by: guard.user.id,
  }).select('id').single()
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Proposta non creata' }, { status: 500 })

  await logAdminAction(svc, {
    admin_id: guard.user.id, action_type: 'proposal.create',
    entity_table: 'run_proposals', entity_id: data.id,
    metadata: { city, zone, target_date, kind, forced: !!body.force },
  })

  return NextResponse.json({ id: data.id })
}
