'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function JoinCrewButton({ crewId }: { crewId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleJoin() {
    setLoading(true)
    const res = await fetch(`/api/crew/${crewId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      if (data.status === 'active') {
        router.refresh()
      } else {
        setIsPending(true)
      }
      setDone(true)
    }
  }

  if (isPending) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">schedule</span>
        Richiesta inviata — in attesa di approvazione.
      </div>
    )
  }

  if (done) return null

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full bg-[var(--color-primary)] text-white font-semibold rounded-2xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? 'Invio...' : 'Chiedi di entrare'}
    </button>
  )
}
