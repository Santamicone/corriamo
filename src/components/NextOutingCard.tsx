import Link from 'next/link'
import { Avatar } from './ui/Avatar'

export type NextOutingRun = {
  id: string
  title: string
  date: string
  time: string
  city: string | null
  location: string | null
  distance_km: number | null
  run_visibility: string | null
}

export type NextOutingParticipant = {
  id: string
  full_name: string
  avatar_url: string | null
}

/**
 * Blocco "Prossima uscita" in evidenza in cima alla colonna principale della crew.
 * Dà una risposta immediata alla domanda "quando corriamo di nuovo insieme?" e
 * mostra gli avatar di chi ha già confermato la presenza — il driver principale
 * del ritorno quotidiano sulla pagina. Lo spazio a destra dell'header è riservato
 * al bottone "Ci sono" (Step 3).
 */
export function NextOutingCard({
  run,
  participants,
  approvedCount,
  action,
}: {
  run: NextOutingRun
  participants: NextOutingParticipant[]
  approvedCount: number
  /** Slot azione (es. bottone "Ci sono") renderizzato nell'header. */
  action?: React.ReactNode
}) {
  const dateLabel = new Date(run.date).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const isCrewOnly = run.run_visibility === 'crew_only'
  const extra = Math.max(0, approvedCount - participants.length)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Accent gradient top — segnala l'elemento più importante della pagina */}
      <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] to-orange-400" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
              <span className="material-symbols-outlined text-base">event_upcoming</span>
              Prossima uscita
              {isCrewOnly && (
                <span className="inline-flex items-center gap-1 text-gray-400 font-medium normal-case tracking-normal">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  riservata
                </span>
              )}
            </span>
            <Link
              href={`/corse/${run.id}`}
              className="block text-lg font-extrabold text-gray-900 hover:text-[var(--color-primary)] transition-colors leading-snug mt-1"
            >
              {run.title}
            </Link>
          </div>
          {action}
        </div>

        {/* Data / ora / luogo / distanza */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-gray-600">
          <span className="flex items-center gap-1.5 capitalize">
            <span className="material-symbols-outlined text-base text-gray-400">calendar_month</span>
            {dateLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-gray-400">schedule</span>
            {run.time?.slice(0, 5)}
          </span>
          {(run.location || run.city) && (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-base text-gray-400">place</span>
              <span className="truncate">{run.location || run.city}</span>
            </span>
          )}
          {run.distance_km != null && (
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-gray-400">route</span>
              {run.distance_km} km
            </span>
          )}
        </div>

        {/* Chi ha già confermato */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          {approvedCount > 0 ? (
            <>
              <div className="flex -space-x-2">
                {participants.map((p) => (
                  <div key={p.id} className="ring-2 ring-white rounded-full">
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                  </div>
                ))}
                {extra > 0 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[11px] font-bold text-gray-500">
                    +{extra}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {approvedCount === 1 ? '1 runner ci sarà' : `${approvedCount} runner ci saranno`}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">
              Nessuno ha ancora confermato — potresti essere il primo.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
