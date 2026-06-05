import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RunCard } from '@/components/RunCard'
import { SeriesCard } from '@/components/SeriesCard'
import Link from 'next/link'
import type { Run, Series } from '@/lib/types'

interface SearchParams {
  tab?: string
  city?: string
  level?: string
  q?: string
}

export default async function BachecaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const tab = params.tab ?? 'corse'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let runs: Run[] = []
  let series: Series[] = []

  if (tab === 'corse') {
    let query = supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('status', 'aperta')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (params.city)  query = query.ilike('city', `%${params.city}%`)
    if (params.level) query = query.eq('level', params.level)
    if (params.q)     query = query.ilike('title', `%${params.q}%`)

    const { data } = await query
    runs = (data || []) as unknown as Run[]

    if (user) {
      const { data: participations } = await supabase
        .from('participations').select('run_id, status').eq('user_id', user.id)
      const partMap = new Map(participations?.map(p => [p.run_id, p]) ?? [])
      runs = runs.map(r => ({ ...r, my_participation: partMap.get(r.id) ?? null })) as Run[]
    }

    const { data: counts } = await supabase
      .from('participations').select('run_id').eq('status', 'approvata')
    const countMap = new Map<string, number>()
    counts?.forEach(c => countMap.set(c.run_id, (countMap.get(c.run_id) ?? 0) + 1))
    runs = runs.map(r => ({ ...r, participants_count: countMap.get(r.id) ?? 0 })) as Run[]
  } else {
    let query = supabase
      .from('series')
      .select('*, organizer:profiles!series_organizer_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (params.city)  query = query.ilike('city', `%${params.city}%`)
    if (params.level) query = query.eq('level', params.level)
    if (params.q)     query = query.ilike('title', `%${params.q}%`)

    const { data } = await query
    series = (data || []) as unknown as Series[]
  }

  const hasFilters = !!(params.q || params.city || params.level)
  const count = tab === 'corse' ? runs.length : series.length

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* Page header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                  {tab === 'corse' ? 'Chi corre oggi?' : 'Corse ricorrenti'}
                </h1>
                <p className="mt-2 text-lg text-gray-500">
                  {tab === 'corse'
                    ? 'Trova un allenamento vicino a te, al ritmo giusto.'
                    : 'Appuntamenti fissi per chi vuole creare un\'abitudine di corsa.'}
                </p>
              </div>
              <Link
                href="/nuova-corsa"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 shrink-0"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Proponi una corsa
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-7">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full w-fit">
            {[
              { value: 'corse', label: 'Corse singole',    icon: 'directions_run' },
              { value: 'serie', label: 'Serie ricorrenti', icon: 'event_repeat' },
            ].map(t => (
              <Link
                key={t.value}
                href={`/bacheca?tab=${t.value}`}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === t.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </Link>
            ))}
          </div>

          {/* Filter bar */}
          <FilterBar tab={tab} current={params} />

          {/* Results count */}
          {(hasFilters || count > 0) && (
            <p className="text-sm text-gray-400 -mt-2">
              {hasFilters
                ? `${count} risultat${count === 1 ? 'o' : 'i'} per i filtri selezionati`
                : `${count} ${tab === 'corse' ? (count === 1 ? 'corsa disponibile' : 'corse disponibili') : (count === 1 ? 'serie attiva' : 'serie attive')}`}
            </p>
          )}

          {/* Grid */}
          {tab === 'corse' ? (
            runs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {runs.map(run => <RunCard key={run.id} run={run} />)}
              </div>
            ) : (
              <EmptyState tab="corse" hasFilters={hasFilters} />
            )
          ) : (
            series.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {series.map(s => <SeriesCard key={s.id} series={s} />)}
              </div>
            ) : (
              <EmptyState tab="serie" hasFilters={hasFilters} />
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

/* ─── Filter bar ─── */
function FilterBar({ tab, current }: { tab: string; current: SearchParams }) {
  const hasFilters = !!(current.q || current.city || current.level)

  return (
    <form method="GET" action="/bacheca"
      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
      <input type="hidden" name="tab" value={tab} />

      <div className="flex flex-col gap-1.5 min-w-[160px] flex-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerca</label>
        <input
          name="q" defaultValue={current.q} placeholder="Nome corsa..."
          className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex flex-col gap-1.5 min-w-[120px] flex-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Città</label>
        <input
          name="city" defaultValue={current.city} placeholder="es. Milano"
          className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Livello</label>
        <select
          name="level" defaultValue={current.level ?? ''}
          className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
        >
          <option value="">Tutti i livelli</option>
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzato">Avanzato</option>
        </select>
      </div>

      <button type="submit"
        className="h-10 px-5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
        Filtra
      </button>

      {hasFilters && (
        <a href={`/bacheca?tab=${tab}`}
          className="h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-base">close</span>
          Rimuovi filtri
        </a>
      )}
    </form>
  )
}

/* ─── Empty state ─── */
function EmptyState({ tab, hasFilters }: { tab: string; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center bg-white rounded-3xl border border-gray-100">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-gray-300">
          {tab === 'corse' ? 'directions_run' : 'event_repeat'}
        </span>
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">
          {hasFilters ? 'Nessuna corsa trovata' : 'Ancora nessuna corsa'}
        </p>
        <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
          {hasFilters
            ? 'Prova a cambiare i filtri oppure proponi tu il prossimo allenamento.'
            : 'Sii il primo a proporre un appuntamento nella tua città.'}
        </p>
      </div>
      <Link
        href={tab === 'corse' ? '/nuova-corsa' : '/nuova-serie'}
        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        {tab === 'corse' ? 'Proponi una corsa' : 'Proponi una serie'}
      </Link>
    </div>
  )
}
