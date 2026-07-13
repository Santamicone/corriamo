/**
 * Import automatico delle gare su strada italiane dal calendario Podisti.Net.
 *
 * Sorgente:  https://calendario.podisti.net/wp-json/wp/v2/gara  (REST API pubblica
 *            di WordPress: il custom post type `gara` è esposto con `show_in_rest`).
 * Copre il long-tail italiano che AIMS non fornisce. Popola public.races con
 * source='podisti'.
 *
 * PERIMETRO (deciso con il committente):
 *   - solo categorie SU STRADA (392), MEZZA MARATONA (6), MARATONA (5);
 *     escluse trail/skyrace/vertical, ultra, campestre, in montagna, pista,
 *     staffetta, corsa a tappe;
 *   - solo gare COMPETITIVE (acf.competitiva === true);
 *   - solo i prossimi 12 mesi.
 * I filtri competitiva + finestra 12 mesi sono applicati lato script perché la
 * REST di WordPress non filtra i campi ACF.
 *
 * Slug: generiamo il NOSTRO permalink (slugify(nome+città)-anno), non riusiamo
 * quello di Podisti.Net.
 *
 * Idempotente: upsert per (source='podisti', external_ref = id WordPress), quindi
 * si può rilanciare (cron settimanale) senza duplicare né rompere runs.race_id.
 *
 * Uso:
 *   npm run import:podisti              # scrive su Supabase (.env.local)
 *   node scripts/import-podisti.mjs --dry-run   # solo fetch+mapping, nessuna scrittura
 *
 * Richiede (tranne in --dry-run) in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (bypassa la RLS per scrivere le righe source='podisti')
 *
 * Nota dedup cross-fonte: questo import è isolato (come AIMS). Un eventuale
 * doppione con una gara AIMS/editoriale della stessa maratona italiana viene
 * gestito dal dedup potenziato (pg_trgm), non qui.
 */

import { createClient } from '@supabase/supabase-js'

const API = 'https://calendario.podisti.net/wp-json/wp/v2/gara'
const UA = 'vieniacorrere-import/1.0 (+https://app.vieniacorrere.it)'
const DRY_RUN = process.argv.includes('--dry-run')

// ID tassonomia categoria_gara (Podisti.Net) delle sole categorie su strada.
const CAT = { SU_STRADA: 392, MEZZA: 6, MARATONA: 5 }
const CATEGORIES = [CAT.SU_STRADA, CAT.MEZZA, CAT.MARATONA].join(',')

const MONTHS_AHEAD = 12

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    'Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Aggiungile a .env.local (lo script gira con `node --env-file=.env.local`),\n' +
      'oppure lancia con --dry-run per vedere solo il mapping senza scrivere.'
  )
  process.exit(1)
}

/** Le 20 regioni italiane: slug tassonomia localita_gara → nome leggibile. */
const REGIONS = {
  abruzzo: 'Abruzzo',
  basilicata: 'Basilicata',
  calabria: 'Calabria',
  campania: 'Campania',
  'emilia-romagna': 'Emilia-Romagna',
  'friuli-venezia-giulia': 'Friuli-Venezia Giulia',
  lazio: 'Lazio',
  liguria: 'Liguria',
  lombardia: 'Lombardia',
  marche: 'Marche',
  molise: 'Molise',
  piemonte: 'Piemonte',
  puglia: 'Puglia',
  sardegna: 'Sardegna',
  sicilia: 'Sicilia',
  toscana: 'Toscana',
  'trentino-alto-adige': 'Trentino-Alto Adige',
  umbria: 'Umbria',
  'valle-d-aosta': "Valle d'Aosta",
  veneto: 'Veneto',
}

/** Rimuove accenti e riduce a slug ASCII (es. "Città di Udine" → "citta-di-udine"). */
function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Decodifica le entità HTML più comuni nei titoli WordPress. */
function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** "20261018" → "2026-10-18" (null se non valida). */
function acfDate(raw) {
  if (!raw || !/^\d{8}$/.test(raw)) return null
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : iso
}

/** "Monza (Mb)" → "Monza"; stringa vuota → null. */
function cleanCity(localita) {
  const c = decodeEntities(localita || '')
    .replace(/\s*\([^)]*\)\s*$/, '') // toglie la provincia tra parentesi finale
    .trim()
  return c.length ? c : null
}

/**
 * Da "distanze_percorsi" (es. "3-5-10", "2,8-7", "5.6 km", "3-6-12-18") ai token
 * del catalogo (5k|10k|21k|42k|other). La virgola è il decimale italiano.
 */
function bucketKm(v) {
  if (v >= 40 && v <= 44) return '42k'
  if (v >= 20 && v <= 23) return '21k'
  if (v >= 9 && v <= 11) return '10k'
  if (v >= 4.5 && v <= 5.5) return '5k'
  return 'other'
}

function parseDistances(distanze, categorie) {
  const tokens = new Set()
  const nums = String(distanze || '')
    .toLowerCase()
    .replace(/km|mt|metri/g, ' ')
    .replace(/(\d),(\d)/g, '$1.$2') // decimale italiano → punto
    .split(/[^\d.]+/)
    .map(parseFloat)
    .filter(n => Number.isFinite(n) && n > 0 && n < 100)
  for (const n of nums) tokens.add(bucketKm(n))
  // Garantisce la distanza canonica dalla categoria
  if (categorie.includes(CAT.MARATONA)) tokens.add('42k')
  if (categorie.includes(CAT.MEZZA)) tokens.add('21k')
  // 'other' è rumore se ci sono già distanze riconosciute
  if (tokens.size > 1) tokens.delete('other')
  return [...tokens]
}

