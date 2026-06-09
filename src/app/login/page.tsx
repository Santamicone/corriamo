'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Email not confirmed'
        ? 'Devi confermare la tua email prima di accedere. Controlla la tua casella.'
        : 'Email o password non corretti.')
      setLoading(false)
    } else {
      router.push('/bacheca')
      router.refresh()
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
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 hidden sm:inline">Non hai un account?</span>
            <Link
              href="/registrati"
              className="inline-flex items-center gap-1 bg-primary text-white font-semibold px-4 py-2 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
            >
              Registrati gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Contenuto ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm flex flex-col gap-4">

          {/* Card login */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bentornato</h1>
            <p className="text-sm text-gray-400 mb-7">Accedi per trovare la tua prossima corsa.</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {error && (
                <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>
              )}
              <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
                Accedi
              </Button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              <Link href="/recupera-password" className="hover:text-primary transition-colors">
                Password dimenticata?
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">sei nuovo qui?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Card Registrati */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
            <p className="text-base font-bold text-gray-900 mb-1">Crea un account gratuito</p>
            <p className="text-sm text-gray-500 mb-4">
              Unisciti alla community di runner. Proponi corse, trova compagni, partecipa alle uscite vicino a te.
            </p>
            <ul className="flex flex-col gap-1.5 mb-5">
              {[
                { icon: 'check_circle', text: 'Completamente gratis, per sempre' },
                { icon: 'lock',         text: 'I tuoi dati sono al sicuro' },
                { icon: 'edit',         text: 'Completa il profilo quando vuoi, dopo' },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
            <Link
              href="/registrati"
              className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Registrati gratis
            </Link>
          </div>

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
