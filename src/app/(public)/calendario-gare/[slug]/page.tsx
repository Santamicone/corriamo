import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { countryLabel } from '@/components/RaceCard'
import { Avatar } from '@/components/ui/Avatar'
import { PageContainer } from '@/components/PageContainer'
import type { Race } from '@/lib/types'
import { formatDate, todayItaly } from '@/lib/utils'

const LOOKING_FOR_LABELS: Record<string, string> = {
  pacer: 'pacer', compagno: 'compagno', supporter: 'supporter',
}

interface CommunityPost {
  id: string
  looking_for: string[] | null
  organizer: { full_name: string; avatar_url: string | null } | null
}

async function getCommunityPosts(raceId: string): Promise<CommunityPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('runs')
    .select('id, looking_for, organizer:profiles!runs_organizer_id_fkey(full_name, avatar_url)')
    .eq('race_id', raceId)
    .eq('type', 'gara')
    .eq('status', 'aperta')
    .gte('date', todayItaly())
    .order('date', { ascending: true })
  return (data ?? []) as unknown as CommunityPost[]
}

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza maratona', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

const REGISTRATION_LABELS: Record<string, { label: string; className: string }> = {
  aperte:        { label: 'Iscrizioni aperte',   className: 'bg-green-50 text-green-700 border-green-200' },
  chiuse:        { label: 'Iscrizioni chiuse',    className: 'bg-red-50 text-red-700 border-red-200' },
  da_verificare: { label: 'Iscrizioni da verificare', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

async function getRace(slug: string): Promise<Race | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('races')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return (data as Race | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const race = await getRace(slug)
  if (!race) return { title: 'Gara non trovata' }
  const country = countryLabel(race.country)
  const title = `${race.name} — ${race.city}, ${country.name}`
  return {
    title,
    description: `${race.name}: ${formatDate(race.event_date)} a ${race.city} (${country.name}). Distanze, dettagli e link ufficiale.`,
    alternates: { canonical: `https://app.vieniacorrere.it/calendario-gare/${slug}` },
    openGraph: { title, url: `https://app.vieniacorrere.it/calendario-gare/${slug}` },
  }
}

export default async function RaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const race = await getRace(slug)
  if (!race) notFound()

  const posts = await getCommunityPosts(race.id)
  const country = countryLabel(race.country)
  const reg = REGISTRATION_LABELS[race.registration_status] ?? REGISTRATION_LABELS.da_verificare

  // JSON-LD schema.org Event (SEO Sprint 2)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    startDate: race.event_date,
    ...(race.end_date ? { endDate: race.end_date } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: race.city,
      address: { '@type': 'PostalAddress', addressLocality: race.city, addressCountry: race.country },
    },
    ...(race.official_url ? { url: race.official_url } : {}),
  }

  return (
    <PageContainer width="content" className="py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <Link href="/calendario-gare" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Calendario gare
      </Link>

      {/* Intestazione */}
      <div className="flex flex-wrap gap-2 mb-3">
        {race.distances.map(d => (
          <span key={d} className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-sm font-semibold">
            {DISTANCE_LABELS[d] ?? d}
          </span>
        ))}
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${reg.className}`}>
          {reg.label}
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">{race.name}</h1>
      <p className="mt-3 text-lg text-gray-500 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">place</span>
        {race.city} · {country.flag} {country.name}
        {race.region && <span className="text-gray-400">({race.region})</span>}
      </p>
      <p className="mt-1 text-lg text-gray-500 flex items-center gap-2 capitalize">
        <span className="material-symbols-outlined text-indigo-500">event</span>
        {formatDate(race.event_date)}
      </p>

      {/* Dettagli */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
        <DetailPill icon="straighten" label="Distanze"
          value={race.distances.map(d => DISTANCE_LABELS[d] ?? d).join(', ')} />
        <DetailPill icon="category" label="Tipo" value={race.race_type.replace('_', ' ')} />
        {race.elevation_m != null && (
          <DetailPill icon="terrain" label="Dislivello" value={`${race.elevation_m} m`} />
        )}
        {race.participants_est != null && (
          <DetailPill icon="groups" label="Partecipanti" value={`~${race.participants_est.toLocaleString('it')}`} />
        )}
        {race.level_hint && (
          <DetailPill icon="fitness_center" label="Livello" value={race.level_hint.replace('_', ' ')} />
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {race.official_url && (
          <a href={race.official_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3.5 rounded-full hover:bg-indigo-700 transition-colors">
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            Dettagli e iscrizione
          </a>
        )}
        {race.gpx_path && (
          <Link href="/tools/strategia-gara"
            className="inline-flex items-center justify-center gap-2 border border-indigo-200 text-indigo-700 font-semibold px-6 py-3.5 rounded-full hover:bg-indigo-50 transition-colors">
            <span className="material-symbols-outlined text-lg">route</span>
            Studia il percorso
          </Link>
        )}
      </div>

      {/* Community — Chi ci va? */}
      <div className="mt-10 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">group</span>
          <p className="font-bold text-gray-900">
            {posts.length > 0
              ? `${posts.length} runner cerca${posts.length === 1 ? '' : 'no'} compagni per questa gara`
              : 'Ci vai anche tu?'}
          </p>
        </div>

        {posts.length > 0 && (
          <div className="flex flex-col gap-2">
            {posts.map(p => {
              const lf = (p.looking_for ?? []).map(k => LOOKING_FOR_LABELS[k] ?? k).join(', ')
              return (
                <Link key={p.id} href={`/gare/${p.id}`}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-indigo-100 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                  <Avatar name={p.organizer?.full_name ?? '—'} src={p.organizer?.avatar_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.organizer?.full_name ?? 'Runner'}</p>
                    {lf && <p className="text-xs text-gray-500">Cerca {lf}</p>}
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-indigo-500 transition-colors">arrow_forward</span>
                </Link>
              )
            })}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Cerchi un pacer, un compagno o un supporter? Pubblica il tuo annuncio con i dati già compilati.
        </p>
        <Link href={`/nuova-gara?race=${race.slug}`}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-3 rounded-full hover:bg-indigo-700 transition-colors self-start">
          <span className="material-symbols-outlined text-lg">group_add</span>
          Cerca compagni per questa gara
        </Link>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Dati indicativi, verifica sempre su fonte ufficiale. Iscrizioni e dettagli sul sito dell&apos;organizzatore.
      </p>
    </PageContainer>
  )
}

function DetailPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 rounded-2xl py-3 px-3.5">
      <span className="material-symbols-outlined text-indigo-500 text-lg">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-sm font-bold text-gray-800 capitalize leading-tight">{value}</span>
    </div>
  )
}
