import Link from 'next/link'
import { LEVEL_LABELS } from '@/lib/utils'
import {
  PROPOSAL_KINDS, formatDistanceRange, formatProposalDay, formatProposalPace, formatWindow, interestLabel,
  type RunProposal,
} from '@/lib/proposals'

/**
 * Card di una proposta (SQL #53). Volutamente diversa da RunCard: bordo tratteggiato, nessun
 * avatar né nome di persona, etichetta "Cerca organizzatore" sempre visibile (decisione D5).
 */
export function ProposalCard({ proposal: p }: { proposal: RunProposal }) {
  const kind = PROPOSAL_KINDS[p.kind]
  const distance = formatDistanceRange(p)
  const pace = formatProposalPace(p.pace_target)

  return (
    <Link href={`/proposte/${p.id}`}
      className="group flex flex-col gap-3 rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-5 hover:border-primary hover:bg-orange-50 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
          <span className="material-symbols-outlined text-sm">person_search</span>
          Cerca organizzatore
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-gray-500">
          <span className="material-symbols-outlined text-sm">{kind?.icon ?? 'directions_run'}</span>
          {kind?.label}
        </span>
      </div>

      <div>
        <h3 className="text-base font-extrabold text-gray-900 group-hover:text-primary transition-colors">{p.title}</h3>
        <p className="text-sm text-gray-600 mt-0.5 first-letter:uppercase">
          {formatProposalDay(p.target_date)} · {formatWindow(p)}
        </p>
        <p className="text-sm text-gray-500">{p.city}{p.zone ? ` · ${p.zone}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {distance && <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-600">{distance}</span>}
        {pace && <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-600">{pace}</span>}
        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 font-semibold text-gray-600">
          {LEVEL_LABELS[p.level] ?? p.level}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-orange-100">
        <span className={`text-xs font-semibold ${p.interest_count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
          {p.i_am_interested ? 'Ti interessa · ' : ''}{interestLabel(p.interest_count)}
        </span>
        <span className="text-xs font-bold text-primary">La organizzi tu? →</span>
      </div>
    </Link>
  )
}

/** Sezione "Cercano un organizzatore" per la bacheca. */
export function ProposalsSection({ proposals, city }: { proposals: RunProposal[]; city?: string }) {
  if (proposals.length === 0) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-primary text-xl">person_search</span>
        <h2 className="text-base font-extrabold text-gray-800">
          Cercano un organizzatore{city ? ` a ${city}` : ''}
        </h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 max-w-2xl">
        Proposte di Vieni a correre, non ancora organizzate da nessuno. Dì se ti interessano, oppure
        organizzale tu: scegli il ritrovo e chi era interessato viene avvisato.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {proposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
      </div>
    </section>
  )
}
