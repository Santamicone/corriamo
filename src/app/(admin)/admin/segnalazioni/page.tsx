import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guard'
import { formatDate } from '@/lib/utils'
import type { Report } from '@/lib/types'
import { ReportActions } from './ReportActions'

const STATUS_TABS = [
  { key: 'open', label: 'Aperte' },
  { key: 'reviewing', label: 'In lavorazione' },
  { key: 'resolved', label: 'Risolte' },
  { key: 'dismissed', label: 'Ignorate' },
] as const

const ENTITY_LABEL: Record<string, string> = {
  runs: 'Corsa', momenti: 'Momento', reviews: 'Recensione',
  run_chat: 'Messaggio chat', profiles: 'Profilo',
}

function entityHref(table: string, id: string): string | null {
  if (table === 'runs') return `/corse/${id}`
  if (table === 'profiles') return `/profilo/${id}`
  return null
}

export default async function AdminSegnalazioniPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireAdmin()
  const status = (await searchParams).status ?? 'open'

  const { data: raw } = await supabase
    .from('reports').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100)
  const reports = (raw ?? []) as unknown as Report[]

  // Nomi di segnalanti e segnalati in un'unica query
  const ids = [...new Set(reports.flatMap(r => [r.reporter_id, r.reported_user_id]).filter(Boolean) as string[])]
  const names = new Map<string, string>()
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids)
    for (const p of profs ?? []) names.set(p.id, p.full_name ?? '—')
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Segnalazioni</h1>
      <p className="text-sm text-gray-500 mb-5">Report inviati dagli utenti su contenuti o persone.</p>

      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map(t => (
          <Link key={t.key} href={`/admin/segnalazioni?status=${t.key}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              status === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-white'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {reports.map(r => {
          const href = entityHref(r.entity_table, r.entity_id)
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {ENTITY_LABEL[r.entity_table] ?? r.entity_table}
                  </span>
                  {href && <Link href={href} target="_blank" className="text-xs text-indigo-600 hover:underline">apri ↗</Link>}
                  <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                </div>
                <p className="text-sm text-gray-800">{r.reason}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Segnalato da <span className="font-medium">{names.get(r.reporter_id) ?? '—'}</span>
                  {r.reported_user_id && <> · su <Link href={`/admin/utenti/${r.reported_user_id}`} className="text-indigo-600 hover:underline">{names.get(r.reported_user_id) ?? 'utente'}</Link></>}
                </p>
                {r.resolution_note && <p className="text-xs text-gray-400 mt-1">Nota: {r.resolution_note}</p>}
              </div>
              {(status === 'open' || status === 'reviewing') && <ReportActions id={r.id} status={r.status} />}
            </div>
          )
        })}
        {reports.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nessuna segnalazione in questo stato.
          </p>
        )}
      </div>
    </div>
  )
}
