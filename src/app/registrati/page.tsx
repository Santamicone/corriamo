'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', city: '',
    level: 'tutti', pace_min: '', pace_max: '', bio: '',
    strava_url: '', garmin_url: '', instagram_url: '',
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !data.user) {
      setError(authError?.message || 'Errore durante la registrazione.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      city: form.city || null,
      level: form.level,
      pace_min: form.pace_min ? parseFloat(form.pace_min) : null,
      pace_max: form.pace_max ? parseFloat(form.pace_max) : null,
      bio: form.bio || null,
      strava_url: form.strava_url || null,
      garmin_url: form.garmin_url || null,
      instagram_url: form.instagram_url || null,
    })

    if (profileError) {
      setError('Profilo non creato: ' + profileError.message)
      setLoading(false)
      return
    }

    router.push('/bacheca')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link href="/bacheca" className="text-2xl font-extrabold text-primary">Corriamo?</Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-on-surface mb-2">Crea il tuo profilo runner</h1>
            <p className="text-sm text-on-surface-variant mb-8">Unisciti alla community. Corri con gli altri.</p>

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="pb-4 border-b border-outline-variant">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">Account</p>
                <div className="flex flex-col gap-4">
                  <Input label="Email" type="email" value={form.email} onChange={update('email')} placeholder="nome@esempio.it" required />
                  <Input label="Password" type="password" value={form.password} onChange={update('password')} placeholder="Minimo 8 caratteri" required minLength={8} />
                </div>
              </div>

              <div className="pb-4 border-b border-outline-variant">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">Profilo runner</p>
                <div className="flex flex-col gap-4">
                  <Input label="Nome e cognome" value={form.full_name} onChange={update('full_name')} placeholder="Mario Rossi" required />
                  <Input label="Città" value={form.city} onChange={update('city')} placeholder="Milano" />
                  <Select label="Livello" value={form.level} onChange={update('level')}>
                    <option value="tutti">Tutti i livelli</option>
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzato">Avanzato</option>
                  </Select>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Ritmo min (min/km)" type="number" step="0.1" min="3" max="12" value={form.pace_min} onChange={update('pace_min')} placeholder="es. 5.5" hint="es. 5.5 = 5:30/km" />
                    <Input label="Ritmo max (min/km)" type="number" step="0.1" min="3" max="12" value={form.pace_max} onChange={update('pace_max')} placeholder="es. 6.5" />
                  </div>
                  <Textarea label="Bio" value={form.bio} onChange={update('bio')} placeholder="Racconta qualcosa di te come runner..." rows={3} />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">Link (opzionali)</p>
                <div className="flex flex-col gap-4">
                  <Input label="Profilo Strava" type="url" value={form.strava_url} onChange={update('strava_url')} placeholder="https://www.strava.com/athletes/..." />
                  <Input label="Profilo Garmin" type="url" value={form.garmin_url} onChange={update('garmin_url')} placeholder="https://connect.garmin.com/..." />
                  <Input label="Instagram" type="url" value={form.instagram_url} onChange={update('instagram_url')} placeholder="https://www.instagram.com/..." />
                </div>
              </div>

              {error && <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                Crea profilo e accedi
              </Button>
            </form>
          </div>
          <p className="text-center text-sm text-on-surface-variant mt-6">
            Hai già un account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
