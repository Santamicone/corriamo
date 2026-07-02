/**
 * Import automatico delle gare dal feed AIMS (iCalendar pubblico).
 *
 * Sorgente:  https://aims-worldrunning.org/events.ics
 * Copre le maratone e mezze maratone europee + principali internazionali
 * membri AIMS. Popola public.races con source='aims'.
 *
 * Idempotente: fa upsert per (source, external_ref = UID AIMS), quindi si può
 * rilanciare (cron settimanale) senza duplicare né perdere i collegamenti
 * community (runs.race_id resta valido perché gli id non cambiano).
 *
 * Uso:  npm run import:aims
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (bypassa la RLS: le righe 'aims' non sono
 *                                inseribili con la anon key)
 *
 * Note:
 * - Il feed LOCATION contiene solo il PAESE. La città è derivata best-effort
 *   dal SUMMARY (editabile a mano dopo l'import).
 * - Import limitato all'Europa (vedi EUROPE) e a maratone/mezze.
 */

import { createClient } from '@supabase/supabase-js'

const FEED_URL = 'https://aims-worldrunning.org/events.ics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Aggiungile a .env.local (lo script gira con `node --env-file=.env.local`).'
  )
  process.exit(1)
}

/** Nome paese (inglese, come nel feed) → ISO-2. Solo Europa: filtra l'import. */
const EUROPE = {
  Albania: 'AL', Andorra: 'AD', Austria: 'AT', Belarus: 'BY', Belgium: 'BE',
  'Bosnia and Herzegovina': 'BA', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY',
  'Czech Republic': 'CZ', Czechia: 'CZ', Denmark: 'DK', Estonia: 'EE',
  'Faroe Islands': 'FO', Finland: 'FI', France: 'FR', Germany: 'DE',
  Gibraltar: 'GI', Greece: 'GR', Hungary: 'HU', Iceland: 'IS', Ireland: 'IE',
  Italy: 'IT', Kosovo: 'XK', Latvia: 'LV', Liechtenstein: 'LI', Lithuania: 'LT',
  Luxembourg: 'LU', Malta: 'MT', Moldova: 'MD', Monaco: 'MC', Montenegro: 'ME',
  Netherlands: 'NL', 'North Macedonia': 'MK', Macedonia: 'MK', Norway: 'NO',
  Poland: 'PL', Portugal: 'PT', Romania: 'RO', Russia: 'RU', 'San Marino': 'SM',
  Serbia: 'RS', Slovakia: 'SK', Slovenia: 'SI', Spain: 'ES', Sweden: 'SE',
  Switzerland: 'CH', Turkey: 'TR', Ukraine: 'UA', 'United Kingdom': 'GB',
  'Great Britain': 'GB', England: 'GB', Scotland: 'GB', Wales: 'GB',
}

/** Rimuove accenti e riduce a slug ASCII (es. "Città di Udine" → "citta-di-udine"). */
function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Unfold delle righe iCalendar (le continuazioni iniziano con spazio o tab). */
function unfold(ics) {
  return ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
}

/** Rimuove gli escape iCalendar dai valori testuali (\, \; \\ \n). */
function unescapeText(value) {
  return value.replace(/\\([,;\\])/g, '$1').replace(/\\[nN]/g, ' ').trim()
}

/** Estrae i VEVENT come mappe campo→valore (campi semplici, senza parametri). */
function parseEvents(ics) {
  const events = []
  const blocks = unfold(ics).split('BEGIN:VEVENT').slice(1)
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0]
    const ev = {}
    for (const line of body.split('\n')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).split(';')[0].trim().toUpperCase()
      ev[key] = unescapeText(line.slice(idx + 1).trim())
    }
    if (ev.SUMMARY) events.push(ev)
  }
  return events
}

/** "20260704" → "2026-07-04". */
function icsDate(raw) {
  if (!raw || raw.length < 8) return null
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

/** DTEND è esclusivo: torna la data effettiva di fine solo se multi-giorno. */
function endDate(dtstart, dtend) {
  const start = icsDate(dtstart)
  const end = icsDate(dtend)
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.round((e - s) / 86_400_000)
  if (days <= 1) return null // evento di un solo giorno
  e.setDate(e.getDate() - 1) // DTEND esclusivo → ultimo giorno reale
  return e.toISOString().slice(0, 10)
}

/** Distanza dal SUMMARY. Solo maratona/mezza (scope AIMS europeo). */
function distanceFromSummary(summary) {
  const s = summary.toLowerCase()
  if (/\bhalf\b/.test(s)) return '21k'
  if (/\bmarathon\b/.test(s)) return '42k'
  return null // 10K, ultra, altro → fuori scope
}

/** Città best-effort dal SUMMARY (rimuove i termini di distanza in coda). */
function cityFromSummary(summary, countryName) {
  const guess = summary
    .replace(/\b(half\s+)?marathon\b/i, '')
    .replace(/[-–\s]+$/g, '')
    .trim()
  return guess.length >= 2 && guess.length <= 40 ? guess : countryName
}

async function main() {
  console.log(`↓ Scarico ${FEED_URL} …`)
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'vieniacorrere-import/1.0' } })
  if (!res.ok) throw new Error(`Feed non raggiungibile: HTTP ${res.status}`)
  const ics = await res.text()

  const events = parseEvents(ics)
  console.log(`  ${events.length} VEVENT nel feed`)

  const rows = []
  for (const ev of events) {
    const countryName = (ev.LOCATION || '').trim()
    const country = EUROPE[countryName]
    if (!country) continue // fuori Europa
    const distance = distanceFromSummary(ev.SUMMARY)
    if (!distance) continue // non maratona/mezza
    const eventDate = icsDate(ev.DTSTART)
    if (!eventDate) continue

    const name = ev.SUMMARY.trim()
    const city = cityFromSummary(name, countryName)
    const url = ev.URL ? (ev.URL.startsWith('http') ? ev.URL : `https://${ev.URL}`) : null
    const year = eventDate.slice(0, 4)

    rows.push({
      slug: `${slugify(name)}-${year}`,
      name,
      city,
      region: null,
      country,
      event_date: eventDate,
      end_date: endDate(ev.DTSTART, ev.DTEND),
      distances: [distance],
      race_type: 'internazionale',
      official_url: url,
      circuit: 'aims',
      source: 'aims',
      external_ref: ev.UID || null,
      status: 'published',
    })
  }
  console.log(`  ${rows.length} gare europee maratona/mezza da importare`)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Mappa external_ref → id delle gare AIMS già presenti (per upsert senza duplicati)
  const { data: existing, error: exErr } = await supabase
    .from('races')
    .select('id, external_ref')
    .eq('source', 'aims')
  if (exErr) throw exErr
  const byRef = new Map((existing || []).map(r => [r.external_ref, r.id]))

  const toInsert = []
  let updated = 0
  for (const row of rows) {
    const id = byRef.get(row.external_ref)
    if (id) {
      const { error } = await supabase.from('races').update(row).eq('id', id)
      if (error) throw error
      updated++
    } else {
      toInsert.push(row)
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from('races').insert(toInsert)
    if (error) throw error
  }

  console.log(`✓ ${toInsert.length} inserite, ${updated} aggiornate.`)
}

main().catch(err => {
  console.error('Import fallito:', err.message)
  process.exit(1)
})
