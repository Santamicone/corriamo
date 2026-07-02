import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guard'
import { formatDate } from '@/lib/utils'
import { HideButton } from './HideButton'

type Tab = 'runs' | 'momenti' | 'reviews'
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'runs', label: 'Corse', icon: 'directions_run' },
  { key: 'momenti', label: 'Momenti', icon: 'photo_camera' },
  { key: 'reviews', label: 'Recensioni', icon: 'star' },
]

function Row({ table, id, title, subtitle, hidden, reason, href }: {
  table: string; id: string; title: string; subtitle: string
  hidden: boolean; reason: string | null; href?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 ${hidden ? 'bg-red-50/40' : ''}`}>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {href ? <Link href={href} target="_blank" className="hover:underline">{title}</Link> : title}
          {hidden && <span className="ml-2 text-[11px] font-semibold text-red-600 align-middle">nascosto</span>}
        </p>
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        {hidden && reason && <p className="text-xs text-red-500 mt-0.5">Motivo: {reason}</p>}
      </div>
      <div className="flex-shrink-0"><HideButton table={table} id={id} hidden={hidden} /></div>
    </div>
  )
}

export default async function AdminContenutiPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase } = await requireAdmin()
  const tab = (((await searchParams).tab as Tab) ?? 'runs')

  let rows: React.ReactNode = null

  if (tab === 'runs') {
    const { data } = await supabase
      .from('runs').select('id, title, city, date, hidden_by_admin, hidden_reason')
      .order('created_at', { ascending: false }).limit(50)
    rows = (data ?? []).map(r => (
      <Row key={r.id} table="runs" id={r.id} title={r.title ?? '—'}
        subtitle={`${r.city ?? ''} · ${r.date ? formatDate(r.date) : ''}`}
        hidden={r.hidden_by_admin} reason={r.hidden_reason} href={`/corse/${r.id}`} />
    ))
  } else if (tab === 'momenti') {
    const { data } = await supabase
      .from('momenti').select('id, body, run_id, created_at, hidden_by_admin, hidden_reason')
      .order('created_at', { ascending: false }).limit(50)
    rows = (data ?? []).map(m => (
      <Row key={m.id} table="momenti" id={m.id} title={m.body?.slice(0, 60) || '(solo foto)'}
        subtitle={formatDate(m.created_at)} hidden={m.hidden_by_admin} reason={m.hidden_reason}
        href={`/corse/${m.run_id}`} />
    ))
  } else {
    const { data } = await supabase
      .from('reviews').select('id, body, rating, run_id, created_at, hidden_by_admin, hidden_reason')
      .order('created_at', { ascending: false }).limit(50)
    rows = (data ?? []).map(r => (
      <Row key={r.id} table="reviews" id={r.id} title={`${'★'.repeat(r.rating)} ${r.body?.slice(0, 60) ?? ''}`}
        subtitle={formatDate(r.created_at)} hidden={r.hidden_by_admin} reason={r.hidden_reason}
        href={`/corse/${r.run_id}`} />
    ))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Contenuti</h1>
      <p className="text-sm text-gray-500 mb-5">Nascondi contenuti inappropriati. L&apos;occultamento è reversibile e tracciato.</p>

      <div className="flex gap-1 mb-4">
        {TABS.map(t => (
          <Link key={t.key} href={`/admin/contenuti?tab=${t.key}`}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-white'}`}>
            <span className="material-symbols-outlined text-base">{t.icon}</span> {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {rows}
      </div>
    </div>
  )
}
