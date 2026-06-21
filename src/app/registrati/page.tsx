'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function OAuthButtons() {
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const signInWithGoogle = async () => {
    setLoadingGoogle(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback?next=/bacheca?welcome=1` },
    })
  }

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loadingGoogle}
      className="flex items-center justify-center gap-3 w-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
    >
      {loadingGoogle ? (
        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      Continua con Google
    </button>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', city: '',
  })
  const [geoLoading, setGeoLoading] = useState(false)

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const detectCity = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
            { signal: AbortSignal.timeout(7000) }
          )
          if (res.ok) {
            const data = await res.json()
            if (data?.city) setForm(prev => ({ ...prev, city: data.city }))
          }
        } catch { /* silenzioso: l'utente può digitare a mano */ }
        finally { setGeoLoading(false) }
      },
      () => setGeoLoading(false),
      { timeout: 8000, maximumAge: 300_000 }
    )
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: form.full_name,
          city:      form.city,
          level:     'principiante',
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Email di conferma richiesta → mostra pagina dedicata
    if (!data.session) {
      router.push('/registrati/conferma')
      return
    }

    router.push('/bacheca?welcome=1')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <header className="px-6 py-5 border-b border-gray-100 bg-white">
        <Link href="/" className="text-xl font-extrabold text-primary">Vieni a correre?</Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg flex flex-col gap-5">

          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Crea il tuo profilo runner</h1>
            <p className="text-sm text-gray-500 mt-1">Bastano nome, email e città. Aggiungi il resto dopo.</p>
          </div>

          <OAuthButtons />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">oppure con email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">

            <Section title="Account">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="nome@esempio.it"
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Minimo 8 caratteri"
                required
                minLength={8}
              />
            </Section>

            <Section title="Chi sei" subtitle="Visibile agli altri runner">
              <Input
                label="Nome e cognome"
                value={form.full_name}
                onChange={update('full_name')}
                placeholder="Mario Rossi"
                required
              />
              <div>
                <Input
                  label="Città"
                  value={form.city}
                  onChange={update('city')}
                  placeholder="Milano"
                />
                <button
                  type="button"
                  onClick={detectCity}
                  disabled={geoLoading}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-sm ${geoLoading ? 'animate-spin' : ''}`}>
                    {geoLoading ? 'progress_activity' : 'my_location'}
                  </span>
                  {geoLoading ? 'Rilevamento…' : 'Usa la mia posizione'}
                </button>
              </div>
            </Section>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Crea profilo e accedi
            </Button>

            <p className="text-center text-xs text-gray-400">
              Livello, bio, Personal Best e link social li aggiungi dal profilo dopo la registrazione.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500">
            Hai già un account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
