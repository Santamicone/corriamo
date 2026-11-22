import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import Link from 'next/link'
import { CREW_TYPE_LABELS, type Crew } from '@/lib/types'
import { fetchMyCrewMemberships, fetchCrewActivity } from '@/lib/crews'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Crew — gruppi di runner',
  description: 'Scopri le crew di runner vicino a te, o gestisci le tue.',
  alternates: { canonical: 'https://app.vieniacorrere.it/crew' },
}

interface SearchParams {
  tab?:  string
  q?:    string
  city?: string
}

function buildUrl(base: SearchParams, extra: Partial<SearchParams>): string {
  const merged = { ...base, ...extra }
  const p = new URLSearchParams()
  Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
  return `/crew?${p.toString()}`
}

type DiscoverCrew = Crew & { is_active: boolean; next_event: { date: string; title: string } | null }

export default async function CrewHubPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const tab = params.tab === 'mie' ? 'mie' : 'scopri'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let discoverCrews: DiscoverCrew[] = []
  let myCrews: Awaited<ReturnType<typeof fetchMyCrewMemberships>> = []

  if (tab === 'scopri') {
    let query = supabase
      .from('crews')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
    if (params.q)    query = query.ilike('name', `%${params.q}%`)
    if (params.city) query = query.or(`city.ilike.%${params.city}%,zone.ilike.%${params.city}%`)
    const { data: crews } = await query
    const crewIds = (crews ?? []).map(c => c.id)
    const { activeIds, nextEventByCrewId } = await fetchCrewActivity(supabase, crewIds)

    discoverCrews = (crews ?? []).map(c => ({
      ...c,
      is_active: activeIds.has(c.id),
      next_event: nextEventByCrewId.get(c.id) ?? null,
    })) as DiscoverCrew[]
  } else if (user) {
    myCrews = await fetchMyCrewMemberships(supabase, user.id)
  }

  const hasFilters = !!(params.q || params.city)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="wide" className="py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Crew</h1>
                <p className="mt-2 text-lg text-gray-500">
                  Gruppi stabili di runner: allenamenti fissi, corse riservate, coordinamento facile.
                </p>
              </div>
              <Link href="/crew/nuova"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 shrink-0">
                <span className="material-symbols-outlined text-lg">add</span>
                Crea una crew
              </Link>
            </div>
          </PageContainer>
        </div>

        <PageContainer width="wide" className="py-8 flex flex-col gap-6">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full w-fit">
            {[
              { value: 'scopri', label: 'Scopri',   icon: 'travel_explore' },
              { value: 'mie',    label: 'Le mie',    icon: 'group' },
            ].map(t => (
              <Link
                key={t.value}
                href={buildUrl({}, { tab: t.value })}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </Link>
            ))}
            <Link
              href="/crew/mappa"
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
            >
              <span className="material-symbols-outlined text-base">map</span>
              Mappa
            </Link>
          </div>

          {tab === 'scopri' ? (
            <>
              {/* Ricerca */}
              <form method="GET" action="/crew" className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <input type="hidden" name="tab" value="scopri" />
                <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerca</label>
                  <input name="q" defaultValue={params.q} placeholder="Nome crew..."
                    className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="flex flex-col gap-1.5 min-w-[120px] flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Città o zona</label>
                  <input name="city" defaultValue={params.city} placeholder="es. Milano"
                    className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <button type="submit"
                  className="h-10 px-5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                  Filtra
                </button>
                {hasFilters && (
                  <a href="/crew?tab=scopri"
                    className="h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">close</span>
                    Rimuovi
                  </a>
                )}
              </form>

              {discoverCrews.length === 0 ? (
                <EmptyState hasFilters={hasFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {discoverCrews.map(c => <DiscoverCrewCard key={c.id} crew={c} />)}
                </div>
              )}
            </>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Accedi per vedere le tue crew</p>
              <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors">
                Accedi
              </Link>
            </div>
          ) : myCrews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-gray-300">group_add</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-lg font-bold text-gray-900">Non fai ancora parte di nessuna crew</p>
                <p className="text-sm text-gray-500 max-w-xs">Scoprine una vicino a te, oppure crea la tua.</p>
              </div>
              <div className="flex gap-3">
                <Link href="/crew?tab=scopri" className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Scopri le crew
                </Link>
                <Link href="/crew/nuova" className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors">
                  Crea una crew
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myCrews.map(m => (
                <Link key={m.crew_id} href={`/crew/${m.crew_id}`}
                  className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">group</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{m.crew!.name}</p>
                    <p className="text-xs text-gray-400">
                      {m.role === 'owner' ? CREW_TYPE_LABELS[m.crew!.crew_type].ownerLabel : CREW_TYPE_LABELS[m.crew!.crew_type].name}
                      {m.crew!.city ? ` · ${m.crew!.city}` : ''}
                    </p>
                  </div>
                  {m.role === 'owner' && (
                    <span className="shrink-0 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1">
                      Gestisci
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}

function DiscoverCrewCard({ crew }: { crew: DiscoverCrew }) {
  return (
    <Link href={`/crew/${crew.id}`}
      className="flex flex-col gap-3 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">group</span>
        </div>
        {crew.is_active && (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[11px] font-bold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Attiva
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 truncate">{crew.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {CREW_TYPE_LABELS[crew.crew_type].name}
          {crew.city ? ` · ${crew.city}${crew.zone ? ` (${crew.zone})` : ''}` : ''}
        </p>
      </div>
      {crew.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{crew.description}</p>
      )}
      {crew.next_event && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-50">
          <span className="material-symbols-outlined text-sm text-primary">event</span>
          {crew.next_event.title} · {formatDate(crew.next_event.date)}
        </p>
      )}
    </Link>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-gray-300">group</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-bold text-gray-900">{hasFilters ? 'Nessuna crew trovata' : 'Ancora nessuna crew pubblica'}</p>
        <p className="text-sm text-gray-500 max-w-xs">
          {hasFilters ? 'Prova a cambiare i filtri.' : 'Sii il primo a crearne una nella tua città.'}
        </p>
      </div>
      <Link href="/crew/nuova" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors">
        <span className="material-symbols-outlined text-lg">add</span>
        Crea una crew
      </Link>
    </div>
  )
}
