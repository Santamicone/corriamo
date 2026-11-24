'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Ritira una proposta aperta: sparisce dalla bacheca, chi era interessato non viene avvisato. */
export function WithdrawProposalButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const withdraw = async () => {
    if (!window.confirm(`Ritirare «${title}»? Sparisce dalla bacheca e non si può più adottare.`)) return
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/proposte/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ritira' }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Azione non riuscita')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button onClick={withdraw} disabled={busy}
        className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        Ritira
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
