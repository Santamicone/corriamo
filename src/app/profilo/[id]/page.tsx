import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { RunCard } from '@/components/RunCard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LEVEL_LABELS, formatPace } from '@/lib/utils'
import type { Profile, Run } from '@/lib/types'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!profile) notFound()

  const typedProfile = profile as unknown as Profile

  const { data: organizedRuns } = await supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
    .eq('organizer_id', id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(3)

  const isOwn = user?.id === id

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex flex-col items-center text-center gap-3">
                <Avatar name={typedProfile.full_name} src={typedProfile.avatar_url} size="xl" />
                <div>
                  <h1 className="text-xl font-extrabold text-on-surface">{typedProfile.full_name}</h1>
                  {typedProfile.city && (
                    <p className="text-sm text-on-surface-variant flex items-center justify-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-sm">place</span>
                      {typedProfile.city}
                    </p>
                  )}
                </div>

                {typedProfile.level && (
                  <Badge variant={typedProfile.level === 'principiante' ? 'green' : typedProfile.level === 'avanzato' ? 'orange' : 'default'}>
                    {LEVEL_LABELS[typedProfile.level]}
                  </Badge>
                )}
              </div>

              {(typedProfile.pace_min || typedProfile.pace_max) && (
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Ritmo indicativo</p>
                  <p className="text-lg font-bold text-primary">
                    {formatPace(typedProfile.pace_min!, typedProfile.pace_max)}
                  </p>
                </div>
              )}

              {typedProfile.bio && (
                <p className="text-sm text-on-surface-variant leading-relaxed text-center">{typedProfile.bio}</p>
              )}

              {/* Social links */}
              {(typedProfile.strava_url || typedProfile.garmin_url || typedProfile.instagram_url) && (
                <div className="flex justify-center gap-3 pt-2 border-t border-outline-variant">
                  {typedProfile.strava_url && (
                    <a href={typedProfile.strava_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                      <span className="material-symbols-outlined text-sm">fitness_center</span>
                      Strava
                    </a>
                  )}
                  {typedProfile.garmin_url && (
                    <a href={typedProfile.garmin_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                      <span className="material-symbols-outlined text-sm">watch</span>
                      Garmin
                    </a>
                  )}
                  {typedProfile.instagram_url && (
                    <a href={typedProfile.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Instagram
                    </a>
                  )}
                </div>
              )}

              {isOwn && (
                <Link href="/profilo/modifica" className="mt-2 border-2 border-outline text-on-surface text-sm font-semibold px-4 py-2 rounded-full text-center hover:bg-surface-container transition-colors">
                  Modifica profilo
                </Link>
              )}
            </div>
          </div>

          {/* Runs */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <h2 className="text-lg font-bold text-on-surface">Corse organizzate</h2>
            {organizedRuns && organizedRuns.length > 0 ? (
              <div className="flex flex-col gap-4">
                {(organizedRuns as unknown as Run[]).map(run => <RunCard key={run.id} run={run} />)}
              </div>
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">directions_run</span>
                <p className="text-sm text-on-surface-variant">Nessuna corsa organizzata ancora.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
