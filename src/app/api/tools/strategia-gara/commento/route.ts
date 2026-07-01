import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { formatTime, formatPace } from '@/lib/running/time'

/**
 * POST /api/tools/strategia-gara/commento
 *
 * Genera un commento narrativo della gara con Claude a partire dalla strategia
 * già calcolata lato client. Il commento è testo descrittivo/coach: non è un
 * dato "di fiducia", quindi non serve ricalcolare — passiamo il riepilogo.
 */

export const runtime = 'nodejs'
export const maxDuration = 30

interface CommentPayload {
  raceName?: string
  distanceM?: number
  idealPaceSec?: number
  totalTimeSec?: number
  avgPaceSec?: number
  ascentM?: number
  descentM?: number
  criticalKms?: number[]
  conditions?: {
    temperatureC?: number
    humidityPct?: number
    windKmh?: number
    windType?: string
    terrain?: string
    crowd?: string
    approach?: string
  }
  /** Riepilogo compatto dei tratti più significativi (km + delta + nota). */
  highlights?: { km: number; deltaSec: number; gradePct: number; note: string }[]
}

const MODEL = 'claude-opus-4-8'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Il commento gara non è disponibile al momento.' },
      { status: 503 },
    )
  }

  let body: CommentPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 })
  }

  if (
    !body ||
    !Number.isFinite(body.distanceM) ||
    !Number.isFinite(body.idealPaceSec) ||
    !Number.isFinite(body.totalTimeSec)
  ) {
    return NextResponse.json({ error: 'Dati della strategia mancanti.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        "Sei un coach di corsa esperto e diretto che parla italiano. Scrivi il commento " +
        "strategico di una gara per un runner amatore, in tono incoraggiante ma concreto. " +
        "Usa 'tu'. Struttura in 3 brevi paragrafi: (1) lettura del percorso e come partire, " +
        "(2) gestione dei tratti critici e della parte centrale, (3) come chiudere la gara. " +
        "Massimo ~180 parole. Niente elenchi puntati, niente titoli, solo prosa. " +
        "Non inventare dati non forniti; ragiona solo su quelli qui riportati.",
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    if (!text) {
      return NextResponse.json({ error: 'Commento non disponibile, riprova.' }, { status: 502 })
    }

    return NextResponse.json({ comment: text })
  } catch (err) {
    console.error('[strategia-gara/commento]', err)
    return NextResponse.json(
      { error: 'Generazione del commento non riuscita, riprova più tardi.' },
      { status: 502 },
    )
  }
}

function buildPrompt(b: CommentPayload): string {
  const distKm = ((b.distanceM ?? 0) / 1000).toFixed(1)
  const c = b.conditions ?? {}
  const lines: string[] = [
    `Gara: ${b.raceName?.trim() || 'percorso caricato'}`,
    `Distanza: ${distKm} km`,
    `Dislivello: +${b.ascentM ?? 0} m / -${b.descentM ?? 0} m`,
    `Passo ideale su piatto: ${formatPace(b.idealPaceSec!)}/km`,
    `Passo medio stimato sul percorso: ${formatPace(b.avgPaceSec ?? b.idealPaceSec!)}/km`,
    `Tempo finale stimato: ${formatTime(b.totalTimeSec!)}`,
  ]

  const cond: string[] = []
  if (typeof c.temperatureC === 'number') cond.push(`${c.temperatureC}°C`)
  if (typeof c.humidityPct === 'number') cond.push(`umidità ${c.humidityPct}%`)
  if (c.windType && c.windType !== 'nullo') cond.push(`vento ${c.windType}${c.windKmh ? ` ${c.windKmh} km/h` : ''}`)
  if (c.terrain) cond.push(`fondo ${c.terrain}`)
  if (c.crowd) cond.push(`affollamento ${c.crowd}`)
  if (c.approach) cond.push(`approccio ${c.approach}`)
  if (cond.length) lines.push(`Condizioni: ${cond.join(', ')}`)

  if (b.criticalKms && b.criticalKms.length) {
    lines.push(`Km critici: ${b.criticalKms.join(', ')}`)
  }

  if (b.highlights && b.highlights.length) {
    lines.push('Tratti salienti:')
    for (const h of b.highlights.slice(0, 8)) {
      const sign = h.deltaSec >= 0 ? '+' : ''
      lines.push(`- km ${h.km} (pendenza ${h.gradePct}%, ${sign}${h.deltaSec}s vs ideale): ${h.note}`)
    }
  }

  return lines.join('\n')
}
