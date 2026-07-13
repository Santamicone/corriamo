import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistance, formatPace, formatTime } from '@/lib/running/time'
import type { StravaActivity, Profile } from '@/lib/types'

type FeedActivity = StravaActivity & {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

function relativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export function CrewActivityFeed({
  activities,
  isMember = false,
}: {
  activities: FeedActivity[]
  isMember?: boolean
}) {
  if (activities.length === 0) {
    // Per i visitatori esterni non mostriamo un riquadro vuoto: la sezione
    // compare solo se c'è qualcosa da vedere. Ai membri lasciamo l'invito a
    // collegare Strava.
    if (!isMember) return null
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#FC4C02] text-base">directions_run</span>
          Attività recenti
        </h2>
        <p className="text-sm text-gray-400">
          Nessuna corsa condivisa per ora. I membri che collegano Strava vedranno qui le loro corse.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#FC4C02] text-base">directions_run</span>
        Attività recenti
      </h2>
      <div className="space-y-3">
        {activities.map((a) => {
          const km = a.distance_m ? a.distance_m / 1000 : 0
          const elev = a.total_elevation_gain_m ? Math.round(a.total_elevation_gain_m) : 0
          return (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <Avatar name={a.user.full_name} src={a.user.avatar_url} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link href={`/profilo/${a.user_id}`} className="font-medium text-sm text-gray-900 hover:text-[var(--color-primary)]">
                    {a.user.full_name}
                  </Link>
                  <span className="text-xs text-gray-400">· {relativeDay(a.start_date)}</span>
                </div>
                {a.name && (
                  <a
                    href={`https://www.strava.com/activities/${a.strava_activity_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 truncate hover:text-[#FC4C02] inline-flex items-center gap-1"
                  >
                    {a.name}
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                )}
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
                  {km > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">footprint</span>
                      {formatDistance(a.distance_m ?? 0)}
                    </span>
                  )}
                  {a.avg_pace_s_per_km && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">speed</span>
                      {formatPace(a.avg_pace_s_per_km)}/km
                    </span>
                  )}
                  {a.avg_heartrate_bpm && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-red-400">cardiology</span>
                      {Math.round(a.avg_heartrate_bpm)} bpm
                    </span>
                  )}
                  {elev > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-gray-400">altitude</span>
                      {elev} m
                    </span>
                  )}
                  {a.moving_time_s && (
                    <span className="flex items-center gap-1">
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
      <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">bolt</span>
        Ogni atleta sceglie cosa condividere · dati da Strava
      </p>
    </div>
  )
}
