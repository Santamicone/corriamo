'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MfaRecover() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const recover = async () => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/mfa/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Errore'); setBusy(false); return }
    // Fattore rimosso → riconfigura da capo
    router.replace('/admin/mfa/setup')
    router.refresh()
  }

  return (
    <div>
      <input
        value={code} onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX" autoFocus
        className="w-full text-center tracking-widest font-mono border border-gray-300 rounded-xl py-2.5"
      />
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <button onClick={recover} disabled={busy || code.trim().length < 8}
        className="w-full mt-4 py-2.5 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
        {busy ? 'Verifica…' : 'Recupera accesso'}
      </button>
    </div>
  )
}
