'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'

interface PickedProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Props {
  value: PickedProfile | null
  onChange: (profile: PickedProfile | null) => void
}

export function CoOrganizerPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickedProfile[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
        <Avatar name={value.full_name} src={value.avatar_url} size="sm" />
        <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{value.full_name}</span>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery('') }}
          className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors shrink-0"
        >
          Rimuovi
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome…"
          className="w-full h-11 pl-9 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {loading && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base animate-spin">
            progress_activity
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
          {results.map((profile) => (
            <li key={profile.id}>
              <button
                type="button"
                onClick={() => { onChange(profile); setResults([]); setQuery('') }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                <span className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">Nessun runner trovato.</p>
      )}
    </div>
  )
}
