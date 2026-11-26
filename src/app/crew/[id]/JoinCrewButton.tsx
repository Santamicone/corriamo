'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function JoinCrewButton({ crewId }: { crewId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleJoin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/crew/${crewId}/members`, { method: 'POST' })
      if (res.ok) {
        router.refresh() // la pagina mostra "in attesa di approvazione"
        return // il bottone resta disabilitato fino al refresh
      }
      const data = await res.json().catch(() => null)
      setError(data?.error ?? 'Richiesta non inviata. Riprova.')
    } catch {
      setError('Richiesta non inviata. Controlla la connessione e riprova.')
    }
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full bg-[var(--color-primary)] text-white font-semibold rounded-2xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Invio...' : 'Chiedi di entrare'}
      </button>
      {error && <p role="alert" className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  )
}
