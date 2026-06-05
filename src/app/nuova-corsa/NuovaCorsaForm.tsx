'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  userSeries: { id: string; title: string }[]
}

const inputCls = "h-11 w-full px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5"

function FormSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export function NuovaCorsaForm({ userId, userSeries }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '07:00',
    location: '', city: '', distance_km: '', pace_target: '',
    level: 'tutti', max_participants: '', is_no_drop: false, series_id: '',
  })

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Dove e quando */}
      <FormSection title="Dove e quando" desc="Indica un punto di ritrovo facile da trovare.">
        <div>
          <label className={labelCls}>Luogo di ritrovo *</label>
          <input className={inputCls} value={form.location} onChange={set('location')} placeholder="es. Ingresso Arco della Pace" required />
        </div>
        <div>
          <label className={labelCls}>Città *</label>
          <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Milano" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data *</label>
            <input className={inputCls} type="date" min={today} value={form.date} onChange={set('date')} required />
          </div>
          <div>
            <label className={labelCls}>Orario *</label>
            <input className={inputCls} type="time" value={form.time} onChange={set('time')} required />
          </div>
        </div>
      </FormSection>

      {/* Tipo di allenamento */}
      <FormSection title="Tipo di allenamento" desc="Aiuta gli altri a capire se la corsa fa al caso loro.">
        <div>
          <label className={labelCls}>Titolo della corsa *</label>
          <input className={inputCls} value={form.title} onChange={set('title')} placeholder="es. Mattinata al Parco Sempione" required />
        </div>
        <div>
          <label className={labelCls}>Descrizione</label>
          <textarea
            value={form.description} onChange={set('description')}
            placeholder="Racconta di cosa si tratta, il tipo di percorso, il ritmo indicativo..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className={labelCls}>Livello</label>
          <div className="relative">
            <select className={inputCls} value={form.level} onChange={set('level')}>
              <option value="tutti">Tutti i livelli</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzato">Avanzato</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <input type="checkbox" checked={form.is_no_drop}
            onChange={e => setForm(p => ({ ...p, is_no_drop: e.target.checked }))}
            className="w-4 h-4 rounded accent-primary" />
          <div>
            <span className="text-sm font-semibold text-gray-900">No drop</span>
            <p className="text-xs text-gray-400">Si parte insieme e si rientra insieme. Nessuno viene lasciato indietro.</p>
          </div>
        </label>
      </FormSection>

      {/* Ritmo e distanza */}
      <FormSection title="Ritmo e distanza" desc="Anche una stima va bene. L'importante è dare un'idea chiara.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distanza (km)</label>
            <input className={inputCls} type="number" step="0.5" min="0.5" value={form.distance_km} onChange={set('distance_km')} placeholder="es. 10" />
          </div>
          <div>
            <label className={labelCls}>Ritmo target</label>
            <input className={inputCls} value={form.pace_target} onChange={set('pace_target')} placeholder="es. 5:30/km" />
            <p className="text-xs text-gray-400 mt-1">Puoi indicare un ritmo preciso o un intervallo.</p>
          </div>
        </div>
      </FormSection>

      {/* Partecipazione */}
      <FormSection title="Partecipazione" desc="Decidi quante persone possono unirsi.">
        <div>
          <label className={labelCls}>Max partecipanti</label>
          <input className={inputCls} type="number" min="2" value={form.max_participants} onChange={set('max_participants')} placeholder="Lascia vuoto per nessun limite" />
        </div>
        {userSeries.length > 0 && (
          <div>
            <label className={labelCls}>Collega a una serie (opzionale)</label>
            <select className={inputCls} value={form.series_id} onChange={set('series_id')}>
              <option value="">— Corsa singola —</option>
              {userSeries.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        )}
      </FormSection>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 disabled:opacity-60">
          <span className="material-symbols-outlined text-lg">{loading ? 'hourglass_empty' : 'add_circle'}</span>
          {loading ? 'Pubblicazione…' : 'Pubblica la corsa'}
        </button>
        <p className="text-xs text-gray-400 text-center">Potrai modificarla se qualcosa cambia.</p>
      </div>
    </form>
  )
}
