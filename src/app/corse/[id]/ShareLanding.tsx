import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, LEVEL_LABELS, formatPaceTarget } from '@/lib/utils'
import { TagBadge } from '@/components/ui/TagBadge'
import type { Run } from '@/lib/types'

const LEVEL_COLORS: Record<string, string> = {
  tutti:        'bg-gray-100 text-gray-700',
  principiante: 'bg-green-100 text-green-700',
  intermedio:   'bg-blue-100 text-blue-700',
  avanzato:     'bg-orange-100 text-orange-700',
}

interface Props {
  run: Run & { tags?: string[] }
  approvedCount: number
}

export function ShareLanding({ run, approvedCount }: Props) {
  const isPast = new Date(`${run.date}T${run.time}`) < new Date()
  const levelColor = LEVEL_COLORS[run.level] ?? LEVEL_COLORS.tutti

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex flex-col">

      {/* Minimal header */}
      <header className="px-6 pt-6 pb-4 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-lg">directions_run</span>
          </div>
          <span className="text-base font-extrabold text-gray-900 tracking-tight">Vieni a correre?</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-10 pt-6">
        <div className="w-full max-w-lg flex flex-col gap-5">

          {/* Run card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-orange-100/40 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />
            <div className="p-6 flex flex-col gap-4">

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${levelColor}`}>
                  {LEVEL_LABELS[run.level]}
                </span>
                {run.is_no_drop && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="material-symbols-filled text-sm">favorite</span>No drop
                  </span>
                )}
                {approvedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    <span className="material-symbols-outlined text-sm">group</span>
                    {approvedCount} {approvedCount === 1 ? 'runner iscritto' : 'runner iscritti'}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{run.title}</h1>

              {/* Description */}
              {run.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{run.description}</p>
              )}

              {/* Data grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'calendar_today', label: 'Data',     value: formatDate(run.date) },
                  { icon: 'schedule',       label: 'Orario',   value: run.time.slice(0, 5) },
                  { icon: 'place',          label: 'Luogo',    value: `${run.location}, ${run.city}` },
                  { icon: 'route',          label: 'Distanza', value: run.distance_km ? `${run.distance_km} km` : 'Libera' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
                    <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800 leading-tight mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {run.pace_target && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                  <span className="material-symbols-outlined text-primary text-base">speed</span>
                  <span className="text-sm font-semibold text-orange-800">Ritmo: {formatPaceTarget(run.pace_target)}</span>
                </div>
              )}

              {/* Tags */}
              {run.tags && run.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {run.tags.map(id => <TagBadge key={id} tagId={id} size="sm" />)}
                </div>
              )}

              {/* Organizer */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <Avatar name={run.organizer.full_name} src={run.organizer.avatar_url} size="sm" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{run.organizer.full_name}</p>
                  {run.organizer.city && <p className="text-xs text-gray-400">{run.organizer.city}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* CTA block */}
          {!isPast ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/registrati`}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-lg shadow-orange-200/60"
              >
                <span className="material-symbols-outlined text-xl">directions_run</span>
                Iscriviti per partecipare
              </Link>
              <Link
                href={`/login`}
                className="w-full text-center text-sm text-gray-500 hover:text-primary transition-colors py-2"
              >
                Hai già un account? <span className="font-semibold text-primary">Accedi</span>
              </Link>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-gray-500">Questa corsa è già avvenuta.</p>
              <Link href="/bacheca" className="text-sm text-primary font-semibold hover:underline mt-1 block">
                Scopri le prossime corse →
              </Link>
            </div>
          )}

          {/* App promo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-2 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Cos'è Vieni a correre?</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Il modo più semplice per trovare compagni di corsa nella tua città.
              Corse singole, serie ricorrenti, nessuna classifica.
            </p>
            <Link href="/" className="text-sm font-semibold text-primary hover:underline mt-1">
              Scopri come funziona →
            </Link>
          </div>

        </div>
      </main>

      {/* Minimal footer */}
      <footer className="text-center pb-6 pt-2">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Vieni a correre? — Corri in compagnia.</p>
      </footer>
    </div>
  )
}
