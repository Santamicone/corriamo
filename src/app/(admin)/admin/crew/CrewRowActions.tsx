'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Action = 'hide' | 'show' | 'deactivate' | 'activate'

/** Azioni dell'admin su una scheda: nascondi/mostra e segna come non più attiva/attiva. */
export function CrewRowActions({ id, name, hidden, inactive, editable }: { id: string; name: string; hidden: boolean; inactive: boolean; editable: boolean }) {
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

  /** Eliminazione definitiva, solo dopo conferma esplicita. */
  const remove = async () => {
    const ok = window.confirm(
      `Eliminare definitivamente «${name}»?\n\n` +
      'Non si può annullare: spariscono anche le richieste "Avvisami" e un nuovo import potrebbe ricrearla. ' +
      'Per toglierla solo dalla vista usa "Nascondi".',
    )
    if (!ok) return
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/crew/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Eliminazione non riuscita')
      return
    }
    router.refresh()
  }

  const btn ='px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50'

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
        {editable && (
          <button className="px-3 py-1.5 rounded-full border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            disabled={busy} onClick={remove}>
            Elimina
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
