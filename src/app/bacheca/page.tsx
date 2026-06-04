import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
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

    if (params.city) query = query.ilike('city', `%${params.city}%`)
    if (params.level) query = query.eq('level', params.level)
    if (params.q) query = query.ilike('title', `%${params.q}%`)

    const { data } = await query
    runs = (data || []) as unknown as Run[]

    if (user) {
      const { data: participations } = await supabase
        .from('participations')
        .select('run_id, status')
        .eq('user_id', user.id)

      const partMap = new Map(participations?.map(p => [p.run_id, p]) ?? [])
      runs = runs.map(r => ({ ...r, my_participation: partMap.get(r.id) ?? null })) as Run[]
    }

    const { data: counts } = await supabase
      .from('participations')
      .select('run_id')
      .eq('status', 'approvata')
    const countMap = new Map<string, number>()
    counts?.forEach(c => countMap.set(c.run_id, (countMap.get(c.run_id) ?? 0) + 1))
    runs = runs.map(r => ({ ...r, participants_count: countMap.get(r.id) ?? 0 })) as Run[]
  } else {
    let query = supabase
      .from('series')
      .select('*, organizer:profiles!series_organizer_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (params.city) query = query.ilike('city', `%${params.city}%`)
    if (params.level) query = query.eq('level', params.level)
    if (params.q) query = query.ilike('title', `%${params.q}%`)

    const { data } = await query
    series = (data || []) as unknown as Series[]
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        {/* Page heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface">Bacheca delle corse</h1>
            <p className="text-on-surface-variant mt-1">Trova una corsa o una serie che fa per te.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/nuova-corsa" className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-lg">add</span>
              Proponi una corsa
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-container p-1 rounded-full w-fit">
          <Link
            href="/bacheca?tab=corse"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'corse' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Corse singole
          </Link>
          <Link
            href="/bacheca?tab=serie"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'serie' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Serie ricorrenti
          </Link>
        </div>

        {/* Filters */}
        <FilterBar tab={tab} current={params} />

        {/* Grid */}
        {tab === 'corse' ? (
          runs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {runs.map(run => <RunCard key={run.id} run={run} />)}
            </div>
          ) : (
            <EmptyState tab="corse" />
          )
        ) : (
          series.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {series.map(s => <SeriesCard key={s.id} series={s} />)}
            </div>
          ) : (
            <EmptyState tab="serie" />
          )
        )}
      </main>
    </div>
  )
}

function FilterBar({ tab, current }: { tab: string; current: SearchParams }) {
  return (
    <form method="GET" action="/bacheca" className="flex flex-wrap gap-3 p-4 bg-surface-container-low rounded-2xl">
      <input type="hidden" name="tab" value={tab} />
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Cerca</label>
        <input
          name="q"
          defaultValue={current.q}
          placeholder="Nome corsa..."
          className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[120px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Città</label>
        <input
          name="city"
          defaultValue={current.city}
          placeholder="es. Milano"
          className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Livello</label>
        <select
          name="level"
          defaultValue={current.level ?? ''}
          className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          <option value="">Tutti i livelli</option>
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzato">Avanzato</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="h-9 px-4 bg-inverse-surface text-inverse-on-surface rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
          Filtra
        </button>
      </div>
      {(current.q || current.city || current.level) && (
        <div className="flex items-end">
          <a href={`/bacheca?tab=${tab}`} className="h-9 px-4 border border-outline-variant rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors flex items-center">
            Rimuovi filtri
          </a>
        </div>
      )}
    </form>
  )
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center mt-6">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
        {tab === 'corse' ? 'directions_run' : 'event_repeat'}
      </span>
      <p className="text-lg font-semibold text-on-surface-variant">Nessuna {tab === 'corse' ? 'corsa' : 'serie'} trovata</p>
      <p className="text-sm text-on-surface-variant/70">
        {tab === 'corse' ? 'Sii il primo a proporre una corsa!' : 'Crea la prima serie ricorrente!'}
      </p>
      <Link
        href={tab === 'corse' ? '/nuova-corsa' : '/nuova-serie'}
        className="mt-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        {tab === 'corse' ? 'Proponi una corsa' : 'Proponi una serie'}
      </Link>
    </div>
  )
}
