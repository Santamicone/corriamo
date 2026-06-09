'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NuovaPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Le due password non coincidono.')
      return
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Non è stato possibile aggiornare la password. Il link potrebbe essere scaduto.')
      setLoading(false)
    } else {
      router.push('/bacheca?password_updated=1')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Vieni a correre?" className="w-8 h-8 rounded-xl object-contain shadow-sm" />
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">Vieni a correre?</span>
          </Link>
        </div>
      </header>

      {/* ── Contenuto ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-primary text-2xl">lock</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Nuova password</h1>
            <p className="text-sm text-gray-400 mb-7">Scegli una password sicura di almeno 8 caratteri.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Nuova password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                required
                minLength={8}
              />
              <Input
                label="Conferma password"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Ripeti la password"
                required
              />
              {error && (
                <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>
              )}
              <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
                Salva nuova password
              </Button>
            </form>
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
