/**
 * Import delle crew dall'area admin (docs/MAPPA-CREW.md §9.1).
 * Codice PURO, senza dipendenze dal resto del progetto: lo usano la pagina admin (anteprima),
 * le API e lo script da terminale, e si prova da solo.
 *
 * Formato: CSV o tabella incollata da Excel (tabulazioni). Una riga per crew, con intestazione.
 * Regole di docs/MAPPA-CREW.md §4.6: solo dati pubblici di organizzazioni, almeno un link
 * pubblico, mai telefoni o dati di persone.
 */

export type CrewImportType = 'training_group' | 'running_club' | 'friends'

/** Una riga già controllata e normalizzata, pronta per l'anteprima e il salvataggio. */
export interface CrewImportRow {
  name: string
  city: string
  zone: string | null
  crew_type: CrewImportType
  meeting_point: string | null
  schedule_text: string | null
  website_url: string | null
  instagram_url: string | null
  description: string | null
  contact_email: string | null
  /** Link del logo (facoltativo): finisce nel campo avatar_url */
  avatar_url: string | null
}

export interface ParsedRow {
  /** Numero di riga nel file (1 = prima riga di dati, intestazione esclusa) */
  line: number
  row: CrewImportRow | null
  errors: string[]
  warnings: string[]
}

/** Riga analizzata dalla API admin: controlli, pin proposto e possibili doppioni già presenti. */
export interface AnalyzedRow extends ParsedRow {
  /** Con il ritrovo il pin è "zona" (circa 1 km), altrimenti "città" */
  pin_precision: 'area' | 'city'
  duplicates: {
    id: string; slug: string | null; name: string; city: string | null
    source: string; trust_level: string; moderation_status: string; name_sim: number
  }[]
}

/* ───────────────────────── limiti (coerenti con i form e i vincoli del database) ───────────────────────── */

export const LIMITS = {
  name: 60,
  city: 80,
  zone: 60,
  meeting_point: 200,
  schedule_text: 300,
  description: 300,
  url: 300,
  rows: 200, // massimo per file: l'analisi cerca la posizione di ogni città (1 richiesta/secondo)
} as const

/* ───────────────────────── CSV / tabella incollata ───────────────────────── */

/** Sceglie il separatore guardando la prima riga: tabulazione (Excel), punto e virgola o virgola. */
function detectDelimiter(firstLine: string): string {
  const counts = { '\t': 0, ';': 0, ',': 0 }
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch in counts) counts[ch as keyof typeof counts]++
  }
  if (counts['\t'] > 0) return '\t'
  return counts[';'] >= counts[','] && counts[';'] > 0 ? ';' : ','
}

/** Legge CSV con virgolette ("" = virgoletta), a capo dentro le virgolette e BOM iniziale. */
export function parseTable(input: string): string[][] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  if (!text.trim()) return []
  const delimiter = detectDelimiter(text.split('\n', 1)[0])

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
    } else if (ch === '"' && cell === '') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell); cell = ''
    } else if (ch === '\n') {
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else cell += ch
  }
  row.push(cell)
  rows.push(row)

  // Toglie le righe completamente vuote
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

/* ───────────────────────── intestazioni ───────────────────────── */

type Field = keyof CrewImportRow

const HEADER_ALIASES: Record<Field, string[]> = {
  name:          ['nome', 'name', 'crew', 'nome_crew', 'denominazione', 'societa'],
  city:          ['citta', 'city', 'comune', 'localita'],
  zone:          ['zona', 'provincia', 'prov', 'area'],
  crew_type:     ['tipo', 'type', 'categoria', 'tipologia'],
  meeting_point: ['ritrovo', 'luogo', 'punto_di_ritrovo', 'punto_ritrovo', 'meeting_point', 'dove'],
  schedule_text: ['giorni_e_orari', 'giorni_orari', 'giorni_e_orario', 'orari', 'orario', 'giorni', 'quando', 'schedule'],
  website_url:   ['sito', 'sito_web', 'website', 'web', 'url', 'link_sito'],
  instagram_url: ['instagram', 'ig', 'link_instagram'],
  description:   ['descrizione', 'description', 'presentazione'],
  contact_email: ['email', 'email_pubblica', 'mail', 'e_mail', 'contatto'],
  avatar_url:    ['logo', 'link_logo', 'logo_url', 'link_del_logo', 'immagine'],
}

export const REQUIRED_FIELDS: Field[] = ['name', 'city']

