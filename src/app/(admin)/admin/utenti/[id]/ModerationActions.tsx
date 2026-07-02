'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Action = 'warning' | 'suspension' | 'ban' | 'revoke'

export function ModerationActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter()
  const [open, setOpen] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canRevoke = status === 'suspended' || status === 'banned' || status === 'warned'

  const submit = async (action: Action) => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/users/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, reason, note, days }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    setOpen(null); setReason(''); setNote('')
    router.refresh()
    setBusy(false)
  }

  const btn = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setOpen('warning'); setError('') }} disabled={busy}
          className={`${btn} border-amber-200 text-amber-700 hover:bg-amber-50`}>
          <span className="material-symbols-outlined text-sm">warning</span> Ammonisci
        </button>
        <button onClick={() => { setOpen('suspension'); setError('') }} disabled={busy}
          className={`${btn} border-orange-200 text-orange-700 hover:bg-orange-50`}>
          <span className="material-symbols-outlined text-sm">pause_circle</span> Sospendi
        </button>
        <button onClick={() => { setOpen('ban'); setError('') }} disabled={busy}
          className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}>
          <span className="material-symbols-outlined text-sm">block</span> Blocca
        </button>
        {canRevoke && (
          <button onClick={() => submit('revoke')} disabled={busy}
            className={`${btn} border-green-200 text-green-700 hover:bg-green-50`}>
            <span className="material-symbols-outlined text-sm">restart_alt</span> Revoca provvedimenti
          </button>
        )}
      </div>

      {open && open !== 'revoke' && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {open === 'suspension' && (
            <label className="block text-sm mb-3">
              <span className="font-semibold text-gray-700">Durata sospensione (giorni)</span>
              <input type="number" min={1} value={days}
                onChange={e => setDays(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm block" />
            </label>
          )}
          <label className="block text-sm">
            <span className="font-semibold text-gray-700">Motivazione (comunicata all&apos;utente)</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm mt-2">
            <span className="font-semibold text-gray-700">Nota interna (opzionale, non visibile all&apos;utente)</span>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setOpen(null)} disabled={busy}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:bg-gray-100">Annulla</button>
            <button onClick={() => submit(open)} disabled={busy || !reason.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
              {busy ? 'Invio…' : 'Conferma provvedimento'}
            </button>
          </div>
        </div>
      )}
      {error && !open && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
