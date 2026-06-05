'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { addWeeks, addDays, format, nextDay, parseISO, getDay } from 'date-fns'
import { DAY_LABELS } from '@/lib/utils'
import { TagPicker } from '@/components/ui/TagPicker'

const WEEKS_AHEAD = 8

function generateDates(startDate: string, recurrenceDay: number, recurrenceType: string): string[] {
  const dates: string[] = []
  let current = parseISO(startDate)
  const targetDay = recurrenceDay as 0 | 1 | 2 | 3 | 4 | 5 | 6

  if (getDay(current) !== targetDay) {
    current = nextDay(current, targetDay)
  }

  const endDate = addWeeks(parseISO(startDate), WEEKS_AHEAD)

  while (current <= endDate) {
    dates.push(format(current, 'yyyy-MM-dd'))
    if (recurrenceType === 'settimanale') current = addWeeks(current, 1)
    else if (recurrenceType === 'bisettimanale') current = addWeeks(current, 2)
    else current = addDays(current, 30)
  }

  return dates
}

export function NuovaSerieForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '', description: '', location: '', city: '',
    distance_km: '', pace_target: '', level: 'tutti',
    max_participants: '', is_no_drop: false,
    recurrence_type: 'settimanale', recurrence_day: '6',
    recurrence_time: '07:00', start_date: '',
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: seriesData, error: seriesErr } = await supabase.from('series').insert({
      organizer_id: userId,
      title: form.title,
      description: form.description || null,
      location: form.location,
      city: form.city,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      pace_target: form.pace_target || null,
      level: form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop: form.is_no_drop,
      tags,
      recurrence_type: form.recurrence_type,
      recurrence_day: parseInt(form.recurrence_day),
      recurrence_time: form.recurrence_time,
      start_date: form.start_date,
    }).select('id').single()

    if (seriesErr || !seriesData) { setError(seriesErr?.message ?? 'Errore'); setLoading(false); return }

    const dates = generateDates(form.start_date, parseInt(form.recurrence_day), form.recurrence_type)
    const runs = dates.map(date => ({
      organizer_id: userId,
      series_id: seriesData.id,
      title: `${form.title} — ${format(parseISO(date), 'dd/MM/yyyy')}`,
      description: form.description || null,
      date,
      time: form.recurrence_time,
      location: form.location,
      city: form.city,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      pace_target: form.pace_target || null,
      level: form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop: form.is_no_drop,
      tags,
      status: 'aperta',
    }))

    await supabase.from('runs').insert(runs)

    router.push(`/serie/${seriesData.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Input label="Nome della serie *" value={form.title} onChange={update('title')} placeholder="es. Lunedì al Parco Sempione" required />
        <Textarea label="Descrizione" value={form.description} onChange={update('description')} placeholder="Di cosa si tratta..." rows={3} />
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Luogo</p>
        <Input label="Luogo di ritrovo *" value={form.location} onChange={update('location')} placeholder="es. Ingresso Arco della Pace" required />
        <Input label="Città *" value={form.city} onChange={update('city')} placeholder="Milano" required />
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ricorrenza</p>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Frequenza *" value={form.recurrence_type} onChange={update('recurrence_type')}>
            <option value="settimanale">Ogni settimana</option>
            <option value="bisettimanale">Ogni due settimane</option>
            <option value="mensile">Ogni mese</option>
          </Select>
          <Select label="Giorno *" value={form.recurrence_day} onChange={update('recurrence_day')}>
            {DAY_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Orario *" type="time" value={form.recurrence_time} onChange={update('recurrence_time')} required />
          <Input label="Data di inizio *" type="date" min={today} value={form.start_date} onChange={update('start_date')} required />
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-sm mr-1">auto_awesome</span>
          Verranno generati automaticamente i prossimi <strong>{WEEKS_AHEAD} appuntamenti</strong> a partire dalla data di inizio.
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Dettagli</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Distanza (km)" type="number" step="0.5" value={form.distance_km} onChange={update('distance_km')} placeholder="es. 10" />
          <Input label="Ritmo target" value={form.pace_target} onChange={update('pace_target')} placeholder="es. 5:30/km" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Livello" value={form.level} onChange={update('level')}>
            <option value="tutti">Tutti i livelli</option>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzato">Avanzato</option>
          </Select>
          <Input label="Max partecipanti" type="number" min="2" value={form.max_participants} onChange={update('max_participants')} placeholder="(opzionale)" />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_no_drop} onChange={e => setForm(prev => ({ ...prev, is_no_drop: e.target.checked }))} className="w-4 h-4 accent-primary rounded" />
          <span className="text-sm text-on-surface"><strong>No Drop</strong> — nessuno viene lasciato indietro</span>
        </label>
      </div>

      {/* Caratteristiche */}
      <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Caratteristiche della serie
        </p>
        <p className="text-xs text-on-surface-variant -mt-2">
          Seleziona tutto ciò che descrive meglio questa serie ricorrente.
        </p>
        <TagPicker selected={tags} onChange={setTags} />
      </div>

      {error && <p className="text-sm text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        <span className="material-symbols-outlined text-lg">event_repeat</span>
        Crea serie e genera appuntamenti
      </Button>
    </form>
  )
}
