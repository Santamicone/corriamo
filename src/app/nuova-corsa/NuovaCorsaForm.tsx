'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

interface Props {
  userId: string
  userSeries: { id: string; title: string }[]
}

export function NuovaCorsaForm({ userId, userSeries }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '07:00',
    location: '', city: '', distance_km: '', pace_target: '',
    level: 'tutti', max_participants: '', is_no_drop: false,
    series_id: '',
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: err } = await supabase.from('runs').insert({
      organizer_id: userId,
      title: form.title,
      description: form.description || null,
      date: form.date,
      time: form.time,
      location: form.location,
      city: form.city,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      pace_target: form.pace_target || null,
      level: form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop: form.is_no_drop,
      status: 'aperta',
      series_id: form.series_id || null,
    }).select('id').single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/corse/${data.id}`)
    router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Input label="Titolo corsa *" value={form.title} onChange={update('title')} placeholder="es. Mattinata in Sempione" required />
        <Textarea label="Descrizione" value={form.description} onChange={update('description')} placeholder="Racconta di cosa si tratta..." rows={3} />
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Quando e dove</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Data *" type="date" min={today} value={form.date} onChange={update('date')} required />
          <Input label="Orario *" type="time" value={form.time} onChange={update('time')} required />
        </div>
        <Input label="Luogo di ritrovo *" value={form.location} onChange={update('location')} placeholder="es. Ingresso Arco della Pace" required />
        <Input label="Città *" value={form.city} onChange={update('city')} placeholder="Milano" required />
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Dettagli corsa</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Distanza (km)" type="number" step="0.5" min="0.5" value={form.distance_km} onChange={update('distance_km')} placeholder="es. 10" />
          <Input label="Ritmo target" value={form.pace_target} onChange={update('pace_target')} placeholder="es. 5:30/km" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Livello" value={form.level} onChange={update('level')}>
            <option value="tutti">Tutti i livelli</option>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzato">Avanzato</option>
          </Select>
          <Input label="Max partecipanti" type="number" min="2" value={form.max_participants} onChange={update('max_participants')} placeholder="es. 10 (opzionale)" />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_no_drop}
            onChange={e => setForm(prev => ({ ...prev, is_no_drop: e.target.checked }))}
            className="w-4 h-4 accent-primary rounded"
          />
          <span className="text-sm text-on-surface">
            <strong>No Drop</strong> — nessuno viene lasciato indietro
          </span>
        </label>
      </div>

      {userSeries.length > 0 && (
        <div className="pt-4 border-t border-outline-variant">
          <Select label="Collega a una serie (opzionale)" value={form.series_id} onChange={update('series_id')}>
            <option value="">— Corsa singola —</option>
            {userSeries.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        <span className="material-symbols-outlined text-lg">add</span>
        Pubblica corsa
      </Button>
    </form>
  )
}
