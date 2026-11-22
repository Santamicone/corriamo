import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { CrewRowActions } from './CrewRowActions'

type Filter = 'tutte' | 'informative' | 'gestite' | 'nascoste'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'informative', label: 'Informative' },
  { value: 'gestite', label: 'Gestite' },
  { value: 'nascoste', label: 'Nascoste / in attesa' },
]

type Row = {
  id: string; slug: string | null; name: string; city: string | null; zone: string | null
  owner_id: string | null; source: string; trust_level: string; moderation_status: string
  activity_status: string; show_on_map: boolean; created_at: string
}

export default async function AdminCrewPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  // Livello base (is_admin): la gestione delle schede non richiede l'AAL2, come l'import del calendario gare
  await getAdminContext()
  const { f } = await searchParams
  const filter: Filter = FILTERS.some(x => x.value === f) ? (f as Filter) : 'tutte'

  // Service-role: le schede nascoste o in attesa non sono leggibili con la RLS normale
  const svc = createServiceRoleClient()
  let query = svc
    .from('crews')
    .select('id, slug, name, city, zone, owner_id, source, trust_level, moderation_status, activity_status, show_on_map, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (filter === 'informative') query = query.is('owner_id', null)
  if (filter === 'gestite') query = query.not('owner_id', 'is', null)
  if (filter === 'nascoste') query = query.neq('moderation_status', 'published')

  const { data, error } = await query
  const rows = (data ?? []) as Row[]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Crew</h1>
          <p className="text-sm text-gray-500">
            Le schede informative sono crew senza proprietario, inserite da te: compaiono sulla mappa finché nessuno le rivendica.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crew/nuova"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            <span className="material-symbols-outlined text-base">add</span> Nuova crew
          </Link>
          <Link href="/admin/crew/importa"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <span className="material-symbols-outlined text-base">upload_file</span> Importa
          </Link>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-full w-fit mb-5">
        {FILTERS.map(x => (
          <Link key={x.value} href={`/admin/crew?f=${x.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === x.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {x.label}
          </Link>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3 mb-4">
          Non riesco a leggere le crew: {error.message}. Controlla che lo SQL #50 sia applicato.
        </p>
      )}

      {rows.length === 0 && !error ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6">Nessuna crew in questo elenco.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(c => {
            const informative = c.owner_id === null
            const hidden = c.moderation_status !== 'published'
            const inactive = c.activity_status === 'inactive'
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      informative ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                      {informative ? 'Informativa' : 'Gestita'}
                    </span>
                    {c.trust_level === 'verified' && (
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-semibold">Verificata</span>
                    )}
                    {c.source === 'editoriale' && (
                      <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold">Admin</span>
                    )}
                    {hidden && (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-semibold">{c.moderation_status}</span>
                    )}
                    {inactive && (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">Non più attiva</span>
                    )}
                    {c.show_on_map && (
                      <span className="rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-[11px] font-semibold">In mappa</span>
                    )}
                  </div>
                  <Link href={`/crew/${c.slug ?? c.id}`} className="font-extrabold text-gray-900 hover:underline">{c.name}</Link>
                  <p className="text-sm text-gray-500">{c.city ?? '—'}{c.zone ? ` (${c.zone})` : ''}</p>
                </div>
                <CrewRowActions id={c.id} hidden={hidden} inactive={inactive} editable={informative} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
