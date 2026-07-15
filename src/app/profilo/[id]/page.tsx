import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarLightbox } from '@/components/ui/AvatarLightbox'
import { RunCard } from '@/components/RunCard'
import { ReviewCard } from '@/components/ReviewCard'
import { MomentoCard } from '@/components/MomentoCard'
import { RatingBadge, StarsDisplay } from '@/components/ui/Stars'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LEVEL_LABELS, todayItaly } from '@/lib/utils'
import { formatDistance, formatPace, formatTime } from '@/lib/running/time'
import type { Profile, Run, Review, Momento, StravaActivity } from '@/lib/types'
import { ReliabilityBadge } from '@/components/ui/ReliabilityBadge'
import { AttendanceBadge } from '@/components/ui/AttendanceBadge'
import { ImpactCard } from '@/components/ImpactCard'
import { ReportButton } from '@/components/ReportButton'
import type { Metadata } from 'next'

const SITE_URL = 'https://app.vieniacorrere.it'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, city, level, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Profilo runner' }

  const levelLabel = data.level ? LEVEL_LABELS[data.level] ?? data.level : null
  const desc = data.bio ||
    ['Runner', levelLabel, data.city ? `a ${data.city}` : null, '— vedi le corse organizzate.']
      .filter(Boolean).join(' ')

  return {
    title: `${data.full_name} — Runner`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/profilo/${id}` },
    openGraph: {
      title: `${data.full_name} — Vieni a correre?`,
      description: desc,
      url: `${SITE_URL}/profilo/${id}`,
      images: data.avatar_url && !data.avatar_url.startsWith('preset:') && !data.avatar_url.startsWith('carattere:')
        ? [{ url: data.avatar_url, width: 400, height: 400, alt: data.full_name }]
        : [{ url: '/orizzontale.png', width: 1200, height: 630, alt: 'Vieni a correre?' }],
    },
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!profile) notFound()
  const p = profile as unknown as Profile

  const [{ data: organizedRuns }, { data: reviewsData }, { data: momentiData }, { data: impactRows }] = await Promise.all([
    supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('organizer_id', id)
      .gte('date', todayItaly())
      .order('date', { ascending: true })
      .limit(6),

    supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*), run:runs(id, title, date, city)')
      .eq('reviewed_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('momenti')
      .select('*, run:runs(id, title, date, city)')
      .eq('author_id', id)
      .order('created_at', { ascending: false })
      .limit(12),

    // Impatto sociale come organizzatore ("Runner ispirati") — segnali
    // verificati, calcolati al volo. Vedi docs/GAMIFICATION.md §7.
    supabase.rpc('user_impact_stats', { p_user_id: id }),
  ])

  const reviews = (reviewsData ?? []) as unknown as Review[]
  const momenti = (momentiData ?? []) as unknown as Momento[]
  const impact = (Array.isArray(impactRows) ? impactRows[0] : impactRows) as
    { events_verified: number; participations: number; distinct_people: number; returning_people: number; activated_newcomers: number } | null

  // Attività Strava sul profilo pubblico (opt-in). La RLS filtra comunque:
  // le righe arrivano solo se strava_public_profile = true (o sei l'autore).
  let stravaActivities: StravaActivity[] = []
  if (p.strava_public_profile) {
    const { data } = await supabase
      .from('strava_activities')
      .select('*')
      .eq('user_id', id)
      .order('start_date', { ascending: false })
      .limit(10)
    stravaActivities = (data ?? []) as unknown as StravaActivity[]
  }
  const reviewCount = reviews.length
  const avgRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0

  const isOwn = user?.id === id

  const levelColors: Record<string, string> = {
    tutti:        'bg-gray-100 text-gray-600',
    principiante: 'bg-green-100 text-green-700',
    intermedio:   'bg-blue-100 text-blue-700',
    avanzato:     'bg-orange-100 text-orange-700',
    amatore_gare: 'bg-indigo-100 text-indigo-700',
    atleta:       'bg-purple-100 text-purple-700',
  }

  const WHY_LABELS: Record<string, { label: string; icon: string }> = {
    forma:        { label: 'Stare in forma',            icon: 'fitness_center' },
    divertimento: { label: 'Per divertimento',          icon: 'sentiment_very_satisfied' },
    prestazioni:  { label: 'Migliorare le prestazioni', icon: 'trending_up' },
    amicizia:     { label: 'Fare amicizia',             icon: 'group' },
    benessere:    { label: 'Benessere mentale',         icon: 'self_improvement' },
    gare:         { label: 'Partecipare a gare',        icon: 'emoji_events' },
    sfida:        { label: 'Sfidare me stesso/a',       icon: 'military_tech' },
  }

  const hasPBs = !!(p.pb_5k || p.pb_10k || p.pb_21k || p.pb_42k)

  // Distribuzione stelle (quante 5, quante 4, ecc.)
  const distribution = [5, 4, 3, 2, 1].map(n => ({
    stars: n,
    count: reviews.filter(r => r.rating === n).length,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* ── Hero profilo ── */}
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="content" className="py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <AvatarLightbox name={p.full_name} src={p.avatar_url} size="xl" />
                {p.strava_url && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white pointer-events-none">
                    <span className="material-symbols-filled text-white text-xs">verified</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-gray-900">{p.full_name}</h1>
                  {p.strava_url && (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      <span className="material-symbols-filled text-sm">verified</span>
                      Strava collegato
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {p.city && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">place</span>
                      {p.city}
                    </span>
                  )}
                  {p.age && (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                      <span className="material-symbols-outlined text-base">cake</span>
                      {p.age} anni
                    </span>
                  )}
                  {p.level && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelColors[p.level] ?? levelColors.tutti}`}>
                      {LEVEL_LABELS[p.level]}
                    </span>
                  )}
                  {/* Rating medio inline */}
                  {reviewCount >= 2 && (
                    <RatingBadge average={avgRating} count={reviewCount} />
                  )}
                  {/* Badge affidabilità */}
                  <ReliabilityBadge profile={p} />
                  {/* Badge presenze (partecipante) */}
                  <AttendanceBadge profile={p} />
                </div>

                {/* Perché corre */}
                {p.why_i_run?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.why_i_run.map(key => {
                      const w = WHY_LABELS[key]
                      if (!w) return null
                      return (
                        <span key={key} className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm">{w.icon}</span>
                          {w.label}
                        </span>
                      )
                    })}
                  </div>
                )}

                {p.bio && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-xl">{p.bio}</p>
                )}

                {(p.strava_url || p.garmin_url || p.instagram_url) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {p.strava_url && (
                      <a href={p.strava_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-orange-100 transition-colors">
                        <span className="material-symbols-outlined text-sm">fitness_center</span>
                        Strava
                      </a>
                    )}
                    {p.garmin_url && (
                      <a href={p.garmin_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors">
                        <span className="material-symbols-outlined text-sm">watch</span>
                        Garmin
                      </a>
                    )}
                    {p.instagram_url && (
                      <a href={p.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-pink-700 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-pink-100 transition-colors">
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>

              {isOwn && (
                <Link href="/profilo/modifica"
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-50 transition-colors shrink-0">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Modifica
                </Link>
              )}
            </div>

            {/* Personal Best */}
            {hasPBs && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Personal Best</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: '5 km',   value: p.pb_5k },
                    { label: '10 km',  value: p.pb_10k },
                    { label: 'Mezza',  value: p.pb_21k },
                    { label: 'Maratona', value: p.pb_42k },
                  ].filter(pb => pb.value).map(pb => (
                    <div key={pb.label} className="flex flex-col items-center bg-gray-50 rounded-2xl px-4 py-2.5 gap-0.5 min-w-[80px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{pb.label}</span>
                      <span className="text-sm font-extrabold text-gray-800">{pb.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
              Informazioni utili per capire se potete correre bene insieme.
            </p>
          </PageContainer>
        </div>

        {/* ── Contenuto ── */}
        <PageContainer width="content" className="py-8 flex flex-col gap-10">

          {/* Runner ispirati — impatto come organizzatore (segnali verificati) */}
          {impact && (
            <ImpactCard
              title="Runner ispirati"
              subtitle="Non quanto corre, ma quante persone fa correre insieme"
              stats={[
                { value: impact.events_verified ?? 0, label: 'uscita organizzata', labelPlural: 'uscite organizzate', icon: 'event' },
                { value: impact.participations ?? 0, label: 'partecipazione generata', labelPlural: 'partecipazioni generate', icon: 'groups' },
                { value: impact.distinct_people ?? 0, label: 'persona coinvolta', labelPlural: 'persone diverse coinvolte', icon: 'diversity_3' },
                { value: impact.returning_people ?? 0, label: 'diventata abituale', labelPlural: 'diventate abituali', icon: 'replay' },
                { value: impact.activated_newcomers ?? 0, label: 'alla prima corsa', labelPlural: 'alla loro prima corsa', icon: 'celebration' },
              ]}
            />
          )}

          {/* Corse organizzate */}
          <section>
            <h2 className="text-lg font-extrabold text-gray-900 mb-5">
              Corse organizzate
              {organizedRuns && organizedRuns.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({organizedRuns.length})</span>
              )}
            </h2>
            {organizedRuns && organizedRuns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(organizedRuns as unknown as Run[]).map(run => <RunCard key={run.id} run={run} />)}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">directions_run</span>
                <p className="text-sm font-semibold text-gray-700">Nessuna corsa organizzata</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isOwn ? 'Proponi la tua prima corsa.' : 'Questo runner non ha ancora organizzato corse.'}
                </p>
                {isOwn && (
                  <Link href="/nuova-corsa"
                    className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline">
                    <span className="material-symbols-outlined text-base">add</span>
                    Proponi una corsa
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* ── Momenti ── */}
          {momenti.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">photo_camera</span>
                Momenti
                <span className="text-sm font-normal text-gray-400">({momenti.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {momenti.map(m => (
                  <MomentoCard key={m.id} momento={{ ...m, author: p }} showRun size="sm" />
                ))}
              </div>
            </section>
          )}

          {/* ── Attività Strava (profilo pubblico) ── */}
          {p.strava_public_profile && stravaActivities.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FC4C02] text-xl">directions_run</span>
                Corse recenti
                <span className="text-sm font-normal text-gray-400">({stravaActivities.length})</span>
              </h2>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {stravaActivities.map(a => {
                  const km = a.distance_m ? a.distance_m / 1000 : 0
                  const elev = a.total_elevation_gain_m ? Math.round(a.total_elevation_gain_m) : 0
                  return (
                    <a
                      key={a.id}
                      href={`https://www.strava.com/activities/${a.strava_activity_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-full bg-[#FC4C02]/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#FC4C02] text-lg">directions_run</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        {a.name && (
                          <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1">
                            {a.name}
                            <span className="material-symbols-outlined text-[13px] text-gray-300 group-hover:text-[#FC4C02] transition-colors">open_in_new</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {new Date(a.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-600 shrink-0">
                        {km > 0 && <span className="font-semibold text-gray-800">{formatDistance(a.distance_m ?? 0)}</span>}
                        {a.avg_pace_s_per_km && <span>{formatPace(a.avg_pace_s_per_km)}/km</span>}
                        {a.avg_heartrate_bpm && (
                          <span className="hidden sm:flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px] text-red-400">cardiology</span>
                            {Math.round(a.avg_heartrate_bpm)} bpm
                          </span>
                        )}
                        {elev > 0 && (
                          <span className="hidden sm:flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px] text-gray-400">altitude</span>
                            {elev} m
                          </span>
                        )}
                        {a.moving_time_s && <span className="hidden sm:inline">{formatTime(a.moving_time_s)}</span>}
                      </div>
                    </a>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">bolt</span>
                Dati sincronizzati da Strava
              </p>
            </section>
          )}

          {/* ── Recensioni ── */}
          <section>
            <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-lg font-extrabold text-gray-900">
                Cosa dicono i runner
                {reviewCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">({reviewCount})</span>
                )}
              </h2>
              {reviewCount >= 2 && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-black text-gray-900">{avgRating.toFixed(1)}</p>
                    <StarsDisplay rating={avgRating} size="sm" />
                    <p className="text-xs text-gray-400 mt-0.5">{reviewCount} {reviewCount === 1 ? 'recensione' : 'recensioni'}</p>
                  </div>
                  {/* Distribuzione stelle */}
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    {distribution.map(d => (
                      <div key={d.stars} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-2">{d.stars}</span>
                        <span className="text-amber-400 text-xs">★</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: reviewCount > 0 ? `${(d.count / reviewCount) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-3">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {reviews.length > 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 divide-y divide-gray-50">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} showRun />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">star</span>
                <p className="text-sm font-semibold text-gray-700">Ancora nessuna recensione</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                  {isOwn
                    ? 'Le recensioni appariranno qui dopo le tue corse.'
                    : `Sii il primo a correre con ${p.full_name.split(' ')[0]}.`}
                </p>
              </div>
            )}
          </section>

          {user && !isOwn && (
            <div className="mt-8 flex justify-center">
              <ReportButton entityTable="profiles" entityId={id} reportedUserId={id} label="Segnala questo profilo" />
            </div>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}
