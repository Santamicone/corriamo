import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { CrewMapWrapper } from '@/components/CrewMapWrapper'
import { fetchCrewMapPoints, citySlug, crewHref } from '@/lib/crewMap'
import { CREW_TYPE_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { city: string }

async function loadCity(slug: string) {
  const supabase = await createClient()
  const all = await fetchCrewMapPoints(supabase)
  const points = all.filter(p => p.city && citySlug(p.city) === slug)
  // Il nome "vero" della città è quello scritto dalla maggior parte delle crew
  const cityName = points[0]?.city?.trim() ?? slug
  return { points, cityName }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city } = await params
  const { points, cityName } = await loadCity(city)
  if (points.length === 0) return { title: 'Crew non trovate', robots: { index: false } }
  const url = `https://app.vieniacorrere.it/crew/citta/${city}`
  return {
    title: `Crew e gruppi di corsa a ${cityName}`,
    description: `${points.length === 1 ? 'La crew' : `Le ${points.length} crew`} di corsa a ${cityName}: gruppi di allenamento e running club con ritrovo e come entrare.`,
    alternates: { canonical: url },
    openGraph: { title: `Crew di corsa a ${cityName} — Vieni a correre?`, url },
  }
}

export default async function CrewCityPage({ params }: { params: Promise<Params> }) {
  const { city } = await params
  const { points, cityName } = await loadCity(city)
  if (points.length === 0) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="wide" className="py-10">
            <Link href="/crew/mappa" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Mappa delle crew
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Crew di corsa a {cityName}</h1>
            <p className="mt-2 text-lg text-gray-500">
              {points.length === 1 ? '1 crew' : `${points.length} crew`} di runner in zona.
            </p>
          </PageContainer>
        </div>

        <PageContainer width="wide" className="py-8 flex flex-col gap-6">
          <CrewMapWrapper points={points} height="420px" />

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
                    {p.zone ? ` · ${p.zone}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Il pin indica la zona, non sempre il punto esatto di ritrovo. Sei il gestore di una crew di {cityName}?{' '}
            <Link href="/crew?tab=mie" className="text-primary hover:underline">Aggiungila alla mappa</Link>.
          </p>
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}
