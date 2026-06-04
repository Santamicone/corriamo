'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Profile } from '@/lib/types'

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: profile.full_name,
    city: profile.city ?? '',
    level: profile.level ?? 'tutti',
    pace_min: profile.pace_min?.toString() ?? '',
    pace_max: profile.pace_max?.toString() ?? '',
    bio: profile.bio ?? '',
    strava_url: profile.strava_url ?? '',
    garmin_url: profile.garmin_url ?? '',
    instagram_url: profile.instagram_url ?? '',
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update({
      full_name: form.full_name,
      city: form.city || null,
      level: form.level,
      pace_min: form.pace_min ? parseFloat(form.pace_min) : null,
      pace_max: form.pace_max ? parseFloat(form.pace_max) : null,
      bio: form.bio || null,
      strava_url: form.strava_url || null,
      garmin_url: form.garmin_url || null,
      instagram_url: form.instagram_url || null,
    }).eq('id', profile.id)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => { router.push(`/profilo/${profile.id}`); router.refresh() }, 1000)
  }

  return (
    <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 pb-5 border-b border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Informazioni runner</p>
        <Input label="Nome e cognome" value={form.full_name} onChange={update('full_name')} required />
        <Input label="Città" value={form.city} onChange={update('city')} placeholder="Milano" />
        <Select label="Livello" value={form.level} onChange={update('level')}>
          <option value="tutti">Tutti i livelli</option>
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzato">Avanzato</option>
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Ritmo min (min/km)" type="number" step="0.1" value={form.pace_min} onChange={update('pace_min')} placeholder="es. 5.5" />
          <Input label="Ritmo max (min/km)" type="number" step="0.1" value={form.pace_max} onChange={update('pace_max')} placeholder="es. 6.5" />
        </div>
        <Textarea label="Bio" value={form.bio} onChange={update('bio')} placeholder="Racconta qualcosa di te..." rows={3} />
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Link (opzionali)</p>
        <Input label="Profilo Strava" type="url" value={form.strava_url} onChange={update('strava_url')} placeholder="https://www.strava.com/athletes/..." />
        <Input label="Profilo Garmin" type="url" value={form.garmin_url} onChange={update('garmin_url')} placeholder="https://connect.garmin.com/..." />
        <Input label="Instagram" type="url" value={form.instagram_url} onChange={update('instagram_url')} placeholder="https://www.instagram.com/..." />
      </div>

      {success && <p className="text-sm text-tertiary bg-tertiary/10 px-3 py-2 rounded-lg">Profilo aggiornato!</p>}
      <Button type="submit" loading={loading} size="lg">Salva modifiche</Button>
    </form>
  )
}
