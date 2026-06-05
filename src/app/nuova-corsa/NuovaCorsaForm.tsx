'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, type GeoResult } from '@/lib/geocoding'

/* Mini-mappa di anteprima — client only */
const LocationPreviewMap = dynamic(() => import('@/components/LocationPreviewMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-gray-100 animate-pulse border border-gray-200" style={{ height: 220 }} />
  ),
})

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

type GeoStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'city_only'

export function NuovaCorsaForm({ userId, userSeries }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '07:00',
    location: '', city: '', distance_km: '', pace_target: '',
    level: 'tutti', max_participants: '', is_no_drop: false, series_id: '',
  })

  /* ── Stato geocoding ── */
  const [geoStatus,  setGeoStatus]  = useState<GeoStatus>('idle')
  const [geoResult,  setGeoResult]  = useState<GeoResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  /* ── Geocoding automatico con debounce ──
     Si attiva quando sia location che city sono compilate (≥3 caratteri)
     dopo 800ms dall'ultimo keystroke                                     */
  const runGeocode = useCallback(async (location: string, city: string) => {
    if (location.trim().length < 3 || city.trim().length < 2) {
      setGeoStatus('idle')
      setGeoResult(null)
      return
    }

    setGeoStatus('loading')
    const result = await geocodeAddress(location, city)

    if (!result) {
      setGeoStatus('not_found')
      setGeoResult(null)
      return
    }

    // Controlla se il risultato è preciso (contiene il luogo) o solo la città
    const displayLower = result.display_name.toLowerCase()
    const locationWords = location.toLowerCase().split(' ').filter(w => w.length > 3)
    const isPrecise = locationWords.some(w => displayLower.includes(w))

    setGeoStatus(isPrecise ? 'found' : 'city_only')
    setGeoResult(result)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runGeocode(form.location, form.city)
    }, 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.location, form.city, runGeocode])

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Riusa il risultato già ottenuto in-form, oppure esegue un ultimo geocoding
    let coords = geoResult
    if (!coords && form.location && form.city) {
      coords = await geocodeAddress(form.location, form.city)
    }

    const supabase = createClient()
    const { data, error: err } = await supabase.from('runs').insert({
      organizer_id:   userId,
      title:          form.title,
      description:    form.description || null,
      date:           form.date,
      time:           form.time,
      location:       form.location,
      city:           form.city,
      distance_km:    form.distance_km    ? parseFloat(form.distance_km)   : null,
      pace_target:    form.pace_target    || null,
      level:          form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop:     form.is_no_drop,
      status:         'aperta',
      series_id:      form.series_id || null,
      lat:            coords?.lat ?? null,
      lng:            coords?.lng ?? null,
    }).select('id').single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/corse/${data.id}`)
    router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]

  /* ── Helpers UI stato geocoding ── */
  const GeoIndicator = () => {
    if (geoStatus === 'idle')     return null
    if (geoStatus === 'loading')  return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        Cerco la posizione sulla mappa…
      </div>
    )
    if (geoStatus === 'not_found') return (
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">warning</span>
        <div>
          <p className="text-xs font-semibold text-amber-800">Posizione non trovata sulla mappa</p>
          <p className="text-xs text-amber-600 mt-0.5">
            La corsa verrà pubblicata ma non apparirà sulla mappa. Prova a essere più preciso:
            usa il nome di una via, un parco noto o un landmark riconoscibile.
          </p>
        </div>
      </div>
    )
    if (geoStatus === 'city_only') return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
          <span className="material-symbols-outlined text-blue-500 text-base shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-xs font-semibold text-blue-800">Trovata solo la città</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Il pin sarà posizionato in zona <strong>{form.city}</strong>, non nel punto esatto.
              Per maggiore precisione aggiungi una via o un luogo noto.
            </p>
          </div>
        </div>
        {geoResult && (
          <LocationPreviewMap lat={geoResult.lat} lng={geoResult.lng} label={form.location || form.city} />
        )}
      </div>
    )
    if (geoStatus === 'found' && geoResult) return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="material-symbols-filled text-green-600 text-base shrink-0">check_circle</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-800">Posizione trovata ✓</p>
            <p className="text-xs text-green-600 truncate">{geoResult.display_name}</p>
          </div>
        </div>
        <LocationPreviewMap lat={geoResult.lat} lng={geoResult.lng} label={form.location || form.city} />
      </div>
    )
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Dove e quando ── */}
      <FormSection
        title="Dove e quando"
        desc="Inserisci luogo e città: la posizione verrà verificata sulla mappa qui sotto."
      >
        <div>
          <label className={labelCls}>Luogo di ritrovo *</label>
          <input
            className={inputCls}
            value={form.location}
            onChange={set('location')}
            placeholder="es. Ingresso Arco della Pace, Via Roma 10, Parco Sempione"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Più è preciso, più facilmente gli altri runner lo trovano sulla mappa.
          </p>
        </div>

        <div>
          <label className={labelCls}>Città *</label>
          <input
            className={inputCls}
            value={form.city}
            onChange={set('city')}
            placeholder="Milano"
            required
          />
        </div>

        {/* Feedback geocoding inline */}
        <GeoIndicator />

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

      {/* ── Tipo di allenamento ── */}
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
          <select className={inputCls} value={form.level} onChange={set('level')}>
            <option value="tutti">Tutti i livelli</option>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzato">Avanzato</option>
          </select>
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

      {/* ── Ritmo e distanza ── */}
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

      {/* ── Partecipazione ── */}
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
        {geoStatus === 'not_found' && (
          <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            La corsa verrà pubblicata senza pin sulla mappa.
          </p>
        )}
        {geoStatus !== 'not_found' && (
          <p className="text-xs text-gray-400 text-center">Potrai modificarla se qualcosa cambia.</p>
        )}
      </div>
    </form>
  )
}
