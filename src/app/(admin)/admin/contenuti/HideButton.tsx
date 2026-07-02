'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HideButton({ table, id, hidden }: { table: string; id: string; hidden: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const run = async (hide: boolean) => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/content/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, hide, reason }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    setAsking(false); setReason('')
    router.refresh()
    setBusy(false)
  }

  if (hidden) {
    return (
      <button onClick={() => run(false)} disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50">
        <span className="material-symbols-outlined text-sm">visibility</span> Ripristina
      </button>
    )
  }

  if (!asking) {
    return (
      <button onClick={() => setAsking(true)} disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
        <span className="material-symbols-outlined text-sm">visibility_off</span> Nascondi
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opzionale)"
        className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-44" />
      <div className="flex gap-1">
        <button onClick={() => setAsking(false)} disabled={busy}
          className="px-2 py-1 rounded-full text-xs text-gray-500 hover:bg-gray-100">Annulla</button>
        <button onClick={() => run(true)} disabled={busy}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? '…' : 'Conferma'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
