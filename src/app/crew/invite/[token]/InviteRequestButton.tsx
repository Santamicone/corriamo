'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InviteRequestButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleRequest() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/crew/invite/${token}`, { method: 'POST' })
      if (res.ok) {
        // La pagina si ridisegna: "richiesta inviata", oppure la scheda se sono già membro
        router.refresh()
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
    <>
      <button
        onClick={handleRequest}
        disabled={loading}
        className="block w-full bg-[var(--color-primary)] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Invio...' : 'Chiedi di entrare'}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  )
}
