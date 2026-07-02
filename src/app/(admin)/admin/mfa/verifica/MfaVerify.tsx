'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MfaVerify() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const verify = async () => {
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.[0]
    if (fErr || !totp) { setError('Nessun fattore 2FA trovato.'); setBusy(false); return }

    const challenge = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return }
    const verified = await supabase.auth.mfa.verify({
      factorId: totp.id, challengeId: challenge.data.id, code: code.trim(),
    })
    if (verified.error) { setError(verified.error.message); setBusy(false); return }

    router.replace('/admin')
    router.refresh()
  }

  return (
    <div>
      <input
        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" placeholder="000000" autoFocus
        className="w-full text-center tracking-[0.4em] text-xl font-mono border border-gray-300 rounded-xl py-2.5"
      />
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <button onClick={verify} disabled={busy || code.length !== 6}
        className="w-full mt-4 py-2.5 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
        {busy ? 'Verifica…' : 'Accedi'}
      </button>
    </div>
  )
}
