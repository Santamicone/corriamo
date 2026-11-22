'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Action = 'hide' | 'show' | 'deactivate' | 'activate'

/** Azioni dell'admin su una scheda: nascondi/mostra e segna come non più attiva/attiva. */
export function CrewRowActions({ id, hidden, inactive, editable }: { id: string; hidden: boolean; inactive: boolean; editable: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: Action) => {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/crew/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Azione non riuscita')
      return
    }
    router.refresh()
  }

  const btn = 'px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50'

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex flex-wrap justify-end gap-1.5">
        {editable && (
          <Link href={`/admin/crew/${id}/modifica`} className={`${btn} inline-flex items-center`}>Modifica</Link>
        )}
        <button className={btn} disabled={busy} onClick={() => run(hidden ? 'show' : 'hide')}>
          {hidden ? 'Mostra' : 'Nascondi'}
        </button>
        <button className={btn} disabled={busy} onClick={() => run(inactive ? 'activate' : 'deactivate')}>
          {inactive ? 'Segna attiva' : 'Non più attiva'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
