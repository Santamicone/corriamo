import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { GaraCard } from '@/components/GaraCard'
import Link from 'next/link'
import type { Run } from '@/lib/types'
import { todayItaly } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Cerca compagni di gara',
  description: 'Trova pacer, compagni o supporter per la tua prossima maratona, mezza o 10K. Pubblica un post e connettiti con runner che partecipano alla stessa gara.',
  alternates: { canonical: 'https://www.vieniacorrere.it/gare' },
  openGraph: {
    title: 'Cerca compagni di gara — Vieni a correre?',
    description: 'Trova pacer, compagni o supporter per la tua prossima gara.',
    url: 'https://www.vieniacorrere.it/gare',
  },
}

interface SearchParams {
  city?:          string
  q?:             string
  race_distance?: string
  looking_for?:   string
}

const LOOKING_FOR_OPTIONS = [
  { value: 'pacer',     label: 'Pacer',     icon: 'speed' },
  { value: 'compagno',  label: 'Compagno',  icon: 'group' },
  { value: 'supporter', label: 'Supporter', icon: 'volunteer_activism' },
]

const DISTANCE_OPTIONS = [
  { value: '5k',  label: '5K' },
  { value: '10k', label: '10K' },
  { value: '21k', label: 'Mezza' },
  { value: '42k', label: 'Maratona' },
]

function buildUrl(base: SearchParams, extra: Partial<SearchParams>): string {
  const merged = { ...base, ...extra }
  const p = new URLSearchParams()
  Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
  const qs = p.toString()
  return `/gare${qs ? '?' + qs : ''}`
}

export default async function GarePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayItaly()

  let query = supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
    .eq('status', 'aperta')
    .eq('type', 'gara')
    .gte('date', today)
    .order('date', { ascending: true })

  if (params.city)          query = query.ilike('city', `%${params.city}%`)
  if (params.q)             query = query.ilike('title', `%${params.q}%`)
  if (params.race_distance) query = query.eq('race_distance', params.race_distance)
  if (params.looking_for)   query = query.contains('looking_for', [params.looking_for])

  const { data } = await query
  const gare = (data ?? []) as unknown as Run[]
  const hasFilters = !!(params.city || params.q || params.race_distance || params.looking_for)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* ── Hero section ── */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
                <span className="material-symbols-outlined text-base">emoji_events</span>
                Cerca compagni di gara
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                Non correre la gara da solo.
              </h1>
              <p className="mt-4 text-lg text-indigo-200 leading-relaxed max-w-xl">
                Stai preparando una maratona, una mezza o una 10K? Qui puoi trovare runner che partecipano alla stessa gara e cercare un <strong className="text-white">pacer</strong> che ti aiuti a mantenere il ritmo, un <strong className="text-white">compagno</strong> con cui condividere la fatica, o un <strong className="text-white">supporter</strong> che ti inciti lungo il percorso.
              </p>
              <p className="mt-3 text-sm text-indigo-300">
                Pubblica un post con la gara a cui sei iscritto, indica cosa cerchi e connettiti con chi fa al caso tuo.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href={user ? '/nuova-gara' : '/registrati'}
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold px-7 py-3.5 rounded-full hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Pubblica un post
                </Link>
                {!user && (
                  <Link href="/login"
                    className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors">
                    Ho già un account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Come funziona ── */}
        <div className="bg-indigo-50 border-b border-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-10">
              {[
                { icon: 'edit', step: '1', text: 'Pubblica un post con la gara e cosa cerchi' },
                { icon: 'search', step: '2', text: 'Sfoglia i post di altri runner con la stessa gara' },
                { icon: 'chat', step: '3', text: 'Contatta chi ti sembra compatibile e organizzatevi' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </div>
                  <p className="text-sm text-indigo-800 font-medium">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Lista post ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

          {/* Filtri */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <form method="GET" action="/gare" className="flex flex-wrap gap-3 items-end p-4 border-b border-gray-50">
              <div className="flex flex-col gap-1.5 min-w-[140px] flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerca</label>
                <input name="q" defaultValue={params.q}
                  placeholder="Nome gara o runner…"
                  className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all" />
              </div>
              <div className="flex flex-col gap-1.5 min-w-[120px] flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Città</label>
                <input name="city" defaultValue={params.city}
                  placeholder="es. Roma"
                  className="h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all" />
              </div>
              <button type="submit"
                className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Filtra
              </button>
              {hasFilters && (
                <a href="/gare"
                  className="h-10 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">close</span>
                  Rimuovi tutti
                </a>
              )}
            </form>

            {/* Chip filtri distanza + cerco */}
            <div className="px-4 pb-3 pt-3 flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Distanza</span>
                <div className="flex gap-2 flex-wrap">
                  {DISTANCE_OPTIONS.map(d => {
                    const isActive = params.race_distance === d.value
                    return (
                      <Link key={d.value}
                        href={isActive
                          ? buildUrl({ ...params, race_distance: undefined }, {})
                          : buildUrl(params, { race_distance: d.value })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
                        }`}>{d.label}</Link>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cerco</span>
                <div className="flex gap-2 flex-wrap">
                  {LOOKING_FOR_OPTIONS.map(lf => {
                    const isActive = params.looking_for === lf.value
                    return (
                      <Link key={lf.value}
                        href={isActive
                          ? buildUrl({ ...params, looking_for: undefined }, {})
                          : buildUrl(params, { looking_for: lf.value })}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
                        }`}>
                        <span className="material-symbols-outlined text-sm">{lf.icon}</span>
                        {lf.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Contatore */}
          <p className="text-sm text-gray-400 -mt-2">
            {hasFilters
              ? `${gare.length} risultat${gare.length === 1 ? 'o' : 'i'} trovati`
              : `${gare.length} post pubblicat${gare.length === 1 ? 'o' : 'i'}`}
          </p>

          {/* Grid */}
          {gare.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gare.map(g => <GaraCard key={g.id} run={g} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-indigo-300">emoji_events</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-lg font-bold text-gray-900">
                  {hasFilters ? 'Nessun post trovato' : 'Ancora nessun post'}
                </p>
                <p className="text-sm text-gray-500 max-w-xs">
                  {hasFilters
                    ? 'Prova a rimuovere qualche filtro.'
                    : 'Sii il primo a cercare compagni per la tua gara.'}
                </p>
              </div>
              <Link href={user ? '/nuova-gara' : '/registrati'}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-indigo-700 transition-colors mt-1">
                <span className="material-symbols-outlined text-lg">add</span>
                Pubblica un post
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
