'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  city: string | null
}

export function AddMemberSearch({ crewId }: { crewId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}&crew_id=${crewId}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, crewId])

  async function addMember(profile: Profile) {
    setAdding(profile.id)
    const res = await fetch(`/api/crew/${crewId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: profile.id }),
    })
    setAdding(null)
    if (res.ok) {
      setAdded((prev) => [...prev, profile.id])
      setResults((prev) => prev.filter((p) => p.id !== profile.id))
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-1">Aggiungi membro</h2>
      <p className="text-sm text-gray-500 mb-4">
        Cerca un runner per nome — viene aggiunto direttamente senza bisogno di approvazione.
      </p>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome…"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
        />
        {loading && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base animate-spin">
            progress_activity
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-3 space-y-1">
          {results.map((profile) => {
            const isAdded = added.includes(profile.id)
            const isAdding = adding === profile.id
            return (
              <li key={profile.id}>
                <button
                  onClick={() => addMember(profile)}
                  disabled={isAdding || isAdded}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60 text-left"
                >
                  <Avatar name={profile.full_name} src={profile.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{profile.full_name}</div>
                    {profile.city && <div className="text-xs text-gray-400">{profile.city}</div>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-primary)]">
                    {isAdded ? '✓ Aggiunto' : isAdding ? '…' : '+ Aggiungi'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-3 text-sm text-gray-400">Nessun runner trovato.</p>
      )}
    </div>
  )
}
