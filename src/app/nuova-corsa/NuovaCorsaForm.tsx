'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, type GeoResult } from '@/lib/geocoding'
import { TagPicker } from '@/components/ui/TagPicker'

const LocationPreviewMap = dynamic(() => import('@/components/LocationPreviewMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-gray-100 animate-pulse border border-gray-200" style={{ height: 240 }} />
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
  const [tags, setTags] = useState<string[]>([])

  /* ── Geocoding state ── */
  const [geoStatus,    setGeoStatus]    = useState<GeoStatus>('idle')
  const [geoResult,    setGeoResult]    = useState<GeoResult | null>(null)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [userDragged,  setUserDragged]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  /* Quando l'utente trascina il pin manualmente */
  const handlePinDragged = useCallback((lat: number, lng: number) => {
    setManualCoords({ lat, lng })
    setUserDragged(true)
  }, [])

  /* Ripristina il geocoding automatico */
  const resetManualPin = () => {
    setManualCoords(null)
    setUserDragged(false)
  }

  /* Geocoding automatico con debounce */
  const runGeocode = useCallback(async (location: string, city: string) => {
    if (city.trim().length < 2) {
      setGeoStatus('idle')
      setGeoResult(null)
      return
    }
    // Reset pin manuale ogni volta che l'indirizzo cambia
    setManualCoords(null)
    setUserDragged(false)
    setGeoStatus('loading')

    const result = await geocodeAddress(location, city)

    if (!result) {
      setGeoStatus('not_found')
      setGeoResult(null)
      return
    }

    const displayLower   = result.display_name.toLowerCase()
    const locationWords  = location.toLowerCase().split(' ').filter(w => w.length > 3)
    const isPrecise      = locationWords.some(w => displayLower.includes(w))

    setGeoStatus(isPrecise ? 'found' : 'city_only')
    setGeoResult(result)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runGeocode(form.location, form.city), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.location, form.city, runGeocode])

  /* Coordinate effettive da usare per il DB e la mappa */
  const effectiveCoords = userDragged ? manualCoords : geoResult

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let coords = effectiveCoords
    if (!coords && form.location && form.city) {
      coords = await geocodeAddress(form.location, form.city)
    }

    const supabase = createClient()
    const { data, error: err } = await supabase.from('runs').insert({
      organizer_id:     userId,
      title:            form.title,
      description:      form.description  || null,
      date:             form.date,
      time:             form.time,
      location:         form.location,
      city:             form.city,
      distance_km:      form.distance_km  ? parseFloat(form.distance_km)   : null,
      pace_target:      form.pace_target  || null,
      level:            form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop:       form.is_no_drop,
      tags:             tags,
      status:           'aperta',
      series_id:        form.series_id   || null,
      lat:              coords?.lat       ?? null,
      lng:              coords?.lng       ?? null,
    }).select('id').single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/corse/${data.id}`)
    router.refresh()
  }

  const today = new Date().toISOString().split('T')[0]

  /* ── Blocco mappa ── */
  const MapBlock = () => {
    if (geoStatus === 'loading') return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
        <span className="w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        Cerco la posizione sulla mappa…
      </div>
    )

    if (geoStatus === 'not_found') return (
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">warning</span>
        <div>
          <p className="text-xs font-semibold text-amber-800">Posizione non trovata</p>
          <p className="text-xs text-amber-600 mt-0.5">
            La corsa verrà pubblicata ma non apparirà sulla mappa.
            Prova con un indirizzo più preciso (via, piazza, nome di un parco noto).
          </p>
        </div>
      </div>
    )

    if (!effectiveCoords) return null

    return (
      <div className="flex flex-col gap-2">
        {/* Status pill */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {userDragged ? (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">my_location</span>
              Posizione aggiustata manualmente
            </span>
          ) : geoStatus === 'found' ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full truncate max-w-[260px]">
              <span className="material-symbols-filled text-sm">check_circle</span>
              <span className="truncate">{geoResult?.display_name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">info</span>
              Pin posizionato su {form.city} (approssimativo)
            </span>
          )}

          {userDragged && (
            <button
              type="button"
              onClick={resetManualPin}
              className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Ripristina automatico
            </button>
          )}
        </div>

        {/* Mappa */}
        <LocationPreviewMap
          lat={effectiveCoords.lat}
          lng={effectiveCoords.lng}
          label={form.location || form.city}
          onPositionChange={handlePinDragged}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Dove e quando ── */}
      <FormSection title="Dove e quando">

        {/* 1. Città — per prima */}
        <div>
          <label className={labelCls}>Città *</label>
          <input
            className={inputCls}
            value={form.city}
            onChange={set('city')}
            placeholder="es. Perugia, Milano, Roma…"
            required
          />
        </div>

        {/* 2. Luogo di ritrovo — dopo la città, con didascalia estesa */}
        <div>
          <label className={labelCls}>Punto di ritrovo *</label>
          <input
            className={inputCls}
            value={form.location}
            onChange={set('location')}
            placeholder="es. Ingresso principale Parco Tezio, Via Roma 15, Piazza IV Novembre"
            required
          />
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Indica un luogo preciso e facilmente riconoscibile: il nome di un parco o ingresso specifico,
            un indirizzo con numero civico, una piazza o un monumento noto.
            Più è preciso, più facilmente gli altri runner ti trovano.
          </p>
        </div>

        {/* Feedback geocoding + mappa */}
        <MapBlock />

        {/* Data e orario */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelCls}>Data *</label>
            <input className={inputCls} type="date" min={today} value={form.date} onChange={set('date')} required />
          </div>
          <div>
            <label className={labelCls}>Orario di partenza *</label>
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
            placeholder="Racconta di cosa si tratta: tipo di percorso, ritmo indicativo, cosa aspettarsi…"
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
      <FormSection title="Ritmo e distanza" desc="Anche una stima va bene. Aiuta gli altri a capire se il ritmo è compatibile.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distanza (km)</label>
            <input className={inputCls} type="number" step="0.5" min="0.5" value={form.distance_km} onChange={set('distance_km')} placeholder="es. 10" />
          </div>
          <div>
            <label className={labelCls}>Ritmo target</label>
            <input className={inputCls} value={form.pace_target} onChange={set('pace_target')} placeholder="es. 5:30/km" />
            <p className="text-xs text-gray-400 mt-1">Puoi indicare un ritmo preciso o un intervallo, es. 5:00–5:30/km.</p>
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

      {/* ── Caratteristiche ── */}
      <FormSection
        title="Caratteristiche della corsa"
        desc="Seleziona tutto ciò che descrive meglio il tuo appuntamento."
      >
        <TagPicker selected={tags} onChange={setTags} />
      </FormSection>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 disabled:opacity-60">
          <span className="material-symbols-outlined text-lg">
            {loading ? 'hourglass_empty' : 'add_circle'}
          </span>
          {loading ? 'Pubblicazione…' : 'Pubblica la corsa'}
        </button>
        {geoStatus === 'not_found' ? (
          <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            La corsa verrà pubblicata senza pin sulla mappa.
          </p>
        ) : (
          <p className="text-xs text-gray-400 text-center">Potrai modificarla se qualcosa cambia.</p>
        )}
      </div>
    </form>
  )
}
