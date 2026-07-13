import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { countryLabel } from '@/components/RaceCard'
import { PageContainer } from '@/components/PageContainer'
import { ModeraActions } from './ModeraActions'
import type { Race } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

export default async function ModeraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) notFound()

  const { data } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  const pending = (data ?? []) as unknown as Race[]

  return (
    <PageContainer width="content" className="py-8 sm:py-12">
      <Link href="/calendario-gare" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Calendario gare
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <span className="material-symbols-outlined text-sm">shield_person</span>
          Moderazione
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Gare da approvare</h1>
        <p className="mt-2 text-base text-gray-500">
          {pending.length === 0 ? 'Nessuna segnalazione in attesa.' : `${pending.length} in attesa di verifica.`}
        </p>
        <Link href="/calendario-gare/duplicati"
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline mt-3">
          <span className="material-symbols-outlined text-base">content_copy</span>
          Rivedi i possibili doppioni
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {pending.map(race => {
          const country = countryLabel(race.country)
          return (
            <div key={race.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {race.distances.map(d => (
                    <span key={d} className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold">{DISTANCE_LABELS[d] ?? d}</span>
                  ))}
                </div>
                <h2 className="font-extrabold text-gray-900 leading-snug">{race.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {race.city} {country.flag} {country.name}{race.region ? ` (${race.region})` : ''} · <span className="capitalize">{formatDate(race.event_date)}</span>
                </p>
                {race.official_url && (
                  <a href={race.official_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1.5">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Sito ufficiale
                  </a>
                )}
              </div>
              <ModeraActions raceId={race.id} />
            </div>
          )
        })}
      </div>
    </PageContainer>
  )
}
