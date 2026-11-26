import Link from 'next/link'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PageContainer } from '@/components/PageContainer'
import { ProposalCard } from '@/components/ProposalCard'
import { RunCard } from '@/components/RunCard'
import { HomeCarousel } from '@/components/home/HomeCarousel'
import { fetchProposals } from '@/lib/proposals'
import type { Run } from '@/lib/types'
import { cn, parseRunDateTime, todayItaly } from '@/lib/utils'

const MAX_ITEMS = 6

type HomeRun = Run & { location_public?: boolean }

/**
 * Prossime corse pubbliche in programma. Client anonimo senza cookie: la home resta una pagina
 * in cache (rigenerata ogni tot, vedi `revalidate` in page.tsx) e uguale per tutti.
 */
async function fetchUpcomingRuns(supabase: SupabaseClient): Promise<HomeRun[]> {
  const { data, error } = await supabase
    .from('runs')
    .select('id, title, date, time, city, location, location_public, distance_km, pace_target, level, is_no_drop, is_spot, series_id, tags, organizer:profiles!runs_organizer_id_fkey(full_name, avatar_url, city)')
    .eq('status', 'aperta')
    // In bacheca non c'è questo filtro; in home vanno solo le corse pubbliche
    .eq('run_visibility', 'public')
    .eq('hidden_by_admin', false)
    .not('type', 'eq', 'gara')
    .gte('date', todayItaly())
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(40)
  if (error) {
    console.warn('[home] corse:', error.message)
    return []
  }

  const now = Date.now()
  const seenSeries = new Set<string>()
  return (data as unknown as HomeRun[])
    .filter((run) => parseRunDateTime(run.date, run.time).getTime() > now)
    // Di una serie ricorrente basta il prossimo appuntamento
    .filter((run) => {
      if (!run.series_id) return true
      if (seenSeries.has(run.series_id)) return false
      seenSeries.add(run.series_id)
      return true
    })
    .slice(0, MAX_ITEMS)
    // Il punto di ritrovo riservato non deve uscire dal server
    .map((run) => (run.location_public === false ? { ...run, location: '' } : run))
}

/** Blocco "prossime corse + proposte" (2:1). Se una lista è vuota, l'altra occupa tutta la larghezza. */
export async function LatestSection() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const [runs, proposals] = await Promise.all([
    fetchUpcomingRuns(supabase),
    fetchProposals(supabase, null, MAX_ITEMS),
  ])
  if (runs.length === 0 && proposals.length === 0) return null

  const both = runs.length > 0 && proposals.length > 0

  return (
    <section className="py-14 sm:py-20 bg-white border-y border-gray-100">
      <PageContainer width="wide">
        <div className={cn('grid grid-cols-1 gap-10 lg:gap-8', both && 'lg:grid-cols-3')}>
          {runs.length > 0 && (
            <div className={cn('min-w-0', both && 'lg:col-span-2')}>
              <BlockTitle title="Prossime corse" text="Scegli un appuntamento e unisciti." href="/bacheca" linkLabel="Tutte le corse" />
              <HomeCarousel
                label="Prossime corse"
                slideClassName={cn('basis-full sm:basis-[calc((100%-1rem)/2)]', !both && 'lg:basis-[calc((100%-2rem)/3)]')}
              >
                {runs.map((run) => <RunCard key={run.id} run={run} />)}
              </HomeCarousel>
            </div>
          )}

          {proposals.length > 0 && (
            <div className="min-w-0">
              <BlockTitle title="Cercano un organizzatore" text="Idee di uscita: organizzale tu." />
              <HomeCarousel
                label="Proposte di corsa senza organizzatore"
                slideClassName={cn('basis-full', !both && 'sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]')}
              >
                {proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}
              </HomeCarousel>
            </div>
          )}
        </div>
      </PageContainer>
    </section>
  )
}

function BlockTitle({ title, text, href, linkLabel }: { title: string; text: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex min-h-14 items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{text}</p>
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-primary hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}
