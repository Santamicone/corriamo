import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import type { FeedItem, FeedMember } from '@/lib/crewFeed'

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
 * Feed della crew: ultimi ingressi. Riceve gli item già assemblati e ordinati da
 * `buildCrewFeed` (src/lib/crewFeed.ts).
 */
export function CrewFeed({
  items,
  isMember = false,
}: {
  items: FeedItem[]
  isMember?: boolean
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
          Ancora niente da mostrare. I nuovi ingressi nella crew appariranno qui.
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
        {items.map((item) => (
          <NewMemberRow key={`m-${item.member.id}`} member={item.member} />
        ))}
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
