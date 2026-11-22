import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { CrewMapWrapper } from '@/components/CrewMapWrapper'
import { fetchCrewMapPoints, groupByCity, crewHref } from '@/lib/crewMap'
import { CREW_TYPE_LABELS } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Mappa delle crew di corsa in Italia',
  description:
    'Trova le crew e i gruppi di corsa vicino a te: la mappa dei running club e dei gruppi di allenamento in Italia, con ritrovo e contatti.',
  alternates: { canonical: 'https://app.vieniacorrere.it/crew/mappa' },
  openGraph: {
    title: 'Mappa delle crew di corsa — Vieni a correre?',
    description: 'Running club e gruppi di allenamento in Italia, sulla mappa.',
    url: 'https://app.vieniacorrere.it/crew/mappa',
  },
}

// I dati cambiano quando un proprietario attiva o disattiva la mappa: niente pagina statica
export const dynamic = 'force-dynamic'

export default async function CrewMapPage() {
  const supabase = await createClient()
  const points = await fetchCrewMapPoints(supabase)
  const cities = groupByCity(points)
  const hasInfoCards = points.some(p => !p.has_manager)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="wide" className="py-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Mappa delle crew</h1>
                <p className="mt-2 text-lg text-gray-500">
                  Running club e gruppi di corsa in Italia.
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
          {/* Lista / Mappa */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-full w-fit">
            <Link href="/crew?tab=scopri"
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-gray-500 hover:text-gray-700 transition-all">
              <span className="material-symbols-outlined text-base">view_list</span>
              Lista
            </Link>
            <span className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold bg-white text-gray-900 shadow-sm">
              <span className="material-symbols-outlined text-base">map</span>
              Mappa
            </span>
          </div>

          {points.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-gray-300">map</span>
              </div>
              <div className="flex flex-col items-center gap-1 max-w-md">
                <p className="text-lg font-bold text-gray-900">Ancora nessuna crew sulla mappa</p>
                <p className="text-sm text-gray-500">
                  Se gestisci una crew, puoi farla comparire qui dalle impostazioni della crew, scegliendo
                  quanto preciso deve essere il punto: l’indirizzo esatto non è obbligatorio.
                </p>
              </div>
              <Link href="/crew?tab=mie"
                className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-50 transition-colors">
                Le mie crew
              </Link>
            </div>
          ) : (
            <>
              <CrewMapWrapper points={points} />

              {/* Legenda */}
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
                <li className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" /> Crew su Vieni a correre
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Crew verificata
                </li>
                {hasInfoCards && (
                  <li className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" /> Scheda informativa
                  </li>
                )}
                <li className="flex items-center gap-1.5 text-gray-400">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Il pin indica la zona, non sempre il punto esatto.
                </li>
              </ul>

              {/* Per città */}
              {cities.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Per città</h2>
                  <div className="flex flex-wrap gap-2">
                    {cities.map(c => (
                      <Link key={c.slug} href={`/crew/citta/${c.slug}`}
                        className="inline-flex items-center gap-1.5 border border-gray-200 bg-white rounded-full px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors">
                        {c.city}
                        <span className="text-xs text-gray-400">{c.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Elenco (utile anche per chi non usa la mappa e per i motori di ricerca) */}
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  {points.length === 1 ? '1 crew sulla mappa' : `${points.length} crew sulla mappa`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {points.map(p => (
                    <Link key={p.id} href={crewHref(p)}
                      className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 hover:shadow-sm transition-all">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-xl">group</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {CREW_TYPE_LABELS[p.crew_type]?.name ?? 'Crew'}
                          {p.city ? ` · ${p.city}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}
