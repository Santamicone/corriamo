'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { interestLabel } from '@/lib/proposals'

/**
 * "Mi interesserebbe" su una proposta (SQL #53). Scrive in proposal_interests con la RLS
 * dell'utente: ognuno tocca solo la propria riga, e solo su proposte aperte.
 */
export function ProposalInterestButton({
  proposalId, userId, initialInterested, initialCount,
}: { proposalId: string; userId: string | null; initialInterested: boolean; initialCount: number }) {
  const [interested, setInterested] = useState(initialInterested)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!userId) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Link href={`/login?next=${encodeURIComponent(`/proposte/${proposalId}`)}`}
          className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
          <span className="material-symbols-outlined text-base">thumb_up</span>
          Accedi per dire che ti interessa
        </Link>
        <span className="text-xs text-gray-400">{interestLabel(count)}</span>
      </div>
    )
  }

  async function toggle() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = interested
      ? await supabase.from('proposal_interests').delete().eq('proposal_id', proposalId).eq('user_id', userId)
      : await supabase.from('proposal_interests').insert({ proposal_id: proposalId, user_id: userId })
    setLoading(false)
    if (err) {
      setError('Non è stato possibile salvare. Riprova tra poco.')
      return
    }
    setCount(c => c + (interested ? -1 : 1))
    setInterested(!interested)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={toggle} disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
          interested
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'
        }`}>
        <span className="material-symbols-outlined text-base">{interested ? 'check' : 'thumb_up'}</span>
        {interested ? 'Ti interessa: ti avviseremo' : 'Mi interesserebbe'}
      </button>
      <span className="text-xs text-gray-400">
        {interestLabel(count)}{interested ? ' · se qualcuno la organizza ricevi una notifica' : ''}
      </span>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
