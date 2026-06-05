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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link href="/" className="text-2xl font-extrabold text-primary">Vieni a correre?</Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-on-surface mb-2">Bentornato</h1>
            <p className="text-sm text-on-surface-variant mb-8">Accedi per trovare la tua prossima corsa.</p>

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
              {error && <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
                Accedi
              </Button>
            </form>
          </div>
          <p className="text-center text-sm text-on-surface-variant mt-6">
            Non hai un account?{' '}
            <Link href="/registrati" className="text-primary font-semibold hover:underline">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
