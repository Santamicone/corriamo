import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/guard'
import { formatDate } from '@/lib/utils'
import type { UserModeration } from '@/lib/types'
import { MODERATION_BADGE } from '../status'
import { ModerationActions } from './ModerationActions'
import { MessageForm } from './MessageForm'

const ACTION_LABEL: Record<string, string> = {
  warning: 'Ammonizione', suspension: 'Sospensione', ban: 'Blocco',
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user: admin } = await requireAdmin()
  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, city, level, moderation_status, warned_count, moderation_until, created_at')
    .eq('id', id).maybeSingle()
  if (!profile) notFound()

  const { data: historyRaw } = await supabase
    .from('user_moderation').select('*').eq('user_id', id).order('created_at', { ascending: false })
  const history = (historyRaw ?? []) as unknown as UserModeration[]

  const badge = MODERATION_BADGE[profile.moderation_status as keyof typeof MODERATION_BADGE] ?? MODERATION_BADGE.active
  const isSelf = admin.id === profile.id

  return (
    <div className="max-w-2xl">
      <Link href="/admin/utenti" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-5">
        <span className="material-symbols-outlined text-base">arrow_back</span> Utenti
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900">{profile.full_name ?? '—'}</h1>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {profile.city ?? 'Città non indicata'} · iscritto il {formatDate(profile.created_at)}
          </p>
          {profile.moderation_status === 'suspended' && profile.moderation_until && (
            <p className="text-xs text-orange-600 mt-1">Sospeso fino al {formatDate(profile.moderation_until)}</p>
          )}
        </div>
        <Link href={`/profilo/${profile.id}`} target="_blank"
          className="text-sm text-indigo-600 hover:underline whitespace-nowrap">Profilo pubblico ↗</Link>
      </div>

      {isSelf ? (
        <p className="bg-gray-100 text-gray-500 text-sm rounded-xl p-4 mb-6">Non puoi moderare il tuo stesso account.</p>
      ) : (
        <ModerationActions userId={profile.id} status={profile.moderation_status ?? 'active'} />
      )}

      <div className="mt-8">
        <h2 className="font-bold text-gray-900 mb-3">Invia un messaggio</h2>
        <MessageForm userId={profile.id} />
      </div>

      <div className="mt-8">
        <h2 className="font-bold text-gray-900 mb-3">Storico provvedimenti</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun provvedimento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map(h => (
              <li key={h.id} className="bg-white border border-gray-100 rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{ACTION_LABEL[h.action] ?? h.action}</span>
                  <span className="text-xs text-gray-400">{formatDate(h.created_at)}</span>
                </div>
                <p className="text-gray-600 mt-0.5">{h.reason}</p>
                {h.note && <p className="text-gray-400 text-xs mt-0.5">Nota interna: {h.note}</p>}
                {h.revoked_at && <p className="text-green-600 text-xs mt-0.5">Revocato il {formatDate(h.revoked_at)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
