'use client'
import { useEffect, useState } from 'react'
import { boardSeenKey } from './seen'

interface Props {
  scope: 'crew' | 'run'
  scopeId: string
  /** created_at dell'ultimo messaggio della bacheca (ISO), o null se vuota. */
  latestMessageAt: string | null
}

/**
 * Pallino di notifica "nuovi messaggi" per il link alla bacheca.
 * Confronta l'ultimo messaggio con il valore "visto" salvato in localStorage.
 * Reso solo client-side (localStorage) → parte nascosto per evitare mismatch
 * di hydration.
 */
export function BoardUnreadDot({ scope, scopeId, latestMessageAt }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!latestMessageAt) { setShow(false); return }
    let seen: string | null = null
    try { seen = localStorage.getItem(boardSeenKey(scope, scopeId)) } catch { /* storage non disponibile */ }
    const isNew = !seen || new Date(latestMessageAt).getTime() > new Date(seen).getTime()
    setShow(isNew)
  }, [scope, scopeId, latestMessageAt])

  if (!show) return null

  return (
    <span
      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white"
      aria-label="Nuovi messaggi"
      title="Nuovi messaggi"
    />
  )
}
