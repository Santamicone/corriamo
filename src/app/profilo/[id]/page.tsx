import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import { RunCard } from '@/components/RunCard'
import { ReviewCard } from '@/components/ReviewCard'
import { RatingBadge, StarsDisplay } from '@/components/ui/Stars'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LEVEL_LABELS, formatPace } from '@/lib/utils'
import type { Profile, Run, Review } from '@/lib/types'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!profile) notFound()
  const p = profile as unknown as Profile

  const [{ data: organizedRuns }, { data: reviewsData }] = await Promise.all([
    supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('organizer_id', id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(6),

    supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*), run:runs(id, title, date, city)')
      .eq('reviewed_id', id)
      .order('created_at', { ascending: false }),
  ])

  const reviews = (reviewsData ?? []) as unknown as Review[]
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
  }

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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Avatar name={p.full_name} src={p.avatar_url} size="xl" />
                {p.strava_url && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
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
                  {p.level && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelColors[p.level] ?? levelColors.tutti}`}>
                      {LEVEL_LABELS[p.level]}
                    </span>
                  )}
                  {p.pace_min && (
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <span className="material-symbols-outlined text-base text-primary">speed</span>
                      {formatPace(p.pace_min, p.pace_max)}
                    </span>
                  )}
                  {/* Rating medio inline */}
                  {reviewCount >= 2 && (
                    <RatingBadge average={avgRating} count={reviewCount} />
                  )}
                </div>

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

            <p className="mt-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
              Informazioni utili per capire se potete correre bene insieme.
            </p>
          </div>
        </div>

        {/* ── Contenuto ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">

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
        </div>
      </main>
      <Footer />
    </div>
  )
}