/** "Città (provincia)" → "citta_provincia": minuscolo, senza accenti né simboli. */
function normalizeHeader(h: string): string {
  return h
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export interface HeaderMap {
  /** campo → indice di colonna */
  columns: Partial<Record<Field, number>>
  unknown: string[]
  missing: Field[]
}

export function mapHeaders(headerRow: string[]): HeaderMap {
  const columns: Partial<Record<Field, number>> = {}
  const unknown: string[] = []

  const fields = Object.keys(HEADER_ALIASES) as Field[]
  // Prima il nome esatto, poi "nome + qualcosa" (es. "Città (provincia)" → "citta_provincia")
  const matchField = (norm: string): Field | undefined =>
    fields.find(f => HEADER_ALIASES[f].includes(norm)) ??
    fields.find(f => HEADER_ALIASES[f].some(alias => norm.startsWith(`${alias}_`)))

  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    if (!norm) return
    const field = matchField(norm)
    if (field && columns[field] === undefined) columns[field] = idx
    else if (!field) unknown.push(h.trim())
  })

  return { columns, unknown, missing: REQUIRED_FIELDS.filter(f => columns[f] === undefined) }
}

/* ───────────────────────── normalizzazione dei singoli campi ───────────────────────── */

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i

/** Link http(s). Aggiunge https:// se manca; rifiuta javascript:, data:, file: eccetera. */
export function normalizeUrl(raw: string): { url: string | null; error?: string } {
  const v = raw.trim()
  if (!v) return { url: null }
  if (/\s/.test(v)) return { url: null, error: 'il link contiene spazi' }
  if (SCHEME_RE.test(v) && !/^https?:\/\//i.test(v)) {
    // "www.sito.it:8080" non è uno schema; "mailto:", "javascript:" sì
    if (!/^[^/]+:\d+/.test(v)) return { url: null, error: 'il link deve iniziare con http:// o https://' }
  }
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.')) return { url: null, error: 'il link non sembra valido' }
    if (withScheme.length > LIMITS.url) return { url: null, error: 'il link è troppo lungo' }
    return { url: u.toString().replace(/\/$/, '') }
  } catch {
    return { url: null, error: 'il link non sembra valido' }
  }
}

/** Instagram: accetta @nome, nome o link. */
export function normalizeInstagram(raw: string): { url: string | null; error?: string } {
  const v = raw.trim()
  if (!v) return { url: null }
  const handle = v.replace(/^@/, '')
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return { url: `https://instagram.com/${handle}` }
  return normalizeUrl(v)
}

const TYPE_ALIASES: Record<CrewImportType, string[]> = {
  running_club: ['club', 'running club', 'running_club', 'societa', 'asd', 'ssd', 'associazione', 'team', 'societa sportiva'],
  training_group: ['gruppo', 'gruppo di allenamento', 'training group', 'training_group', 'allenamento', 'gruppo allenamento'],
  friends: ['amici', 'friends', 'gruppo di amici', 'informale'],
}

export function normalizeType(raw: string): CrewImportType | null {
  const v = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  if (!v) return null
  for (const type of Object.keys(TYPE_ALIASES) as CrewImportType[]) {
    if (TYPE_ALIASES[type].includes(v)) return type
  }
  return null
}

/** Sequenza che somiglia a un numero di telefono (almeno 8 cifre, con spazi o trattini). */
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,}\d/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Rimuove spazi doppi e a capo: i campi di scheda sono su una riga sola (tranne la descrizione). */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

/* ───────────────────────── una riga ───────────────────────── */

/** Controlla e normalizza una riga già mappata sui campi (utile anche per il modulo "Nuova crew"). */
export function validateRow(raw: Partial<Record<Field, string>>): { row: CrewImportRow | null; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const get = (f: Field) => (raw[f] ?? '').toString()

  const name = oneLine(get('name'))
  if (!name) errors.push('manca il nome')
  else if (name.length < 2) errors.push('il nome è troppo corto')
  else if (name.length > LIMITS.name) errors.push(`il nome supera ${LIMITS.name} caratteri`)

  const city = oneLine(get('city'))
  if (!city) errors.push('manca la città')
  else if (city.length > LIMITS.city) errors.push(`la città supera ${LIMITS.city} caratteri`)

  const zone = oneLine(get('zone'))
  if (zone.length > LIMITS.zone) errors.push(`la zona supera ${LIMITS.zone} caratteri`)

  let crew_type: CrewImportType = 'running_club'
  const typeRaw = get('crew_type').trim()
  if (typeRaw) {
    const t = normalizeType(typeRaw)
    if (t) crew_type = t
    else errors.push(`tipo non riconosciuto: "${typeRaw}" (usa club, gruppo oppure amici)`)
  } else {
    warnings.push('tipo non indicato: uso "club"')
  }

  const meeting_point = oneLine(get('meeting_point'))
  if (meeting_point.length > LIMITS.meeting_point) errors.push(`il ritrovo supera ${LIMITS.meeting_point} caratteri`)

  const schedule_text = oneLine(get('schedule_text'))
  if (schedule_text.length > LIMITS.schedule_text) errors.push(`giorni e orari superano ${LIMITS.schedule_text} caratteri`)

  const description = get('description').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (description.length > LIMITS.description) errors.push(`la descrizione supera ${LIMITS.description} caratteri`)

  // Mai telefoni o dati di persone (docs/MAPPA-CREW.md §4.6)
  for (const [label, text] of [['ritrovo', meeting_point], ['giorni e orari', schedule_text], ['descrizione', description]] as const) {
    if (text && PHONE_RE.test(text)) errors.push(`${label}: sembra contenere un numero di telefono, che non si pubblica`)
  }

  const web = normalizeUrl(get('website_url'))
  if (web.error) errors.push(`sito: ${web.error}`)
  const ig = normalizeInstagram(get('instagram_url'))
  if (ig.error) errors.push(`Instagram: ${ig.error}`)
  const logo = normalizeUrl(get('avatar_url'))
  if (logo.error) errors.push(`logo: ${logo.error}`)

  // Almeno un link pubblico (§4.6): senza, la scheda non è verificabile né rimovibile in modo sensato
  if (!web.url && !ig.url && !web.error && !ig.error) errors.push('serve almeno un link pubblico (sito o Instagram)')

  const email = get('contact_email').trim()
  if (email && !EMAIL_RE.test(email)) errors.push('email di contatto non valida')

  if (errors.length > 0) return { row: null, errors, warnings }

  return {
    row: {
      name,
      city,
      zone: zone || null,
      crew_type,
      meeting_point: meeting_point || null,
      schedule_text: schedule_text || null,
      website_url: web.url,
      instagram_url: ig.url,
      description: description || null,
      contact_email: email ? email.toLowerCase() : null,
      avatar_url: logo.url,
    },
    errors,
    warnings,
  }
}

