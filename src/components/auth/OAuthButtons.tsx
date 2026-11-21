'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Provider = 'google' | 'facebook'

const LABELS: Record<Provider, string> = {
  google: 'Continua con Google',
  facebook: 'Continua con Facebook',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#fff"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  )
}

/**
 * Accesso / registrazione con provider esterni (Google e Facebook, il login di Meta).
 * Con OAuth account nuovo e account esistente sono lo stesso flusso: se l'email
 * esiste già, Supabase collega l'identità al profilo esistente.
 *
 * `next` è un percorso interno già validato (vedi safeNextPath). Può essere una funzione,
 * valutata solo al click: serve alle pagine che lo leggono da window (niente Suspense).
 */
export function OAuthButtons({ next }: { next: string | (() => string) }) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState('')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const signIn = async (provider: Provider) => {
    setLoading(provider)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(typeof next === 'function' ? next() : next)}`,
      },
    })
    // In caso di successo il browser viene reindirizzato al provider: si arriva qui solo se fallisce.
    if (authError) {
      setError('Non riusciamo ad avviare l’accesso. Riprova tra poco o usa email e password.')
      setLoading(null)
    }
  }

  const busy = loading !== null

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={busy}
        className="flex items-center justify-center gap-3 w-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {loading === 'google' ? (
          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        ) : (
          <GoogleIcon />
        )}
        {LABELS.google}
      </button>

      <button
        type="button"
        onClick={() => signIn('facebook')}
        disabled={busy}
        className="flex items-center justify-center gap-3 w-full bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {loading === 'facebook' ? (
          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        ) : (
          <FacebookIcon />
        )}
        {LABELS.facebook}
      </button>

      {error && (
        <p role="alert" className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  )
}
