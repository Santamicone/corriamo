'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, type GeoResult } from '@/lib/geocoding'
import { TagPicker } from '@/components/ui/TagPicker'
import { addWeeks, addDays, format, nextDay, parseISO, getDay } from 'date-fns'
import { DAY_LABELS, cn } from '@/lib/utils'

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
type TipoCorsa = 'singola' | 'serie'

const WEEKS_AHEAD = 8

function generateDates(startDate: string, recurrenceDay: number, recurrenceType: string): string[] {
  const dates: string[] = []
  let current = parseISO(startDate)
  const targetDay = recurrenceDay as 0 | 1 | 2 | 3 | 4 | 5 | 6
  if (getDay(current) !== targetDay) current = nextDay(current, targetDay)
  const endDate = addWeeks(parseISO(startDate), WEEKS_AHEAD)
  while (current <= endDate) {
    dates.push(format(current, 'yyyy-MM-dd'))
    if (recurrenceType === 'settimanale')       current = addWeeks(current, 1)
    else if (recurrenceType === 'bisettimanale') current = addWeeks(current, 2)
    else                                         current = addDays(current, 30)
  }
  return dates
}

export function NuovaCorsaForm({ userId, userSeries }: Props) {
  const router = useRouter()
  const [tipo, setTipo]       = useState<TipoCorsa>('singola')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [tags, setTags]       = useState<string[]>([])

  const [form, setForm] = useState({
    // Campi comuni
    title: '', description: '', location: '', city: '',
    distance_km: '', pace_target: '', level: 'tutti',
    max_participants: '', is_no_drop: false, series_id: '',
    location_public: true,
    // Campi corsa singola
    date: '', time: '07:00',
    // Campi serie
    recurrence_type: 'settimanale', recurrence_day: '1',
    recurrence_time: '07:00', start_date: '',
  })

  /* ── Geocoding ── */
  const [geoStatus,    setGeoStatus]    = useState<GeoStatus>('idle')
  const [geoResult,    setGeoResult]    = useState<GeoResult | null>(null)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [userDragged,  setUserDragged]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  const handlePinDragged = useCallback((lat: number, lng: number) => {
    setManualCoords({ lat, lng }); setUserDragged(true)
  }, [])

  const resetManualPin = () => { setManualCoords(null); setUserDragged(false) }

  const runGeocode = useCallback(async (location: string, city: string) => {
    if (city.trim().length < 2) { setGeoStatus('idle'); setGeoResult(null); return }
    setManualCoords(null); setUserDragged(false); setGeoStatus('loading')
    const result = await geocodeAddress(location, city)
    if (!result) { setGeoStatus('not_found'); setGeoResult(null); return }
    const displayLower  = result.display_name.toLowerCase()
    const locationWords = location.toLowerCase().split(' ').filter(w => w.length > 3)
    const isPrecise     = locationWords.some(w => displayLower.includes(w))
    setGeoStatus(isPrecise ? 'found' : 'city_only')
    setGeoResult(result)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runGeocode(form.location, form.city), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.location, form.city, runGeocode])

  const effectiveCoords = userDragged ? manualCoords : geoResult
  const today = new Date().toISOString().split('T')[0]

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()

    let coords = effectiveCoords
    if (!coords && form.location && form.city) coords = await geocodeAddress(form.location, form.city)

    if (tipo === 'singola') {
      /* ── Corsa singola ── */
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
        location_public:  form.location_public,
        tags,
        status:           'aperta',
        series_id:        form.series_id   || null,
        lat:              coords?.lat       ?? null,
        lng:              coords?.lng       ?? null,
      }).select('id').single()

      if (err) { setError(err.message); setLoading(false); return }
      router.push(`/corse/${data.id}`)
      router.refresh()

    } else {
      /* ── Serie ricorrente ── */
      const { data: seriesData, error: seriesErr } = await supabase.from('series').insert({
        organizer_id:     userId,
        title:            form.title,
        description:      form.description  || null,
        location:         form.location,
        city:             form.city,
        distance_km:      form.distance_km  ? parseFloat(form.distance_km)   : null,
        pace_target:      form.pace_target  || null,
        level:            form.level,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        is_no_drop:       form.is_no_drop,
        location_public:  form.location_public,
        tags,
        recurrence_type:  form.recurrence_type,
        recurrence_day:   parseInt(form.recurrence_day),
        recurrence_time:  form.recurrence_time,
        start_date:       form.start_date,
      }).select('id').single()

      if (seriesErr || !seriesData) { setError(seriesErr?.message ?? 'Errore'); setLoading(false); return }

      const dates = generateDates(form.start_date, parseInt(form.recurrence_day), form.recurrence_type)
      const runs = dates.map(date => ({
        organizer_id:     userId,
        series_id:        seriesData.id,
        title:            `${form.title} — ${format(parseISO(date), 'dd/MM/yyyy')}`,
        description:      form.description || null,
        date,
        time:             form.recurrence_time,
        location:         form.location,
        city:             form.city,
        distance_km:      form.distance_km  ? parseFloat(form.distance_km)   : null,
        pace_target:      form.pace_target  || null,
        level:            form.level,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        is_no_drop:       form.is_no_drop,
        location_public:  form.location_public,
        tags,
        status:           'aperta',
        lat:              coords?.lat       ?? null,
        lng:              coords?.lng       ?? null,
      }))

      await supabase.from('runs').insert(runs)
      router.push(`/serie/${seriesData.id}`)
      router.refresh()
    }
  }

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
        <p className="text-xs font-semibold text-amber-800">
          Posizione non trovata. La corsa sarà pubblicata senza pin sulla mappa.
        </p>
      </div>
    )
    if (!effectiveCoords) return null
    return (
      <div className="flex flex-col gap-2">
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
              Pin approssimativo su {form.city}
            </span>
          )}
          {userDragged && (
            <button type="button" onClick={resetManualPin}
              className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span>Ripristina automatico
            </button>
          )}
        </div>
        <LocationPreviewMap lat={effectiveCoords.lat} lng={effectiveCoords.lng}
          label={form.location || form.city} onPositionChange={handlePinDragged} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Selettore tipo ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Tipo di proposta</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'singola', icon: 'directions_run', label: 'Corsa singola',     desc: 'Un appuntamento in una data specifica' },
            { value: 'serie',   icon: 'event_repeat',   label: 'Serie ricorrente',  desc: 'Appuntamenti fissi (settimanali, mensili…)' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipo(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all',
                tipo === opt.value
                  ? 'border-primary bg-orange-50'
                  : 'border-gray-100 hover:border-gray-200 bg-gray-50'
              )}
            >
              <span className={cn(
                'material-symbols-outlined text-2xl',
                tipo === opt.value ? 'text-primary' : 'text-gray-400'
              )}>{opt.icon}</span>
              <div>
                <p className={cn('text-sm font-bold', tipo === opt.value ? 'text-primary' : 'text-gray-700')}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
              </div>
              {tipo === opt.value && (
                <span className="self-end -mt-1 -mb-1 text-primary">
                  <span className="material-symbols-filled text-sm">check_circle</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dove e quando ── */}
      <FormSection title="Dove e quando">
        <div>
          <label className={labelCls}>Città *</label>
          <input className={inputCls} value={form.city} onChange={set('city')}
            placeholder="es. Perugia, Milano, Roma…" required />
        </div>
        <div>
          <label className={labelCls}>Punto di ritrovo *</label>
          <input className={inputCls} value={form.location} onChange={set('location')}
            placeholder="es. Ingresso Parco Sempione, Via Roma 15…" required />
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Indica un luogo preciso e facilmente riconoscibile.
          </p>
        </div>
        <MapBlock />

        {/* Visibilità luogo */}
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={form.location_public}
            onChange={e => setForm(p => ({ ...p, location_public: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900">Luogo di ritrovo pubblico</span>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {form.location_public
                ? 'Tutti possono vedere l\'indirizzo esatto. Disabilita per mostrarlo solo ai partecipanti approvati.'
                : '🔒 Solo i partecipanti approvati vedranno l\'indirizzo esatto. Sulla mappa apparirà un pin generico sulla città.'}
            </p>
          </div>
        </label>

        {tipo === 'singola' ? (
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
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Frequenza *</label>
                <select className={inputCls} value={form.recurrence_type} onChange={set('recurrence_type')}>
                  <option value="settimanale">Ogni settimana</option>
                  <option value="bisettimanale">Ogni due settimane</option>
                  <option value="mensile">Ogni mese</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Giorno *</label>
                <select className={inputCls} value={form.recurrence_day} onChange={set('recurrence_day')}>
                  {DAY_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Orario *</label>
                <input className={inputCls} type="time" value={form.recurrence_time} onChange={set('recurrence_time')} required />
              </div>
              <div>
                <label className={labelCls}>Data di inizio *</label>
                <input className={inputCls} type="date" min={today} value={form.start_date} onChange={set('start_date')} required />
              </div>
            </div>
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">auto_awesome</span>
              <p className="text-xs text-orange-800">
                Verranno generati automaticamente i prossimi <strong>{WEEKS_AHEAD} appuntamenti</strong> a partire dalla data di inizio.
              </p>
            </div>
          </div>
        )}
      </FormSection>

      {/* ── Tipo di allenamento ── */}
      <FormSection title="Tipo di allenamento" desc="Aiuta gli altri a capire se fa al caso loro.">
        <div>
          <label className={labelCls}>Titolo *</label>
          <input className={inputCls} value={form.title} onChange={set('title')}
            placeholder={tipo === 'serie' ? 'es. Lunedì mattina al Parco Sempione' : 'es. Mattinata al Parco Sempione'}
            required />
        </div>
        <div>
          <label className={labelCls}>Descrizione</label>
          <textarea value={form.description} onChange={set('description')}
            placeholder="Percorso, ritmo indicativo, cosa aspettarsi…" rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
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
            <p className="text-xs text-gray-400">Si parte insieme e si rientra insieme.</p>
          </div>
        </label>
      </FormSection>

      {/* ── Ritmo e distanza ── */}
      <FormSection title="Ritmo e distanza" desc="Anche una stima va bene.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distanza (km)</label>
            <input className={inputCls} type="number" step="0.5" min="0.5" value={form.distance_km}
              onChange={set('distance_km')} placeholder="es. 10" />
          </div>
          <div>
            <label className={labelCls}>Ritmo target</label>
            <input className={inputCls} value={form.pace_target} onChange={set('pace_target')} placeholder="es. 5:30/km" />
          </div>
        </div>
      </FormSection>

      {/* ── Partecipazione ── */}
      <FormSection title="Partecipazione" desc="Decidi quante persone possono unirsi.">
        <div>
          <label className={labelCls}>Max partecipanti</label>
          <input className={inputCls} type="number" min="2" value={form.max_participants}
            onChange={set('max_participants')} placeholder="Lascia vuoto per nessun limite" />
        </div>
        {/* Link a serie esistente — solo per corse singole */}
        {tipo === 'singola' && userSeries.length > 0 && (
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
      <FormSection title="Caratteristiche" desc="Seleziona tutto ciò che descrive questo appuntamento.">
        <TagPicker selected={tags} onChange={setTags} />
      </FormSection>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 disabled:opacity-60">
          <span className="material-symbols-outlined text-lg">
            {loading ? 'hourglass_empty' : tipo === 'serie' ? 'event_repeat' : 'add_circle'}
          </span>
          {loading ? 'Pubblicazione…' : tipo === 'serie' ? 'Crea serie e genera appuntamenti' : 'Pubblica la corsa'}
        </button>
        {geoStatus === 'not_found' && (
          <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            Sarà pubblicata senza pin sulla mappa.
          </p>
        )}
      </div>
    </form>
  )
}