/** Regione dalla class_list del post (es. "localita_gara-lombardia" → "Lombardia"). */
function regionFromClassList(classList) {
  for (const cls of classList || []) {
    const m = /^localita_gara-(.+)$/.exec(cls)
    if (m && REGIONS[m[1]]) return REGIONS[m[1]]
  }
  return null
}

/** Normalizza un link ("www.x.it" → "https://www.x.it"); vuoto → null. */
function normalizeUrl(url) {
  const u = String(url || '').trim()
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

/** Scarica tutte le pagine delle categorie su strada dalla REST API. */
async function fetchAllGare() {
  const perPage = 100
  const first = await fetch(
    `${API}?categoria_gara=${CATEGORIES}&per_page=${perPage}&page=1&_fields=id,title,acf,class_list`,
    { headers: { 'User-Agent': UA } }
  )
  if (!first.ok) throw new Error(`REST non raggiungibile: HTTP ${first.status}`)
  const totalPages = Number(first.headers.get('x-wp-totalpages') || 1)
  const total = Number(first.headers.get('x-wp-total') || 0)
  const all = await first.json()

  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(
      `${API}?categoria_gara=${CATEGORIES}&per_page=${perPage}&page=${page}&_fields=id,title,acf,class_list`,
      { headers: { 'User-Agent': UA } }
    )
    if (!res.ok) throw new Error(`Pagina ${page}: HTTP ${res.status}`)
    all.push(...(await res.json()))
  }
  return { gare: all, total }
}

async function main() {
  console.log(`↓ Scarico le gare su strada da Podisti.Net …`)
  const { gare, total } = await fetchAllGare()
  console.log(`  ${gare.length}/${total} gare nelle categorie su strada/mezza/maratona`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setMonth(horizon.getMonth() + MONTHS_AHEAD)

  let skippedNonComp = 0
  let skippedWindow = 0
  const rows = []
  for (const g of gare) {
    const acf = g.acf || {}

    // Solo competitive
    if (acf.competitiva !== true) {
      skippedNonComp++
      continue
    }

    const eventDate = acfDate(acf.data_gara)
    if (!eventDate) continue
    const d = new Date(eventDate)
    if (d < today || d > horizon) {
      skippedWindow++
      continue
    }

    const name = decodeEntities(g.title?.rendered || '').trim()
    if (!name) continue
    const city = cleanCity(acf.localita)
    const region = regionFromClassList(g.class_list)
    const catIds = inferCatFromClassList(g.class_list)
    const distances = parseDistances(acf.distanze_percorsi ?? acf.distanza_gara, catIds)
    const year = eventDate.slice(0, 4)

    rows.push({
      slug: `${slugify(`${name} ${city || ''}`)}-${year}`,
      name,
      city: city || region || 'Italia',
      region,
      country: 'IT',
      event_date: eventDate,
      distances,
      race_type: 'competitiva',
      official_url: normalizeUrl(acf.link_evento) || normalizeUrl(acf.link_iscrizione),
      source: 'podisti',
      external_ref: String(g.id),
      status: 'published',
    })
  }

  console.log(
    `  → ${rows.length} da importare ` +
      `(scartate: ${skippedNonComp} non competitive, ${skippedWindow} fuori 12 mesi)`
  )

  if (DRY_RUN) {
    console.log('\n— DRY RUN: nessuna scrittura. Campione dei primi 8 mappati —\n')
    for (const r of rows.slice(0, 8)) {
      console.log(
        `  ${r.event_date}  ${r.name}\n` +
          `      slug: ${r.slug}\n` +
          `      ${[r.city, r.region].filter(Boolean).join(', ')} · ` +
          `${r.distances.join('/') || '—'} · ${r.official_url || 'no url'}`
      )
    }
    console.log('')
    return
  }

  // Slug unici: evita collisioni con la tabella e dentro il batch.
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: existing, error: exErr } = await supabase
    .from('races')
    .select('id, slug, external_ref, source')
  if (exErr) throw exErr

  const takenSlugs = new Set((existing || []).map(r => r.slug))
  const byRef = new Map(
    (existing || []).filter(r => r.source === 'podisti').map(r => [r.external_ref, r.id])
  )

  const toInsert = []
  let updated = 0
  for (const row of rows) {
    const id = byRef.get(row.external_ref)
    if (id) {
      // Non tocchiamo lo slug in update (permalink stabile)
      const update = { ...row }
      delete update.slug
      const { error } = await supabase.from('races').update(update).eq('id', id)
      if (error) throw error
      updated++
    } else {
      // Slug univoco solo per i nuovi
      let slug = row.slug
      if (takenSlugs.has(slug)) slug = `${slug}-${row.external_ref}`
      takenSlugs.add(slug)
      toInsert.push({ ...row, slug })
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100)
    const { error } = await supabase.from('races').insert(chunk)
    if (error) throw error
  }

  console.log(`✓ ${toInsert.length} inserite, ${updated} aggiornate.`)
}

/** categoria_gara non arriva sempre top-level: la deduco dagli slug class_list. */
function inferCatFromClassList(classList) {
  const ids = []
  for (const cls of classList || []) {
    if (cls === 'categoria_gara-maratona') ids.push(CAT.MARATONA)
    else if (cls === 'categoria_gara-mezza-maratona') ids.push(CAT.MEZZA)
    else if (cls === 'categoria_gara-su-strada') ids.push(CAT.SU_STRADA)
  }
  return ids
}

main().catch(err => {
  console.error('Import Podisti.Net fallito:', err.message)
  process.exit(1)
})
