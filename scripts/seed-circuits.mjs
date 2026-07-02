/**
 * Seed delle gare dei circuiti iconici in public.races:
 * Abbott World Marathon Majors + SuperHalfs (mezze europee).
 *
 * Sono poche gare "statiche" (14) che cambiano solo di data una volta l'anno:
 * i dati stanno qui, non serve una fonte automatica. L'app le legge dal DB,
 * quindi le costanti servono solo a questo script.
 *
 * Uso:  npm run seed:circuits
 *
 * Idempotente e con dedup verso l'import AIMS:
 * - se una gara del circuito è già in tabella (match per country + event_date
 *   + distanza, es. la BMW Berlin Marathon già importata da AIMS) → la marca
 *   circuit/featured invece di duplicarla;
 * - altrimenti la inserisce come source='editoriale' con external_ref stabile
 *   (rilanciabile senza duplicati).
 *
 * ⚠ Manutenzione: aggiornare le date a inizio stagione (le edizioni passate
 * usano già la prossima edizione nota; le date 2027 non ancora ufficiali sono
 * marcate registration_status='da_verificare').
 *
 * Richiede in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  process.exit(1)
}

// Prossima edizione di ciascuna gara (rispetto a metà 2026).
// confirmed: false → data da pattern storico, non ancora ufficiale.
const CIRCUITS = [
  // --- Abbott World Marathon Majors (42k) ---
  { ext: 'major-tokyo',     name: 'Tokyo Marathon',            city: 'Tokyo',     country: 'JP', date: '2027-03-07', confirmed: false, url: 'https://www.marathon.tokyo/en/' },
  { ext: 'major-boston',    name: 'Boston Marathon',           city: 'Boston',    country: 'US', date: '2027-04-19', confirmed: false, url: 'https://www.baa.org/' },
  { ext: 'major-london',    name: 'TCS London Marathon',       city: 'London',    country: 'GB', date: '2027-04-25', confirmed: false, url: 'https://www.tcslondonmarathon.com/' },
  { ext: 'major-sydney',    name: 'Sydney Marathon',           city: 'Sydney',    country: 'AU', date: '2026-08-30', confirmed: true,  url: 'https://www.sydneymarathon.com/' },
  { ext: 'major-berlin',    name: 'BMW Berlin Marathon',       city: 'Berlin',    country: 'DE', date: '2026-09-27', confirmed: true,  url: 'https://www.bmw-berlin-marathon.com/' },
  { ext: 'major-chicago',   name: 'Bank of America Chicago Marathon', city: 'Chicago', country: 'US', date: '2026-10-11', confirmed: true, url: 'https://www.chicagomarathon.com/' },
  { ext: 'major-nyc',       name: 'TCS New York City Marathon', city: 'New York', country: 'US', date: '2026-11-01', confirmed: true,  url: 'https://www.nyrr.org/tcsnycmarathon' },

  // --- SuperHalfs (21k, mezze europee) ---
  { ext: 'superhalf-lisbon',     name: 'EDP Lisbon Half Marathon',   city: 'Lisbona',    country: 'PT', date: '2027-03-07', confirmed: false, url: 'https://www.superhalfs.com/en/events/lisbon/' },
  { ext: 'superhalf-prague',     name: 'Prague Half Marathon',       city: 'Praga',      country: 'CZ', date: '2027-03-27', confirmed: false, url: 'https://www.superhalfs.com/en/events/prague/' },
  { ext: 'superhalf-berlin',     name: 'Berlin Half Marathon',       city: 'Berlino',    country: 'DE', date: '2027-04-11', confirmed: false, url: 'https://www.superhalfs.com/en/events/berlin/' },
  { ext: 'superhalf-copenhagen', name: 'Copenhagen Half Marathon',   city: 'Copenaghen', country: 'DK', date: '2026-09-20', confirmed: true,  url: 'https://www.superhalfs.com/en/events/copenhagen/' },
  { ext: 'superhalf-cardiff',    name: 'Cardiff Half Marathon',      city: 'Cardiff',    country: 'GB', date: '2026-10-04', confirmed: true,  url: 'https://www.superhalfs.com/en/events/cardiff/' },
  { ext: 'superhalf-valencia',   name: 'Valencia Half Marathon',     city: 'Valencia',   country: 'ES', date: '2026-10-25', confirmed: true,  url: 'https://www.superhalfs.com/en/events/valencia/' },
]

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: all, error } = await supabase
    .from('races')
    .select('id, country, event_date, distances, source, external_ref')
  if (error) throw error

  const editByRef = new Map(
    (all || []).filter(r => r.source === 'editoriale' && r.external_ref).map(r => [r.external_ref, r.id])
  )

  let marked = 0, inserted = 0, updated = 0
  for (const r of CIRCUITS) {
    const dist = r.ext.startsWith('major') ? '42k' : '21k'
    const circuit = r.ext.startsWith('major') ? 'major' : 'superhalfs'

    // Dedup: gara già presente (es. importata da AIMS) con stessa data/paese/distanza
    const match = (all || []).find(
      x => x.country === r.country && x.event_date === r.date && (x.distances || []).includes(dist)
    )

    const fields = {
      name: r.name,
      city: r.city,
      country: r.country,
      event_date: r.date,
      distances: [dist],
      race_type: 'internazionale',
      official_url: r.url,
      circuit,
      featured: true,
      registration_status: 'da_verificare',
      status: 'published',
    }

    if (match) {
      const { error } = await supabase
        .from('races')
        .update({ circuit, featured: true, official_url: r.url, name: r.name, city: r.city })
        .eq('id', match.id)
      if (error) throw error
      marked++
    } else if (editByRef.has(r.ext)) {
      const { error } = await supabase.from('races').update(fields).eq('id', editByRef.get(r.ext))
      if (error) throw error
      updated++
    } else {
      const { error } = await supabase.from('races').insert({
        ...fields,
        slug: `${slugify(r.name)}-${r.date.slice(0, 4)}`,
        source: 'editoriale',
        external_ref: r.ext,
      })
      if (error) throw error
      inserted++
    }
  }

  console.log(`✓ Circuiti: ${inserted} inserite, ${updated} aggiornate, ${marked} marcate su gare esistenti (dedup).`)
}

main().catch(err => {
  console.error('Seed circuiti fallito:', err.message)
  process.exit(1)
})
