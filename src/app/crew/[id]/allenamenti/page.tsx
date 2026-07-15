import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Crew } from '@/lib/types'
import { buildCrewStats, type StatsActivity, type AthleteStats } from '@/lib/crewStats'
import { formatDistance, formatPace, formatTime } from '@/lib/running/time'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Il segmento [id] accetta sia lo slug personalizzato sia l'uuid legacy. */
function lookupColumn(param: string): 'id' | 'slug' {
  return UUID_RE.test(param) ? 'id' : 'slug'
}

/** Finestra temporale delle attività mostrate nell'elenco completo. */
const WINDOW_DAYS = 90

function relativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default async function CrewAllenamentiPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, slug')
    .eq(lookupColumn(id), id)
    .single() as { data: Pick<Crew, 'id' | 'name' | 'slug'> | null }

  if (!crew) notFound()

  const crewDetailHref = `/crew/${crew.slug ?? crew.id}`

  // Membri attivi della crew → set di autori le cui attività mostriamo.
  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crew.id)
    .eq('status', 'active')

  const memberIds = (members ?? []).map((m) => m.user_id as string)

  // Attività Strava (finestra 90gg). La RLS su strava_activities filtra per viewer,
  // esattamente come nella pagina crew: non-membri vedono solo profili pubblici.
  let activities: StatsActivity[] = []
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from('strava_activities')
      .select('*, user:profiles!user_id(id, full_name, avatar_url)')
      .in('user_id', memberIds)
      .gte('start_date', new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString())
      .order('start_date', { ascending: false })
      .limit(500)
    activities = (data ?? []) as unknown as StatsActivity[]
  }

  const { athletes, totals } = buildCrewStats(activities)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-10">
        <PageContainer width="content" className="space-y-6">

          {/* Torna alla crew */}
          <Link
            href={crewDetailHref}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Torna a {crew.name}
          </Link>

          {/* Intestazione + totali di gruppo */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">leaderboard</span>
              Tutti gli allenamenti
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Attività da Strava degli ultimi {WINDOW_DAYS} giorni · ogni atleta sceglie cosa condividere
            </p>

            {totals.activities > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                {[
                  { value: totals.athletes, label: totals.athletes === 1 ? 'atleta' : 'atleti', icon: 'group' },
                  { value: totals.activities, label: totals.activities === 1 ? 'allenamento' : 'allenamenti', icon: 'directions_run' },
                  { value: formatDistance(totals.totalDistanceM), label: 'totali', icon: 'footprint' },
                  { value: formatTime(totals.totalMovingTimeS), label: 'in movimento', icon: 'timer' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-2xl py-3 px-2 text-center">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">{s.icon}</span>
                    <span className="text-lg font-extrabold text-gray-900 leading-none">{s.value}</span>
                    <span className="text-[11px] text-gray-400 leading-tight">{s.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-5">
                Nessun allenamento condiviso negli ultimi {WINDOW_DAYS} giorni.
              </p>
            )}
          </div>

          {/* Un blocco per atleta, ordinati per km totali */}
          {athletes.map((athlete) => (
            <AthleteBlock key={athlete.userId} athlete={athlete} />
          ))}

        </PageContainer>
      </main>
      <Footer />
    </>
  )
}

function AthleteBlock({ athlete: at }: { athlete: AthleteStats }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Testata atleta con statistiche */}
      <div className="flex items-center gap-3">
        <Avatar name={at.user.full_name} src={at.user.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/profilo/${at.userId}`}
            className="font-semibold text-gray-900 hover:text-[var(--color-primary)]"
          >
            {at.user.full_name}
          </Link>
          <p className="text-xs text-gray-400">
            {at.count} {at.count === 1 ? 'allenamento' : 'allenamenti'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { value: formatDistance(at.totalDistanceM), label: 'km totali', icon: 'footprint' },
          { value: at.avgPaceSPerKm ? `${formatPace(at.avgPaceSPerKm)}/km` : '—', label: 'passo medio', icon: 'speed' },
          { value: formatDistance(at.longestDistanceM), label: 'uscita più lunga', icon: 'trending_up' },
          { value: formatTime(at.totalMovingTimeS), label: 'tempo totale', icon: 'timer' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-2xl py-3 px-2 text-center">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">{s.icon}</span>
            <span className="text-base font-extrabold text-gray-900 leading-none">{s.value}</span>
            <span className="text-[11px] text-gray-400 leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Elenco allenamenti dell'atleta */}
      <div className="mt-4 divide-y divide-gray-100">
        {at.activities.map((a) => {
          const elev = a.total_elevation_gain_m ? Math.round(a.total_elevation_gain_m) : 0
          return (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`https://www.strava.com/activities/${a.strava_activity_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 truncate hover:text-[#FC4C02] inline-flex items-center gap-1"
                  >
                    {a.name || 'Allenamento'}
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                  <span className="text-xs text-gray-400">· {relativeDay(a.start_date)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                  {(a.distance_m ?? 0) > 0 && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">footprint</span>
                      {formatDistance(a.distance_m ?? 0)}
                    </span>
                  )}
                  {a.avg_pace_s_per_km && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">speed</span>
                      {formatPace(a.avg_pace_s_per_km)}/km
                    </span>
                  )}
                  {a.avg_heartrate_bpm && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[13px] text-red-400">cardiology</span>
                      {Math.round(a.avg_heartrate_bpm)} bpm
                    </span>
                  )}
                  {elev > 0 && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">altitude</span>
                      {elev} m
                    </span>
                  )}
                  {a.moving_time_s && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">timer</span>
                      {formatTime(a.moving_time_s)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
