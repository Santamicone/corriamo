import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { RunCard } from '@/components/RunCard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, LEVEL_LABELS, RECURRENCE_LABELS, DAY_LABELS, todayItaly } from '@/lib/utils'
import { TagBadge } from '@/components/ui/TagBadge'
import type { Series, Run } from '@/lib/types'
import type { Metadata } from 'next'

const SITE_URL = 'https://app.vieniacorrere.it'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('series')
    .select('title, description, city, level')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Serie ricorrente' }

  const desc = data.description ||
    `Serie ricorrente di corse a ${data.city}. Livello ${LEVEL_LABELS[data.level] ?? data.level}. Unisciti agli appuntamenti fissi.`

  return {
    title: data.title,
    description: desc,
    alternates: { canonical: `${SITE_URL}/serie/${id}` },
    openGraph: {
      title: `${data.title} — Vieni a correre?`,
      description: desc,
      url: `${SITE_URL}/serie/${id}`,
    },
  }
}

export default async function SerieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: series } = await supabase
    .from('series')
    .select('*, organizer:profiles!series_organizer_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!series) notFound()

  const typedSeries = series as unknown as Series

  const { data: runs } = await supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
    .eq('series_id', id)
    .gte('date', todayItaly())
    .order('date', { ascending: true })
    .limit(6)

  const upcomingRuns = (runs ?? []) as unknown as Run[]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-12 py-8">
        <Link href="/bacheca?tab=serie" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Bacheca
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Title card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-tertiary" />
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="green">Serie ricorrente</Badge>
                  <Badge variant={typedSeries.level === 'tutti' ? 'default' : 'orange'}>
                    {LEVEL_LABELS[typedSeries.level]}
                  </Badge>
                  {typedSeries.is_no_drop && <Badge variant="green">No Drop</Badge>}
                </div>
                <h1 className="text-2xl font-extrabold text-on-surface">{typedSeries.title}</h1>
                {typedSeries.description && (
                  <p className="text-sm text-on-surface-variant leading-relaxed">{typedSeries.description}</p>
                )}

                {/* Tag caratteristiche serie */}
                {(typedSeries as Series & { tags?: string[] }).tags?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(typedSeries as Series & { tags?: string[] }).tags!.map(id => (
                      <TagBadge key={id} tagId={id} size="md" />
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: 'event_repeat', label: 'Ricorrenza', value: RECURRENCE_LABELS[typedSeries.recurrence_type] },
                    { icon: 'calendar_today', label: 'Giorno', value: DAY_LABELS[typedSeries.recurrence_day] },
                    { icon: 'schedule', label: 'Orario', value: typedSeries.recurrence_time.slice(0, 5) },
                    { icon: 'place', label: 'Luogo', value: typedSeries.location },
                    { icon: 'route', label: 'Distanza', value: typedSeries.distance_km ? `${typedSeries.distance_km} km` : 'Libera' },
                    { icon: 'today', label: 'Inizio', value: formatDate(typedSeries.start_date) },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-container p-3 rounded-xl flex flex-col gap-1">
                      <span className="material-symbols-outlined text-tertiary text-xl">{item.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{item.label}</span>
                      <span className="text-sm font-semibold text-on-surface leading-tight">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prossimi appuntamenti */}
            <div>
              <h2 className="text-lg font-bold text-on-surface mb-4">Prossimi appuntamenti</h2>
              {upcomingRuns.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {upcomingRuns.map(run => (
                    <RunCard key={run.id} run={run} />
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">event_busy</span>
                  <p className="text-sm text-on-surface-variant">Nessun appuntamento imminente.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Organizzatore</p>
              <Link href={`/profilo/${typedSeries.organizer_id}`} className="flex items-center gap-3 group">
                <Avatar name={typedSeries.organizer.full_name} src={typedSeries.organizer.avatar_url} size="md" />
                <div>
                  <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                    {typedSeries.organizer.full_name}
                  </p>
                  {typedSeries.organizer.city && (
                    <p className="text-xs text-on-surface-variant">{typedSeries.organizer.city}</p>
                  )}
                </div>
              </Link>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-xl shrink-0">info</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Ogni appuntamento è un evento separato. Iscriviti alle singole date che ti interessano.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
