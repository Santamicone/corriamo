import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// NB: @anthropic-ai/sdk ed exceljs sono importati in modo LAZY (dynamic import)
// dentro le funzioni che li usano, non in cima al modulo: così non vengono
// caricati per i percorsi che non li usano (es. "Testo") e un eventuale errore
// di caricamento nel bundle serverless resta catturabile dal try/catch.

/**
 * Ingestione fonti grezze → gare candidate (calendario gare).
 *
 * Accetta testo incollato, volantini (jpg/pdf), elenchi di URL, xls/csv e usa
 * Claude (vision per volantini/PDF) per estrarre UNA O PIÙ gare strutturate.
 * Non scrive nulla: restituisce candidati che poi passano dal dedup
 * (find_duplicate_races) e dalla moderazione umana. Provenienza indistinguibile
 * (source='editoriale'): AI e inserimento manuale non si distinguono.
 *
 * Richiede ANTHROPIC_API_KEY. Solo lato server (route admin).
 */

// Modelli: opus per la vision sui volantini/PDF (più accurato), sonnet per
// testo/CSV/URL (costo minore). Vedi docs/CALENDARIO-GARE.md §10.
const MODEL_VISION = 'claude-opus-4-8'
const MODEL_TEXT = 'claude-sonnet-5'

const CATALOG_DISTANCES = ['5k', '10k', '21k', '42k', 'trail', 'ultra', 'other'] as const
const RACE_TYPES = ['competitiva', 'non_competitiva', 'federale', 'internazionale', 'charity'] as const

const RaceCandidate = z.object({
  name: z.string().describe("Nome ufficiale della gara, edizione inclusa se presente (es. '18° Maratona di Roma')"),
  city: z.string().describe('Città di partenza/svolgimento'),
  region: z.string().nullable().describe('Regione italiana (es. Lazio) se deducibile, altrimenti null'),
  event_date: z.string().describe('Data in formato YYYY-MM-DD'),
  distances: z.array(z.enum(CATALOG_DISTANCES)).describe('Distanze mappate: 5→5k, 10→10k, 21→21k, 42→42k, altro→other'),
  race_type: z.enum(RACE_TYPES),
  official_url: z.string().nullable().describe('URL ufficiale SOLO se presente nella fonte; MAI inventato, altrimenti null'),
  confidence: z.enum(['alta', 'media', 'bassa']).describe('Quanto sei sicuro dei dati estratti'),
})
export type RaceCandidate = z.infer<typeof RaceCandidate>

const Extraction = z.object({ races: z.array(RaceCandidate) })

const SYSTEM = `Sei un assistente che estrae gare podistiche italiane da fonti grezze per un catalogo eventi.

Regole:
- Estrai UNA O PIÙ gare. Una fonte può contenere più eventi/date/distanze.
- Data sempre in formato YYYY-MM-DD. Se manca l'anno, deducilo dal contesto o usa l'anno prossimo più vicino.
- distances: mappa i chilometri alle categorie del catalogo (circa 5→5k, 10→10k, 21→21k, 42→42k; trail/ultra come tali; il resto → other).
- official_url: riportalo SOLO se compare esplicitamente nella fonte. NON inventare MAI URL, email o dati non presenti: in dubbio usa null o ometti la gara.
- Ignora contenuti che non sono gare podistiche.
- Restituisci un array vuoto se non trovi gare affidabili.`

type FilePayload = { name: string; mediaType: string; dataBase64: string }
export type IngestPayload =
  | { type: 'text'; text: string }
  | { type: 'urls'; urls: string[] }
  | { type: 'files'; files: FilePayload[] }

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Converte un buffer xls/xlsx/csv in testo CSV per l'estrazione. */
async function spreadsheetToText(buffer: Buffer, mediaType: string): Promise<string> {
  if (mediaType === 'text/csv' || mediaType === 'application/csv') {
    return buffer.toString('utf8').slice(0, 200_000)
  }
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  // Cast: attrito tra il Buffer generico di @types/node e la firma di exceljs
  await wb.xlsx.load(buffer as never)
  const lines: string[] = []
  wb.worksheets.forEach(ws => {
    ws.eachRow(row => {
      const vals = (row.values as unknown[]).slice(1).map(v => (v == null ? '' : String(v)))
      lines.push(vals.join(','))
    })
  })
  return lines.join('\n').slice(0, 200_000)
}

/** Scarica una pagina e ne estrae il testo (best-effort, tag rimossi). */
async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'vieniacorrere-ingest/1.0' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) return `[${url}: HTTP ${res.status}]`
  const html = (await res.text()).slice(0, 400_000)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `Fonte: ${url}\n${text.slice(0, 20_000)}`
}

type Block = Anthropic.ContentBlockParam

/** Costruisce i blocchi di contenuto Claude e sceglie il modello adatto. */
async function buildContent(payload: IngestPayload): Promise<{ blocks: Block[]; model: string }> {
  if (payload.type === 'text') {
    return {
      model: MODEL_TEXT,
      blocks: [{ type: 'text', text: `Estrai le gare da questo testo:\n\n${payload.text.slice(0, 100_000)}` }],
    }
  }

  if (payload.type === 'urls') {
    const texts = await Promise.all(payload.urls.slice(0, 10).map(fetchUrlText))
    return {
      model: MODEL_TEXT,
      blocks: [{ type: 'text', text: `Estrai le gare da queste pagine:\n\n${texts.join('\n\n---\n\n')}` }],
    }
  }

  // files: volantini (image/pdf) o fogli (csv/xls)
  const blocks: Block[] = []
  let needsVision = false
  for (const f of payload.files) {
    const buf = Buffer.from(f.dataBase64, 'base64')
    if (IMAGE_TYPES.includes(f.mediaType)) {
      needsVision = true
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: f.mediaType as 'image/jpeg', data: f.dataBase64 },
      })
    } else if (f.mediaType === 'application/pdf') {
      needsVision = true
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.dataBase64 },
      })
    } else {
      const csv = await spreadsheetToText(buf, f.mediaType)
      blocks.push({ type: 'text', text: `Foglio «${f.name}»:\n${csv}` })
    }
  }
  blocks.push({ type: 'text', text: 'Estrai tutte le gare dai contenuti qui sopra.' })
  return { model: needsVision ? MODEL_VISION : MODEL_TEXT, blocks }
}

/** Estrae le gare candidate da una fonte grezza tramite Claude. */
export async function extractRaces(payload: IngestPayload): Promise<RaceCandidate[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY non configurata: l\'ingestione AI non è disponibile.')
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
  const client = new Anthropic()
  const { blocks, model } = await buildContent(payload)

  const res = await client.messages.parse({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content: blocks }],
    output_config: { format: zodOutputFormat(Extraction) },
  })
  return res.parsed_output?.races ?? []
}

/** Rimuove accenti e riduce a slug ASCII. */
export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export type RaceRow = {
  slug: string
  name: string
  city: string
  region: string | null
  event_date: string
  distances: string[]
  race_type: string
  official_url: string | null
}

/** Normalizza un candidato in una riga `races` (con slug nostro). */
export function normalizeToRaceRow(c: RaceCandidate): RaceRow {
  const year = /^\d{4}/.test(c.event_date) ? c.event_date.slice(0, 4) : ''
  return {
    slug: [slugify(`${c.name} ${c.city}`), year].filter(Boolean).join('-'),
    name: c.name.trim(),
    city: c.city.trim(),
    region: c.region?.trim() || null,
    event_date: c.event_date,
    distances: c.distances,
    race_type: c.race_type,
    official_url: c.official_url?.trim() || null,
  }
}
