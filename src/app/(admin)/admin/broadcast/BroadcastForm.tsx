'use client'

import { useState } from 'react'

export function BroadcastForm() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<'all' | 'city'>('all')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const send = async () => {
    if (!confirm('Confermi l’invio dell’annuncio in-app al segmento selezionato?')) return
    setBusy(true); setError(''); setResult('')
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, segment, city }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    setResult(`Inviato a ${json.recipients} utenti.`)
    setSubject(''); setBody('')
    setBusy(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 max-w-lg">
      <label className="block text-sm font-semibold text-gray-700 mb-1">Segmento</label>
      <div className="flex gap-2 mb-4">
        {(['all', 'city'] as const).map(s => (
          <button key={s} onClick={() => setSegment(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              segment === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {s === 'all' ? 'Tutti gli utenti' : 'Per città'}
          </button>
        ))}
      </div>
      {segment === 'city' && (
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Città (es. Milano)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
      )}

      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Oggetto"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Messaggio…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400">Solo notifica in-app (nessuna email di massa).</p>
        <button onClick={send} disabled={busy || !subject.trim() || !body.trim()}
          className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? 'Invio…' : 'Invia annuncio'}
        </button>
      </div>
      {result && <p className="text-sm text-green-600 mt-2">{result}</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
