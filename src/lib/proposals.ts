import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Proposte di corsa adottabili (SQL #53, spec: vieniacorrere-app/docs/proposte-adottabili.md).
 * Una proposta è una corsa SENZA organizzatore pubblicata dal servizio: chi vuole la "adotta"
 * con la RPC adopt_proposal e diventa una corsa normale in `runs`.
 */

export type ProposalKind =
  | 'principianti' | 'tranquilla' | 'aerobica' | 'veloce' | 'lungo' | 'trail' | 'rigenerante'
export type ProposalStatus = 'aperta' | 'adottata' | 'scaduta' | 'ritirata'
export type RunLevel = 'principiante' | 'intermedio' | 'avanzato' | 'tutti'

export interface RunProposal {
  id: string
  kind: ProposalKind
  title: string
  description: string | null
  city: string
  zone: string | null
  lat: number | null
  lng: number | null
  target_date: string // YYYY-MM-DD
  time_from: string   // HH:MM:SS
  time_to: string
  distance_min_km: number | null
  distance_max_km: number | null
  pace_target: string | null
  level: RunLevel
  expires_at: string
  interest_count: number
  i_am_interested: boolean
}

export interface RunProposalDetail extends RunProposal {
  status: ProposalStatus
  adopted_run_id: string | null
  adopted_by: string | null
  adopted_by_name: string | null
}

/** Modelli: le 7 tipologie della strategia di seeding. Precompilano il modulo admin. */
export const PROPOSAL_KINDS: Record<ProposalKind, {
  label: string; icon: string; title: string
  distance: [number, number]; pace: string | null; level: RunLevel; window: [string, string]
}> = {
  principianti: { label: 'Principianti',        icon: 'directions_walk', title: 'Prima corsa insieme',      distance: [3, 5],   pace: '7:00-8:00', level: 'principiante', window: ['18:30', '19:30'] },
  tranquilla:   { label: 'Tranquilla',          icon: 'directions_run',  title: 'Corsa tranquilla',         distance: [5, 8],   pace: '6:00-7:00', level: 'tutti',        window: ['18:30', '19:30'] },
  aerobica:     { label: 'Aerobica',            icon: 'favorite',        title: 'Aerobico in compagnia',    distance: [8, 12],  pace: '5:00-6:00', level: 'intermedio',   window: ['18:30', '19:30'] },
  veloce:       { label: 'Veloce',              icon: 'bolt',            title: 'Corsa veloce',             distance: [8, 15],  pace: '4:00-4:45', level: 'avanzato',     window: ['18:30', '19:30'] },
  lungo:        { label: 'Lungo',               icon: 'route',           title: 'Un lungo in compagnia',    distance: [18, 30], pace: null,        level: 'intermedio',   window: ['08:00', '09:30'] },
  trail:        { label: 'Trail',               icon: 'landscape',       title: 'Trail in compagnia',       distance: [8, 20],  pace: null,        level: 'tutti',        window: ['08:00', '09:30'] },
  rigenerante:  { label: 'Rigenerante',         icon: 'wb_twilight',     title: "Corsa all'alba",           distance: [5, 12],  pace: null,        level: 'tutti',        window: ['06:30', '07:30'] },
}

export const ADOPT_ERRORS: Record<string, string> = {
  not_authenticated: 'Sessione scaduta: accedi di nuovo.',
  user_suspended:    'Il tuo account non può pubblicare corse in questo momento.',
  proposal_not_found: 'Questa proposta non esiste più.',
  proposal_taken:    'Qualcuno l’ha appena organizzata: trovi la corsa nella pagina della proposta.',
  proposal_expired:  'Questa proposta è scaduta.',
  adopt_limit:       'Hai già due corse in programma nate da proposte: organizzane una nuova dopo averle fatte.',
  date_out_of_range: 'La data può spostarsi al massimo di due giorni rispetto a quella proposta, e non nel passato.',
  invalid_run:       'Controlla data, orario, titolo e punto di ritrovo.',
}

/** Traduce l'errore della RPC (il codice è nel messaggio). */
export function adoptErrorMessage(message: string | undefined): string {
  if (!message) return 'Non è stato possibile pubblicare la corsa. Riprova.'
  const code = Object.keys(ADOPT_ERRORS).find(k => message.includes(k))
  return code ? ADOPT_ERRORS[code] : message
}

export async function fetchProposals(
  supabase: SupabaseClient, city?: string | null, limit = 10,
): Promise<RunProposal[]> {
  const { data, error } = await supabase.rpc('proposals_discover', { p_city: city || null, p_limit: limit })
  if (error) {
    // Prima dello SQL #53 la funzione non esiste: la bacheca resta com'era
    console.warn('[proposals] discover:', error.message)
    return []
  }
  return (data ?? []) as RunProposal[]
}

export async function fetchProposal(supabase: SupabaseClient, id: string): Promise<RunProposalDetail | null> {
  const { data, error } = await supabase.rpc('proposal_detail', { p_id: id }).maybeSingle()
  if (error) {
    console.warn('[proposals] detail:', error.message)
    return null
  }
  return (data ?? null) as RunProposalDetail | null
}

/* ── Formattazione ── */

export const hhmm = (t: string) => t.slice(0, 5)

/** "domenica 6 dicembre" */
export function formatProposalDay(date: string): string {
  return format(parseISO(date), 'EEEE d MMMM', { locale: it })
}

/** "8:00–9:30" */
export function formatWindow(p: Pick<RunProposal, 'time_from' | 'time_to'>): string {
  return `${hhmm(p.time_from).replace(/^0/, '')}–${hhmm(p.time_to).replace(/^0/, '')}`
}

const km = (n: number) => String(Number(n)).replace('.', ',')

/** "20–24 km", "da 5 km", null */
export function formatDistanceRange(p: Pick<RunProposal, 'distance_min_km' | 'distance_max_km'>): string | null {
  const { distance_min_km: a, distance_max_km: b } = p
  if (a != null && b != null) return a === b ? `${km(a)} km` : `${km(a)}–${km(b)} km`
  if (a != null) return `da ${km(a)} km`
  if (b != null) return `fino a ${km(b)} km`
  return null
}

/** "5:15-5:45/km"; null se non indicato (= ritmo variabile). */
export function formatProposalPace(pace: string | null): string | null {
  const t = pace?.trim()
  if (!t) return null
  return /\/|km/i.test(t) ? t : `${t}/km`
}

/** Decisione Q4: il numero si mostra da 1 in su; con 0 un invito. */
export function interestLabel(count: number): string {
  if (count <= 0) return 'Sii il primo interessato'
  return count === 1 ? '1 interessato' : `${count} interessati`
}

/** Distanza da precompilare: metà dell'intervallo, arrotondata. */
export function suggestedDistance(p: Pick<RunProposal, 'distance_min_km' | 'distance_max_km'>): string {
  const { distance_min_km: a, distance_max_km: b } = p
  if (a != null && b != null) return String(Math.round((Number(a) + Number(b)) / 2))
  const v = a ?? b
  return v != null ? String(Number(v)) : ''
}

/** Decisione Q1: la data si sposta di ±2 giorni, mai nel passato. */
export function adoptDateRange(targetDate: string, today: string): { min: string; max: string } {
  // addDays e non +86.400.000 ms: con il cambio dell'ora un giorno non dura 24 h
  const shift = (n: number) => format(addDays(parseISO(targetDate), n), 'yyyy-MM-dd')
  const min = shift(-2)
  return { min: min < today ? today : min, max: shift(2) }
}