/* ───────────────────────── tutto il file ───────────────────────── */

export interface ParseResult {
  rows: ParsedRow[]
  headers: HeaderMap
  /** errore che blocca tutto il file (nessuna intestazione, colonne obbligatorie mancanti, troppe righe) */
  fatal: string | null
}

export function parseCrewTable(text: string): ParseResult {
  const table = parseTable(text)
  if (table.length === 0) {
    return { rows: [], headers: { columns: {}, unknown: [], missing: REQUIRED_FIELDS }, fatal: 'Il testo è vuoto.' }
  }

  const headers = mapHeaders(table[0])
  if (headers.missing.length > 0) {
    return {
      rows: [],
      headers,
      fatal: `Mancano le colonne obbligatorie: ${headers.missing.map(f => (f === 'name' ? 'nome' : 'città')).join(', ')}. La prima riga deve essere l'intestazione.`,
    }
  }

  const dataRows = table.slice(1)
  if (dataRows.length === 0) return { rows: [], headers, fatal: 'Ci sono solo le intestazioni: aggiungi almeno una riga.' }
  if (dataRows.length > LIMITS.rows) {
    return { rows: [], headers, fatal: `Troppe righe (${dataRows.length}): al massimo ${LIMITS.rows} per volta.` }
  }

  const seen = new Map<string, number>()
  const rows: ParsedRow[] = dataRows.map((cells, i) => {
    const raw: Partial<Record<Field, string>> = {}
    for (const f of Object.keys(headers.columns) as Field[]) {
      raw[f] = cells[headers.columns[f] as number] ?? ''
    }
    const result = validateRow(raw)

    // Doppione dentro lo stesso file
    if (result.row) {
      const key = `${result.row.name.toLowerCase()}|${result.row.city.toLowerCase()}`
      const first = seen.get(key)
      if (first !== undefined) result.warnings.push(`stessa crew della riga ${first}`)
      else seen.set(key, i + 1)
    }
    return { line: i + 1, ...result }
  })

  return { rows, headers, fatal: null }
}

/* ───────────────────────── slug ───────────────────────── */

export function slugifyText(str: string): string {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Slug riservati alle pagine statiche sotto /crew/ (vincolo anche nel database, #49). */
export const RESERVED_SLUGS = new Set(['mappa', 'citta', 'nuova', 'invite', 'segnala'])

/**
 * Slug univoco: nome; se occupato nome-città; poi un numero. `taken` si aggiorna col nuovo slug,
 * così più righe dello stesso file non si scontrano tra loro.
 */
export function buildUniqueSlug(name: string, city: string, taken: Set<string>): string {
  const base = slugifyText(name) || 'crew'
  const candidates = [base, `${base}-${slugifyText(city)}`.replace(/-$/, '')]
  for (const c of candidates) {
    if (!RESERVED_SLUGS.has(c) && !taken.has(c)) { taken.add(c); return c }
  }
  for (let n = 2; ; n++) {
    const c = `${candidates[1]}-${n}`
    if (!taken.has(c)) { taken.add(c); return c }
  }
}

/* ───────────────────────── modello scaricabile ───────────────────────── */

export const CSV_TEMPLATE =
  'nome;città;zona;tipo;ritrovo;giorni e orari;sito;instagram;descrizione;email;logo\n' +
  'Running Perugia Club;Perugia;PG;club;Parco Santa Margherita;Martedì e giovedì 19:30;www.esempio.it;@runningperugia;Gruppo aperto a tutti i livelli.;;https://www.esempio.it/logo.png\n'
