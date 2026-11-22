'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/**
 * "Avvisami quando arriva su Vieni a correre" (docs/MAPPA-CREW.md §2.5, SQL #51).
 * Scrive in crew_interests con la RLS dell'utente: ognuno tocca solo la propria riga.
 */
export function NotifyMeButton({
  crewId, userId, initialInterested,
}: { crewId: string; userId: string | null; initialInterested: boolean }) {
  const [interested, setInterested] = useState(initialInterested)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!userId) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/crew/${crewId}`)}`}
        className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 rounded-full px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors">
        <span className="material-symbols-outlined text-base">notifications</span>
        Accedi per essere avvisato
      </Link>
    )
  }

  async function toggle() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = interested
      ? await supabase.from('crew_interests').delete().eq('crew_id', crewId).eq('user_id', userId)
      : await supabase.from('crew_interests').insert({ crew_id: crewId, user_id: userId })
    setLoading(false)
    if (err) {
      setError('Non è stato possibile salvare. Riprova tra poco.')
      return
    }
    setInterested(!interested)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={toggle} disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          interested
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-[var(--color-primary)] text-white hover:opacity-90'
        }`}>
        <span className="material-symbols-outlined text-base">{interested ? 'notifications_active' : 'notifications'}</span>
        {interested ? 'Ti avviseremo — annulla' : 'Avvisami quando arriva su Vieni a correre'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
