import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  PROPOSAL_KINDS, formatDistanceRange, formatProposalDay, formatWindow,
  type ProposalKind, type ProposalStatus,
} from '@/lib/proposals'
import { WithdrawProposalButton } from './WithdrawProposalButton'

type Filter = 'aperte' | 'tutte'

const STATUS_BADGE: Record<ProposalStatus, string> = {
  aperta:   'bg-orange-100 text-orange-700',
  adottata: 'bg-green-100 text-green-700',
  scaduta:  'bg-gray-100 text-gray-500',
  ritirata: 'bg-red-100 text-red-700',
}

type Row = {
  id: string; kind: ProposalKind; title: string; city: string; zone: string | null
  target_date: string; time_from: string; time_to: string
  distance_min_km: number | null; distance_max_km: number | null
  status: ProposalStatus; expires_at: string; adopted_run_id: string | null; adopted_at: string | null
  created_at: string
  proposal_interests: { count: number }[]
}

export default async function AdminPropostePage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await getAdminContext()
  const { f } = await searchParams
  const filter: Filter = f === 'tutte' ? 'tutte' : 'aperte'

  // Service-role: il conteggio degli interessati legge proposal_interests, privata per RLS
  const svc = createServiceRoleClient()
  let query = svc
    .from('run_proposals')
    .select('id, kind, title, city, zone, target_date, time_from, time_to, distance_min_km, distance_max_km, status, expires_at, adopted_run_id, adopted_at, created_at, proposal_interests(count)')
    .order('target_date', { ascending: filter === 'aperte' })
    .limit(300)
  if (filter === 'aperte') query = query.eq('status', 'aperta').gt('expires_at', new Date().toISOString())
  const { data, error } = await query
  const rows = (data ?? []) as unknown as Row[]

  // Riepilogo: tasso di adozione sulle proposte chiuse (adottate / adottate + scadute)
  const { data: closed } = await svc.from('run_proposals').select('status').in('status', ['adottata', 'scaduta'])
  const adopted = (closed ?? []).filter(r => r.status === 'adottata').length
  const total = (closed ?? []).length

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Proposte di corsa</h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Corse senza organizzatore, marcate come proposte del servizio. Chi la adotta pubblica una corsa vera e gli interessati vengono avvisati.
            Le proposte scadono da sole dopo 7 giorni o il giorno prima della data.
          </p>
          {total > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Adottate {adopted} su {total} chiuse ({Math.round((adopted / total) * 100)}%).
            </p>
          )}
        </div>
        <Link href="/admin/proposte/nuova"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <span className="material-symbols-outlined text-base">add</span> Nuova proposta
        </Link>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-full w-fit mb-5">
        {(['aperte', 'tutte'] as const).map(x => (
          <Link key={x} href={`/admin/proposte?f=${x}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === x ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {x === 'aperte' ? 'Aperte' : 'Tutte'}
          </Link>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3 mb-4">
          Non riesco a leggere le proposte: {error.message}. Controlla che lo SQL #53 sia applicato.
        </p>
      )}

      {rows.length === 0 && !error ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6">Nessuna proposta in questo elenco.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(p => {
            const kind = PROPOSAL_KINDS[p.kind]
            const interested = p.proposal_interests?.[0]?.count ?? 0
            const expired = p.status === 'aperta' && new Date(p.expires_at) <= new Date()
            const status: ProposalStatus = expired ? 'scaduta' : p.status
            const distance = formatDistanceRange(p)
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status]}`}>{status}</span>
                    <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-semibold">{kind?.label ?? p.kind}</span>
                    <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[11px] font-semibold">
                      {interested} interessat{interested === 1 ? 'o' : 'i'}
                    </span>
                  </div>
                  <Link href={`/proposte/${p.id}`} className="font-extrabold text-gray-900 hover:underline">{p.title}</Link>
                  <p className="text-sm text-gray-500">
                    {p.city}{p.zone ? ` (${p.zone})` : ''} · {formatProposalDay(p.target_date)}, {formatWindow(p)}
                    {distance ? ` · ${distance}` : ''}
                  </p>
                  {p.adopted_run_id && (
                    <Link href={`/corse/${p.adopted_run_id}`} className="text-xs font-semibold text-green-700 hover:underline">
                      Vai alla corsa nata dalla proposta →
                    </Link>
                  )}
                </div>
                {status === 'aperta' && <WithdrawProposalButton id={p.id} title={p.title} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
