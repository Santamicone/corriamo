'use client'

import { useState } from 'react'

export function MessageForm({ userId }: { userId: string }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [withEmail, setWithEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/users/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subject, body, withEmail }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    setSubject(''); setBody(''); setDone(true); setBusy(false)
    setTimeout(() => setDone(false), 4000)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Oggetto"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Messaggio…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={withEmail} onChange={e => setWithEmail(e.target.checked)} />
          Invia anche via email
        </label>
        <div className="flex items-center gap-3">
          {done && <span className="text-xs text-green-600">Inviato ✓</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button onClick={send} disabled={busy || !subject.trim() || !body.trim()}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
            {busy ? 'Invio…' : 'Invia messaggio'}
          </button>
        </div>
      </div>
    </div>
  )
}
