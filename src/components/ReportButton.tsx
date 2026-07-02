'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  entityTable: 'runs' | 'momenti' | 'reviews' | 'run_chat' | 'profiles'
  entityId: string
  reportedUserId?: string | null
  label?: string
}

/** Pulsante discreto per segnalare un contenuto o un utente allo staff. */
export function ReportButton({ entityTable, entityId, reportedUserId, label = 'Segnala' }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Devi accedere per segnalare.'); setBusy(false); return }
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id, entity_table: entityTable, entity_id: entityId,
      reported_user_id: reportedUserId ?? null, reason: reason.trim(),
    })
    if (error) { setError(error.message); setBusy(false); return }
    setDone(true); setOpen(false); setBusy(false)
  }

  if (done) return <span className="text-xs text-gray-400">Segnalazione inviata, grazie.</span>

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors">
        <span className="material-symbols-outlined text-sm">flag</span> {label}
      </button>
    )
  }

  return (
    <div className="mt-2 w-full max-w-xs">
      <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
        placeholder="Descrivi il problema…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={() => setOpen(false)} disabled={busy}
          className="px-3 py-1 rounded-full text-xs text-gray-500 hover:bg-gray-100">Annulla</button>
        <button onClick={submit} disabled={busy || !reason.trim()}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? 'Invio…' : 'Invia segnalazione'}
        </button>
      </div>
    </div>
  )
}
