import { createClient } from '@/lib/supabase/server'
import { RaceCard } from '@/components/RaceCard'
import { PageContainer } from '@/components/PageContainer'
import Link from 'next/link'
import type { Race } from '@/lib/types'
import { todayItaly } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface SearchParams {
  q?:        string
  distanza?: string
  area?:     string   // italia | internazionali
  circuito?: string   // major | superhalfs
}

const DISTANCE_OPTIONS = [
  { value: '42k',   label: 'Maratona' },
  { value: '21k',   label: 'Mezza' },
  { value: '10k',   label: '10K' },
  { value: '5k',    label: '5K' },
  { value: 'other', label: 'Altre distanze' },
]

const AREA_OPTIONS = [
  { value: 'italia',         label: 'Italia' },
  { value: 'internazionali', label: 'Internazionali' },
]

const CIRCUIT_OPTIONS = [
  { value: 'major',      label: 'Major' },
  { value: 'superhalfs', label: 'SuperHalfs' },
]

function buildUrl(base: SearchParams, extra: Partial<SearchParams>): string {
  const merged = { ...base, ...extra }
  const p = new URLSearchParams()
  Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return `/calendario-gare${qs ? '?' + qs : ''}`
}

/** Raggruppa le gare (già ordinate per data) per "Mese Anno". */
function groupByMonth(races: Race[]): [string, Race[]][] {
  const groups = new Map<string, Race[]>()
  for (const r of races) {
    const key = format(parseISO(r.event_date), 'LLLL yyyy', { locale: it })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return [...groups.entries()]
}

export default async function CalendarioGarePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const today = todayItaly()

  // Orizzonte massimo: 15 mesi. Nasconde le poche edizioni molto lontane
  // (alcune gare AIMS pubblicano date anni avanti).
  const horizon = new Date()
  horizon.setMonth(horizon.getMonth() + 15)
  const horizonMax = horizon.toISOString().slice(0, 10)

  let query = supabase
    .from('races')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', today)
    .lte('event_date', horizonMax)
    .order('event_date', { ascending: true })

  if (params.q)        query = query.or(`name.ilike.%${params.q}%,city.ilike.%${params.q}%`)
  if (params.distanza) query = query.contains('distances', [params.distanza])
  if (params.area === 'italia')         query = query.eq('country', 'IT')
  if (params.area === 'internazionali') query = query.neq('country', 'IT')
  if (params.circuito) query = query.eq('circuit', params.circuito)

  const { data } = await query
  const races = (data ?? []) as unknown as Race[]

  const hasFilters = !!(params.q || params.distanza || params.area || params.circuito)
  const featured = !hasFilters ? races.filter(r => r.featured).slice(0, 6) : []
  const featuredIds = new Set(featured.map(r => r.id))
  const rest = races.filter(r => !featuredIds.has(r.id))
  const grouped = groupByMonth(rest)

  return (
    <div>
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <PageContainer width="wide" className="py-14 sm:py-18">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <span className="material-symbols-outlined text-base">event</span>
              Calendario gare
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Trova la tua prossima gara.
            </h1>
            <p className="mt-4 text-lg text-indigo-200 leading-relaxed max-w-xl">
              Gare di corsa su strada — dalle <strong className="text-white">10K</strong> alle <strong className="text-white">mezze</strong> e <strong className="text-white">maratone</strong>, e tante altre distanze — in <strong className="text-white">Italia</strong> e in <strong className="text-white">Europa</strong>, comprese le <strong className="text-white">World Marathon Majors</strong> e le <strong className="text-white">SuperHalfs</strong>. Scegli la tua gara obiettivo e cerca compagni con cui viverla.
            </p>
            <div className="mt-7">
              <Link href="/tools/gara-ideale"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold px-7 py-3.5 rounded-full hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Trova la gara ideale per te
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* ── Contenuto ── */}
      <PageContainer width="wide" className="py-8 flex flex-col gap-6">

        {/* Filtri */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <form method="GET" action="/calendario-gare" className="flex flex-wrap gap-3 items-end p-4 border-b border-gray-50">
            <div className="flex flex-col gap-1.5 min-w-[160px] flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerca</label>
              <input name="q" defaultValue={params.q}
                placeholder="Nome gara o città…"
                className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all" />
            </div>
            {/* mantiene i filtri chip attivi anche al submit del testo */}
            {params.distanza && <input type="hidden" name="distanza" value={params.distanza} />}
            {params.area && <input type="hidden" name="area" value={params.area} />}
            {params.circuito && <input type="hidden" name="circuito" value={params.circuito} />}
            <button type="submit"
              className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Filtra
            </button>
            {hasFilters && (
              <a href="/calendario-gare"
                className="h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-base">close</span>
                Rimuovi tutti
              </a>
            )}
          </form>

          <div className="px-4 pb-3 pt-3 flex flex-wrap gap-6">
            <FilterChips label="Distanza" options={DISTANCE_OPTIONS} active={params.distanza}
              params={params} field="distanza" />
            <FilterChips label="Area" options={AREA_OPTIONS} active={params.area}
              params={params} field="area" />
            <FilterChips label="Circuito" options={CIRCUIT_OPTIONS} active={params.circuito}
              params={params} field="circuito" />
          </div>
        </div>

        {/* In evidenza */}
        {featured.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">star</span>
              <h2 className="text-lg font-extrabold text-gray-900">In evidenza</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(r => <RaceCard key={r.id} race={r} />)}
            </div>
          </section>
        )}

        {/* Contatore + proponi */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            {races.length} gar{races.length === 1 ? 'a' : 'e'} in programma
          </p>
          <Link href="/calendario-gare/proponi"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap">
            <span className="material-symbols-outlined text-base">add_location_alt</span>
            Proponi una gara
          </Link>
        </div>

        {/* Lista per mese */}
        {grouped.length > 0 ? (
          <div className="flex flex-col gap-8">
            {grouped.map(([month, list]) => (
              <section key={month} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 capitalize border-b border-gray-100 pb-2">
                  {month}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map(r => <RaceCard key={r.id} race={r} />)}
                </div>
              </section>
            ))}
          </div>
        ) : featured.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-indigo-300">event_busy</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-lg font-bold text-gray-900">Nessuna gara trovata</p>
              <p className="text-sm text-gray-500 max-w-xs">
                {hasFilters ? 'Prova a rimuovere qualche filtro.' : 'Il catalogo verrà popolato a breve.'}
              </p>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  )
}

function FilterChips({ label, options, active, params, field }: {
  label: string
  options: { value: string; label: string }[]
  active?: string
  params: SearchParams
  field: keyof SearchParams
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => {
          const isActive = active === o.value
          return (
            <Link key={o.value}
              href={isActive
                ? buildUrl(params, { [field]: undefined })
                : buildUrl(params, { [field]: o.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
              }`}>{o.label}</Link>
          )
        })}
      </div>
    </div>
  )
}
