'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RecuperaPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/nuova-password`,
    })
    if (error) {
      setError('Si è verificato un errore. Riprova tra qualche minuto.')
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo_small.png" alt="Vieni a correre?" className="w-10 h-10 rounded-xl object-contain shadow-sm" />
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">Vieni a correre?</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Torna al login
          </Link>
        </div>
      </header>

      {/* ── Contenuto ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {sent ? (
            /* Stato: email inviata */
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-3xl">mark_email_read</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Controlla la tua email</h1>
                <p className="text-sm text-gray-500">
                  Abbiamo inviato un link a <span className="font-semibold text-gray-700">{email}</span>.
                  Clicca sul link per impostare una nuova password.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Non trovi l&apos;email? Controlla la cartella spam o{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  riprova
                </button>
                .
              </p>
            </div>
          ) : (
            /* Stato: form */
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-primary text-2xl">lock_reset</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Password dimenticata?</h1>
              <p className="text-sm text-gray-400 mb-7">
                Inserisci la tua email e ti mandiamo un link per reimpostarla.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  required
                />
                {error && (
                  <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
                  Invia link di recupero
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                Ricordi la password?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Accedi
                </Link>
              </p>
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Vieni a correre? — Corri in compagnia, in sicurezza.
          </p>
          <nav className="flex gap-5">
            {[
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/termini', label: 'Termini' },
              { href: 'mailto:info@vieniacorrere.it', label: 'Contatti' },
            ].map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

    </div>
  )
}
