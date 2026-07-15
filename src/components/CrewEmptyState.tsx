import Link from 'next/link'

/**
 * Stato "colonna principale vuota" per una crew senza corse (nessuna in evidenza,
 * nessuna programmata, nessuna effettuata). Evita che la pagina appaia rotta:
 *  · owner/admin → invito ad organizzare la prima uscita, con CTA;
 *  · membro → rassicura che il coach pubblicherà presto;
 *  · visitatore esterno → spiega che non ci sono ancora uscite pubbliche.
 */
export function CrewEmptyState({
  canManage,
  isMember,
}: {
  canManage: boolean
  isMember: boolean
}) {
  const { icon, title, body, cta } = canManage
    ? {
        icon: 'rocket_launch',
        title: 'La crew è pronta a partire',
        body: 'Non c’è ancora nessuna uscita. Organizza la prima corsa: i membri la troveranno qui in evidenza e potranno confermare la presenza.',
        cta: { href: '/nuova-corsa', label: 'Crea la prima uscita' },
      }
    : isMember
      ? {
          icon: 'event_upcoming',
          title: 'Ancora nessuna uscita in programma',
          body: 'Appena verrà fissata la prossima corsa la vedrai qui in cima. Nel frattempo dai un’occhiata alla bacheca del gruppo.',
          cta: null,
        }
      : {
          icon: 'groups',
          title: 'Nessuna corsa pubblica in programma',
          body: 'Questa crew non ha ancora corse pubbliche. Torna a trovarci, oppure unisciti per seguire da vicino le prossime uscite.',
          cta: null,
        }

  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 shadow-sm text-center">
      <span className="inline-flex w-14 h-14 rounded-2xl bg-orange-50 items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">{icon}</span>
      </span>
      <h2 className="font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 mt-4 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-base">add</span>
          {cta.label}
        </Link>
      )}
    </div>
  )
}
