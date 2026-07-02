'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ReportActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = async (next: string) => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    router.refresh()
    setBusy(false)
  }

  const btn = 'px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50'
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {status === 'open' && (
          <button onClick={() => set('reviewing')} disabled={busy}
            className={`${btn} border-blue-200 text-blue-700 hover:bg-blue-50`}>In lavorazione</button>
        )}
        <button onClick={() => set('resolved')} disabled={busy}
          className={`${btn} border-green-200 text-green-700 hover:bg-green-50`}>Risolvi</button>
        <button onClick={() => set('dismissed')} disabled={busy}
          className={`${btn} border-gray-200 text-gray-500 hover:bg-gray-50`}>Ignora</button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
