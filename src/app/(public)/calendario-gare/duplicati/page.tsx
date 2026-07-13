import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { countryLabel } from '@/components/RaceCard'
import { PageContainer } from '@/components/PageContainer'
import { DuplicatiActions } from './DuplicatiActions'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

const SOURCE_LABELS: Record<string, string> = {
  editoriale: 'Editoriale', utente: 'Utente', aims: 'AIMS',
  fidal: 'FIDAL', podisti: 'Podisti.Net',
}

/** Riga della vista public.race_duplicate_candidates (una coppia A/B). */
type DuplicateCandidate = {
  id_a: string; name_a: string; city_a: string; region_a: string | null
  country_a: string; date_a: string; distances_a: string[]; source_a: string; url_a: string | null
  id_b: string; name_b: string; city_b: string; region_b: string | null
  country_b: string; date_b: string; distances_b: string[]; source_b: string; url_b: string | null
  name_sim: number; days_apart: number
}

type RaceSide = {
  id: string; name: string; city: string; region: string | null
  country: string; date: string; distances: string[]; source: string; url: string | null
}

function RaceColumn({ race }: { race: RaceSide }) {
  const country = countryLabel(race.country)
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-semibold">
          {SOURCE_LABELS[race.source] ?? race.source}
        </span>
        {race.distances.map(d => (
          <span key={d} className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold">
            {DISTANCE_LABELS[d] ?? d}
          </span>
        ))}
      </div>
      <h3 className="font-bold text-gray-900 leading-snug">{race.name}</h3>
      <p className="text-sm text-gray-500 mt-0.5">
        {race.city} {country.flag} {country.name}{race.region ? ` (${race.region})` : ''} ·{' '}
        <span className="capitalize">{formatDate(race.date)}</span>
      </p>
      {race.url && (
        <a href={race.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1.5">
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          Sito ufficiale
        </a>
      )}
    </div>
  )
}

export default async function DuplicatiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) notFound()

  const { data, error } = await supabase
    .from('race_duplicate_candidates')
    .select('*')
    .limit(200)
  const pairs = (data ?? []) as unknown as DuplicateCandidate[]

  return (
    <PageContainer width="content" className="py-8 sm:py-12">
      <Link href="/calendario-gare/modera" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Moderazione
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <span className="material-symbols-outlined text-sm">content_copy</span>
          Possibili doppioni
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Gare duplicate</h1>
        <p className="mt-2 text-base text-gray-500">
          Coppie di gare simili (stesso paese, data entro 3 giorni, nome affine). Elimina
          quella da scartare o marca la coppia come «non è un doppione».
        </p>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
          Vista non disponibile. Esegui <code className="font-mono">supabase/races-dedup.sql</code> in
          Supabase per abilitare il rilevamento doppioni.
        </div>
      ) : pairs.length === 0 ? (
        <p className="text-gray-500">Nessun possibile doppione da rivedere. 🎉</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pairs.map(p => {
            const a: RaceSide = {
              id: p.id_a, name: p.name_a, city: p.city_a, region: p.region_a,
              country: p.country_a, date: p.date_a, distances: p.distances_a, source: p.source_a, url: p.url_a,
            }
            const b: RaceSide = {
              id: p.id_b, name: p.name_b, city: p.city_b, region: p.region_b,
              country: p.country_b, date: p.date_b, distances: p.distances_b, source: p.source_b, url: p.url_b,
            }
            return (
              <div key={`${p.id_a}-${p.id_b}`} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold text-gray-400">
                  <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">
                    somiglianza {Math.round(p.name_sim * 100)}%
                  </span>
                  <span>{p.days_apart === 0 ? 'stessa data' : `${p.days_apart} g di distanza`}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                  <RaceColumn race={a} />
                  <div className="hidden sm:block w-px self-stretch bg-gray-100" />
                  <RaceColumn race={b} />
                </div>
                <DuplicatiActions a={a} b={b} />
              </div>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
