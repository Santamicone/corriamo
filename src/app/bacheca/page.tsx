import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RunCard } from '@/components/RunCard'
import { SeriesCard } from '@/components/SeriesCard'
import Link from 'next/link'
import { format, addDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { Run, Series } from '@/lib/types'

/* ─── Tipi ─── */
interface SearchParams {
  tab?:   string
  city?:  string
  level?: string
  q?:     string
  from?:  string   // YYYY-MM-DD
  to?:    string   // YYYY-MM-DD
}

/* ─── Helpers date ─── */
const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
const todayStr = () => toISO(new Date())

function getChipRanges(today: Date) {
  const day = today.getDay() // 0=Dom … 6=Sab
  const daysToSat = day === 6 ? 0 : 6 - day
  const sat = addDays(today, daysToSat)
  const sun = addDays(sat, 1)
  return {
    oggi:      { from: toISO(today),             to: toISO(today) },
    domani:    { from: toISO(addDays(today, 1)), to: toISO(addDays(today, 1)) },
    weekend:   { from: toISO(sat),               to: toISO(sun) },
    settimana: { from: toISO(today),             to: toISO(addDays(today, 7)) },
  }
}

function buildUrl(base: SearchParams, extra: Partial<SearchParams>): string {
  const merged = { ...base, ...extra }
  const p = new URLSearchParams()
  Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
  return `/bacheca?${p.toString()}`
}

function fmtDateIt(str: string) {
  try { return format(parseISO(str), 'd MMMM', { locale: it }) } catch { return str }
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default async function BachecaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const tab = params.tab ?? 'corse'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = todayStr()
  let runs: Run[] = []
  let series: Series[] = []

  if (tab === 'corse') {
    // Base query — se c'è un `from` esplicito lo usa, altrimenti mostra da oggi
    let query = supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('status', 'aperta')
      .gte('date', params.from ?? today)
      .order('date', { ascending: true })

    if (params.to)    query = query.lte('date', params.to)
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

  const hasFilters    = !!(params.q || params.city || params.level || params.from || params.to)
  const hasDateFilter = !!(params.from || params.to)
  const count = tab === 'corse' ? runs.length : series.length

  // Chips — calcolate al momento del render server-side
  const chips = getChipRanges(new Date())

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
                    : "Appuntamenti fissi per chi vuole creare un'abitudine di corsa."}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

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
                  tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </Link>
            ))}
          </div>

          {/* Filter bar */}
          <FilterBar tab={tab} current={params} chips={chips} showDateFilter={tab === 'corse'} />

          {/* Pill filtro data attivo */}
          {hasDateFilter && tab === 'corse' && (
            <ActiveDatePill params={params} />
          )}

          {/* Contatore risultati */}
          {(hasFilters || count > 0) && (
            <p className="text-sm text-gray-400 -mt-2">
              {hasFilters
                ? `${count} risultat${count === 1 ? 'o' : 'i'} trovati`
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
              <EmptyState tab="corse" hasFilters={hasFilters} hasDateFilter={hasDateFilter} params={params} />
            )
          ) : (
            series.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {series.map(s => <SeriesCard key={s.id} series={s} />)}
              </div>
            ) : (
              <EmptyState tab="serie" hasFilters={hasFilters} hasDateFilter={false} params={params} />
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

/* ═══════════════════════════════════════
   FILTER BAR
═══════════════════════════════════════ */
type ChipRanges = ReturnType<typeof getChipRanges>

function FilterBar({
  tab, current, chips, showDateFilter,
}: {
  tab: string
  current: SearchParams
  chips: ChipRanges
  showDateFilter: boolean
}) {
  const hasTextFilters = !!(current.q || current.city || current.level)
  const hasDateFilter  = !!(current.from || current.to)
  const hasAnyFilter   = hasTextFilters || hasDateFilter

  // Determina quale chip è attiva
  const activeChip = Object.entries(chips).find(
    ([, r]) => r.from === current.from && r.to === current.to
  )?.[0]

  const CHIP_LABELS: Record<string, string> = {
    oggi: 'Oggi', domani: 'Domani', weekend: 'Weekend', settimana: '+7 giorni',
  }
  const CHIP_ICONS: Record<string, string> = {
    oggi: 'today', domani: 'event', weekend: 'weekend', settimana: 'date_range',
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

      {/* ── Riga 1: testo + città + livello ── */}
      <form method="GET" action="/bacheca" className="flex flex-wrap gap-3 items-end p-4 border-b border-gray-50">
        <input type="hidden" name="tab" value={tab} />
        {/* Preserva i filtri data nel form testo */}
        {current.from && <input type="hidden" name="from" value={current.from} />}
        {current.to   && <input type="hidden" name="to"   value={current.to} />}

        <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerca</label>
          <input name="q" defaultValue={current.q} placeholder="Nome corsa..."
            className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px] flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Città</label>
          <input name="city" defaultValue={current.city} placeholder="es. Milano"
            className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Livello</label>
          <select name="level" defaultValue={current.level ?? ''}
            className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none">
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

        {hasAnyFilter && (
          <a href={`/bacheca?tab=${tab}`}
            className="h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">close</span>
            Rimuovi tutti
          </a>
        )}
      </form>

      {/* ── Riga 2: filtro data (solo tab corse) ── */}
      {showDateFilter && (
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">

          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
            Quando
          </span>

          {/* Quick chips — scrollabili su mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {Object.entries(chips).map(([key, range]) => {
              const isActive = key === activeChip
              const url = buildUrl(current, { from: range.from, to: range.to })
              return (
                <Link
                  key={key}
                  href={url}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm shadow-orange-200'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary bg-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{CHIP_ICONS[key]}</span>
                  {CHIP_LABELS[key]}
                </Link>
              )
            })}
          </div>

          {/* Separatore */}
          <span className="hidden sm:block text-gray-200 select-none">|</span>

          {/* Range personalizzato */}
          <form method="GET" action="/bacheca" className="flex items-center gap-2 flex-wrap">
            <input type="hidden" name="tab"   value={tab} />
            {current.q     && <input type="hidden" name="q"     value={current.q} />}
            {current.city  && <input type="hidden" name="city"  value={current.city} />}
            {current.level && <input type="hidden" name="level" value={current.level} />}

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 font-medium shrink-0">Dal</label>
              <input
                type="date"
                name="from"
                defaultValue={current.from ?? ''}
                className="h-9 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 font-medium shrink-0">al</label>
              <input
                type="date"
                name="to"
                defaultValue={current.to ?? ''}
                className="h-9 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button type="submit"
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors">
              Applica
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   PILL FILTRO DATA ATTIVO
═══════════════════════════════════════ */
function ActiveDatePill({ params }: { params: SearchParams }) {
  const { from, to, from: _, to: __, ...rest } = params
  const withoutDate = buildUrl(rest, {})

  let label = ''
  if (from && to && from === to) {
    label = `📅 ${fmtDateIt(from)}`
  } else if (from && to) {
    label = `📅 Dal ${fmtDateIt(from)} al ${fmtDateIt(to)}`
  } else if (from) {
    label = `📅 Dal ${fmtDateIt(from)}`
  } else if (to) {
    label = `📅 Fino al ${fmtDateIt(to)}`
  }

  return (
    <div className="flex items-center gap-2 -mt-2">
      <span className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold px-3 py-1.5 rounded-full">
        {label}
        <a
          href={withoutDate || '/bacheca'}
          className="text-orange-400 hover:text-orange-700 transition-colors ml-0.5"
          aria-label="Rimuovi filtro data"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </a>
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════ */
function EmptyState({ tab, hasFilters, hasDateFilter, params }: {
  tab: string; hasFilters: boolean; hasDateFilter: boolean; params: SearchParams
}) {
  // Suggerimento contestuale per il filtro data
  const dateHint = hasDateFilter && (
    <a
      href={buildUrl({ ...params, from: undefined, to: undefined }, {})}
      className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:underline mt-1"
    >
      <span className="material-symbols-outlined text-base">date_range</span>
      Cerca in tutte le date
    </a>
  )

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-gray-300">
          {tab === 'corse' ? 'directions_run' : 'event_repeat'}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-bold text-gray-900">
          {hasFilters ? 'Nessuna corsa trovata' : 'Ancora nessuna corsa'}
        </p>
        <p className="text-sm text-gray-500 max-w-xs">
          {hasDateFilter
            ? 'Nessuna corsa disponibile in questo periodo.'
            : hasFilters
              ? 'Prova a cambiare i filtri oppure proponi tu il prossimo allenamento.'
              : 'Sii il primo a proporre un appuntamento nella tua città.'}
        </p>
        {dateHint}
      </div>
      <Link
        href={tab === 'corse' ? '/nuova-corsa' : '/nuova-serie'}
        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors mt-1"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        {tab === 'corse' ? 'Proponi una corsa' : 'Proponi una serie'}
      </Link>
    </div>
  )
}
