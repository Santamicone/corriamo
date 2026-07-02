import { requireAdmin } from '@/lib/admin/guard'
import { ModeraActions } from '@/app/(public)/calendario-gare/modera/ModeraActions'
import { countryLabel } from '@/components/RaceCard'
import { formatDate } from '@/lib/utils'
import type { Race } from '@/lib/types'

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

export default async function AdminGarePage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('races').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  const pending = (data ?? []) as unknown as Race[]

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Gare da approvare</h1>
      <p className="text-sm text-gray-500 mb-6">
        {pending.length === 0 ? 'Nessuna segnalazione in attesa.' : `${pending.length} in attesa di verifica.`}
      </p>

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
    </div>
  )
}
