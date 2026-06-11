'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress } from '@/lib/geocoding'
import { todayItaly } from '@/lib/utils'

const inputCls = "h-12 w-full px-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-medium"
const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5"

interface Props {
  userId: string
  defaultCity: string
}

export function SpotForm({ userId, defaultCity }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  /* Pre-compila orario = adesso + 30 min */
  const defaultTime = () => {
    const d = new Date(Date.now() + 30 * 60 * 1000)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const today = todayItaly()

  const [form, setForm] = useState({
    location: '',
    city: defaultCity,
    time: defaultTime(),
    level: 'tutti',
    distance_km: '',
    is_no_drop: false,
    title: '',
  })

  /* Ricalcola il default time ogni minuto per rimanere aggiornato */
  useEffect(() => {
    const id = setInterval(() => {
      setForm(p => ({ ...p, time: defaultTime() }))
    }, 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  const set = (f: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }))

  /* Titolo auto se lasciato vuoto */
  const resolvedTitle = form.title.trim() ||
    `Corsa spontanea${form.city ? ` a ${form.city}` : ''}${form.time ? ` — ${form.time}` : ''}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.location || !form.city) { setError('Inserisci almeno città e punto di ritrovo.'); return }
    setLoading(true)
    setError('')

    const coords = await geocodeAddress(form.location, form.city)

    const supabase = createClient()
    const { data, error: err } = await supabase.from('runs').insert({
      organizer_id:  userId,
      title:         resolvedTitle,
      date:          today,
      time:          form.time,
      location:      form.location,
      city:          form.city,
      level:         form.level,
      distance_km:   form.distance_km ? parseFloat(form.distance_km) : null,
      is_no_drop:    form.is_no_drop,
      is_spot:       true,
      status:        'aperta',
      lat:           coords?.lat ?? null,
      lng:           coords?.lng ?? null,
    }).select('id').single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/corse/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Dove */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <p className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">place</span>
          Dove si parte?
        </p>
        <div>
          <label className={labelCls}>Città *</label>
          <input className={inputCls} value={form.city} onChange={set('city')} placeholder="es. Perugia" required />
        </div>
        <div>
          <label className={labelCls}>Punto di ritrovo *</label>
          <input className={inputCls} value={form.location} onChange={set('location')} placeholder="es. Piazza IV Novembre, Parco Tezio" required />
        </div>
      </div>

      {/* Quando */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <p className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">schedule</span>
          A che ora?
        </p>
        <div>
          <label className={labelCls}>Orario di partenza *</label>
          <input className={inputCls} type="time" value={form.time} onChange={set('time')} required />
          <p className="text-xs text-gray-400 mt-1.5">Oggi, {today.split('-').reverse().join('/')}</p>
        </div>
      </div>

      {/* Come */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
        <p className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">directions_run</span>
          Tipo di corsa
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Livello</label>
            <select className={inputCls} value={form.level} onChange={set('level')}>
              <option value="tutti">Tutti i livelli</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzato">Avanzato</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Distanza (km)</label>
            <input className={inputCls} type="number" step="0.5" min="1" value={form.distance_km} onChange={set('distance_km')} placeholder="opzionale" />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
          <input type="checkbox" checked={form.is_no_drop}
            onChange={e => setForm(p => ({ ...p, is_no_drop: e.target.checked }))}
            className="w-4 h-4 rounded accent-primary" />
          <div>
            <span className="text-sm font-semibold text-gray-900">No drop</span>
            <p className="text-xs text-green-600">Si parte e si rientra tutti insieme.</p>
          </div>
        </label>
      </div>

      {/* Titolo opzionale */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className={labelCls}>Titolo (opzionale)</label>
        <input className={inputCls} value={form.title} onChange={set('title')}
          placeholder={resolvedTitle} />
        <p className="text-xs text-gray-400 mt-1.5">
          Se lasci vuoto: <em>&ldquo;{resolvedTitle}&rdquo;</em>
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{error}</p>
      )}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-lg shadow-orange-200/50 disabled:opacity-60">
        <span className="material-symbols-outlined text-xl">{loading ? 'hourglass_empty' : 'bolt'}</span>
        {loading ? 'Pubblicazione…' : 'Pubblica adesso'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Comparirà subito nella striscia "Adesso" della bacheca.
      </p>
    </form>
  )
}
