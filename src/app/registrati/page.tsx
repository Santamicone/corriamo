'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
