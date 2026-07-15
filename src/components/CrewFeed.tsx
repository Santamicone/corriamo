import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistance, formatPace, formatTime } from '@/lib/running/time'
import type { FeedItem, FeedActivity, FeedMember } from '@/lib/crewFeed'

function relativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

/**
 * Feed unificato della crew: attività Strava, nuovi membri e insight generati in
 * un'unica timeline. Sostituisce la vecchia sezione "Attività recenti". Riceve gli
 * item già assemblati e ordinati da `buildCrewFeed` (src/lib/crewFeed.ts).
 */
export function CrewFeed({
  items,
  isMember = false,
  seeAllHref,
}: {
  items: FeedItem[]
  isMember?: boolean
  /** Se presente, mostra il link all'elenco completo degli allenamenti. */
  seeAllHref?: string
}) {
  if (items.length === 0) {
    // Ai visitatori esterni non mostriamo un riquadro vuoto.
    if (!isMember) return null
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-base">dynamic_feed</span>
          Bacheca attività
        </h2>
        <p className="text-sm text-gray-400">
          Ancora niente da mostrare. Le corse condivise dai membri che collegano Strava
          e i nuovi ingressi appariranno qui.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-base">dynamic_feed</span>
        Bacheca attività
      </h2>
      <div className="space-y-3">
        {items.map((item, i) => {
          if (item.kind === 'activity') return <ActivityRow key={`a-${item.activity.id}`} activity={item.activity} />
          if (item.kind === 'new_member') return <NewMemberRow key={`m-${item.member.id}`} member={item.member} />
          return <InsightRow key={`i-${i}`} text={item.text} icon={item.icon} />
        })}
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[var(--color-primary)] transition-colors"
        >
          <span className="material-symbols-outlined text-base">leaderboard</span>
          Tutti gli allenamenti
        </Link>
      )}
      <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">bolt</span>
        Attività da Strava · ogni atleta sceglie cosa condividere
      </p>
    </div>
  )
}

function ActivityRow({ activity: a }: { activity: FeedActivity }) {
  const km = a.distance_m ? a.distance_m / 1000 : 0
  const elev = a.total_elevation_gain_m ? Math.round(a.total_elevation_gain_m) : 0
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
          {km > 0 && (
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
}

function NewMemberRow({ member: m }: { member: FeedMember }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="relative shrink-0">
        <Avatar name={m.user.full_name} src={m.user.avatar_url} size="md" />
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[9px]">add</span>
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/profilo/${m.user_id}`} className="font-medium text-sm text-gray-900 hover:text-[var(--color-primary)]">
            {m.user.full_name}
          </Link>
          <span className="text-xs text-gray-400">· {relativeDay(m.joined_at)}</span>
        </div>
        <p className="text-xs text-gray-500">
          si è unito alla crew{m.user.city ? ` · ${m.user.city}` : ''}
        </p>
      </div>
    </div>
  )
}

function InsightRow({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
      <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">{icon}</span>
      </span>
      <p className="text-sm text-gray-700 font-medium leading-snug">{text}</p>
    </div>
  )
}
