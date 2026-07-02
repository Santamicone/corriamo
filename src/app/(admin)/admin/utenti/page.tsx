import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guard'
import { MODERATION_BADGE } from './status'

export default async function AdminUtentiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireAdmin()
  const q = (await searchParams).q?.trim() ?? ''

  let query = supabase
    .from('profiles')
    .select('id, full_name, city, moderation_status, warned_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (q) query = query.ilike('full_name', `%${q}%`)
  const { data: users } = await query

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
          return (
            <Link key={u.id} href={`/admin/utenti/${u.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{u.full_name ?? '—'}</p>
                <p className="text-xs text-gray-400 truncate">{u.city ?? 'Città non indicata'}</p>
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
    </div>
  )
}
