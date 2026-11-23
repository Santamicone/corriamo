import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { MODERATION_BADGE } from './status'

const PAGE_SIZE = 20

export default async function AdminUtentiPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('profiles')
    .select('id, full_name, city, moderation_status, warned_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (q) query = query.ilike('full_name', `%${q}%`)
  const { data: users, count } = await query

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Email (auth.users) e n. corse inserite: servono il service-role, solo per gli utenti della pagina
  const svc = createServiceRoleClient()
  const extra = new Map<string, { email: string; runs: number }>()
  await Promise.all((users ?? []).map(async u => {
    const [{ data: authUser }, { count: runs }] = await Promise.all([
      svc.auth.admin.getUserById(u.id),
      svc.from('runs').select('id', { count: 'exact', head: true }).eq('organizer_id', u.id),
    ])
    extra.set(u.id, { email: authUser?.user?.email ?? '', runs: runs ?? 0 })
  }))

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return `/admin/utenti${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Utenti</h1>
      <p className="text-sm text-gray-500 mb-5">Ricerca per nome. Clic su un utente per moderare o inviare un messaggio.</p>

      <form className="mb-5">
        <input name="q" defaultValue={q} placeholder="Cerca per nome…"
          className="w-full sm:w-80 border border-gray-300 rounded-full px-4 py-2 text-sm" />
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {(users ?? []).map(u => {
          const badge = MODERATION_BADGE[u.moderation_status as keyof typeof MODERATION_BADGE] ?? MODERATION_BADGE.active
          const info = extra.get(u.id)
          return (
            <Link key={u.id} href={`/admin/utenti/${u.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{u.full_name ?? '—'}</p>
                <p className="text-xs text-gray-500 truncate">{info?.email || 'Email non disponibile'}</p>
                <p className="text-xs text-gray-400 truncate">
                  {u.city ?? 'Città non indicata'} · iscritto il {formatDate(u.created_at)} ·{' '}
                  {info?.runs ?? 0} {info?.runs === 1 ? 'corsa inserita' : 'corse inserite'}
                </p>
              </div>
              <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}{u.moderation_status === 'warned' && u.warned_count ? ` ·${u.warned_count}` : ''}
              </span>
            </Link>
          )
        })}
        {(!users || users.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Nessun utente trovato.</p>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between gap-3 mt-4 text-sm">
          <p className="text-gray-500">
            {from + 1}–{Math.min(from + PAGE_SIZE, total)} di {total} utenti
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)}
                className="px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-white font-semibold">
                ← Precedente
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-300 font-semibold">← Precedente</span>
            )}
            <span className="text-gray-500">Pagina {page} di {totalPages}</span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)}
                className="px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-white font-semibold">
                Successiva →
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-300 font-semibold">Successiva →</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
