'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import type { CrewPost, Profile } from '@/lib/types'

type BoardPost = CrewPost & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

function relativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CrewBoard({
  crewId,
  posts,
  canManage,
  coachLabel,
}: {
  crewId: string
  posts: BoardPost[]
  canManage: boolean
  coachLabel: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sessione scaduta'); setSaving(false); return }

    const { error: err } = await supabase
      .from('crew_posts')
      .insert({ crew_id: crewId, author_id: user.id, body: text, pinned })

    setSaving(false)
    if (err) { setError(err.message); return }
    setBody('')
    setPinned(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from('crew_posts').delete().eq('id', id)
    if (!err) router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-base">campaign</span>
        Bacheca {coachLabel ? `del ${coachLabel}` : ''}
      </h2>

      {canManage && (
        <form onSubmit={handlePost} className="mb-5">
          <textarea
            rows={3}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Scrivi un messaggio alla crew — allenamenti, avvisi, motivazione…"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer mt-2 w-fit">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded"
            />
            <span className="material-symbols-outlined text-[15px]">push_pin</span>
            In evidenza
          </label>
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="w-full mt-3 bg-primary text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">send</span>
            {saving ? 'Pubblicazione…' : 'Pubblica messaggio'}
          </button>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </form>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nessun messaggio per ora.
          {canManage ? ' Scrivi il primo aggiornamento per la crew.' : ''}
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className={`rounded-xl p-4 ${p.pinned ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <Avatar name={p.author?.full_name ?? '?'} src={p.author?.avatar_url ?? null} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.author && (
                      <Link href={`/profilo/${p.author.id}`} className="font-medium text-sm text-gray-900 hover:text-primary">
                        {p.author.full_name}
                      </Link>
                    )}
                    <span className="text-xs text-gray-400">· {relativeDay(p.created_at)}</span>
                    {p.pinned && (
                      <span className="material-symbols-outlined text-[14px] text-primary" title="In evidenza">push_pin</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{p.body}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    title="Elimina messaggio"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
