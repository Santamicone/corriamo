'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const inputCls = "h-11 w-full px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
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
    level: 'principiante', bio: '',
    strava_url: '', garmin_url: '', instagram_url: '',
  })

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name:     form.full_name,
          city:          form.city,
          level:         form.level,
          bio:           form.bio,
          strava_url:    form.strava_url,
          garmin_url:    form.garmin_url,
          instagram_url: form.instagram_url,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/bacheca')
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
            <p className="text-sm text-gray-500 mt-1">Unisciti alla community. Corri con gli altri.</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">

            {/* Account */}
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

            {/* Profilo runner */}
            <Section title="Profilo runner">
              <Input
                label="Nome e cognome"
                value={form.full_name}
                onChange={update('full_name')}
                placeholder="Mario Rossi"
                required
              />
              <Input
                label="Città"
                value={form.city}
                onChange={update('city')}
                placeholder="Milano"
              />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Livello
                </label>
                <select
                  value={form.level}
                  onChange={update('level')}
                  className={inputCls}
                >
                  <option value="principiante">Principiante — sto iniziando</option>
                  <option value="intermedio">Intermedio — corro regolarmente</option>
                  <option value="avanzato">Avanzato — corro forte</option>
                  <option value="amatore_gare">Amatore, ma faccio gare</option>
                  <option value="atleta">Atleta agonista</option>
                </select>
              </div>
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={update('bio')}
                placeholder="Racconta qualcosa di te come runner: dove corri di solito, i tuoi obiettivi…"
                rows={3}
              />
            </Section>

            {/* Link social */}
            <Section title="Link (opzionali)">
              <Input
                label="Profilo Strava"
                type="url"
                value={form.strava_url}
                onChange={update('strava_url')}
                placeholder="https://www.strava.com/athletes/..."
              />
              <Input
                label="Profilo Garmin"
                type="url"
                value={form.garmin_url}
                onChange={update('garmin_url')}
                placeholder="https://connect.garmin.com/..."
              />
              <Input
                label="Instagram"
                type="url"
                value={form.instagram_url}
                onChange={update('instagram_url')}
                placeholder="https://www.instagram.com/..."
              />
              <p className="text-xs text-gray-400 -mt-1">
                Potrai aggiungere Personal Best, età e altri dettagli dal tuo profilo dopo la registrazione.
              </p>
            </Section>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Crea profilo e accedi
            </Button>
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
