'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'loading' | 'enroll' | 'codes' | 'error'

export function MfaSetup() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [qr, setQr] = useState('')        // SVG data-uri del QR
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const enroll = useCallback(async () => {
    const supabase = createClient()
    // Pulisce eventuali fattori non verificati rimasti da un tentativo precedente
    const { data: list } = await supabase.auth.mfa.listFactors()
    for (const f of list?.all ?? []) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) { setError(error.message); setStep('error'); return }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('enroll')
  }, [])

  useEffect(() => { enroll() }, [enroll])

  const verify = async () => {
    setBusy(true); setError('')
    const supabase = createClient()
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return }
    const verify = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.data.id, code: code.trim(),
    })
    if (verify.error) { setError(verify.error.message); setBusy(false); return }

    // Sessione ora AAL2 → genera i codici di recupero
    const res = await fetch('/api/admin/mfa/recovery-codes', { method: 'POST' })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Errore generazione codici'); setBusy(false); return }
    setCodes(json.codes)
    setStep('codes')
    setBusy(false)
  }

  if (step === 'loading') return <p className="text-sm text-gray-400">Preparazione…</p>
  if (step === 'error') return (
    <div className="text-sm text-red-600">
      {error} <button onClick={enroll} className="underline">Riprova</button>
    </div>
  )

  if (step === 'codes') return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-amber-900 mb-1">Salva questi codici di recupero</p>
        <p className="text-xs text-amber-800">
          Ti servono se perdi il dispositivo. Vengono mostrati una sola volta. Conservali in un posto sicuro.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-gray-900 text-green-300 rounded-xl p-4 mb-4">
        {codes.map(c => <span key={c}>{c}</span>)}
      </div>
      <button onClick={() => router.replace('/admin')}
        className="w-full py-2.5 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors">
        Ho salvato i codici, continua
      </button>
    </div>
  )

  // step === 'enroll'
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code 2FA" className="w-48 h-48 mx-auto bg-white rounded-xl p-2 border border-gray-200" />
      <p className="text-xs text-gray-400 text-center mt-2">
        Oppure inserisci la chiave: <code className="text-gray-600 break-all">{secret}</code>
      </p>
      <label className="block text-sm font-semibold text-gray-700 mt-5 mb-1">Codice a 6 cifre</label>
      <input
        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" placeholder="000000"
        className="w-full text-center tracking-[0.4em] text-xl font-mono border border-gray-300 rounded-xl py-2.5"
      />
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <button onClick={verify} disabled={busy || code.length !== 6}
        className="w-full mt-4 py-2.5 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
        {busy ? 'Verifica…' : 'Attiva 2FA'}
      </button>
    </div>
  )
}
