'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress, type GeoResult } from '@/lib/geocoding'
import { TagPicker } from '@/components/ui/TagPicker'
import { cn } from '@/lib/utils'
import type { Run } from '@/lib/types'

const LocationPreviewMap = dynamic(() => import('@/components/LocationPreviewMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-gray-100 animate-pulse border border-gray-200" style={{ height: 240 }} />
  ),
})

interface Props {
  run: Run & { lat?: number; lng?: number; tags?: string[]; location_public?: boolean; is_spot?: boolean }
  approvedCount: number
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

// Campi che, se modificati, triggherano notifica ai partecipanti
const IMPORTANT_FIELDS = ['date', 'time', 'location', 'city', 'distance_km', 'pace_target', 'level'] as const
type ImportantField = typeof IMPORTANT_FIELDS[number]

type GeoStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'city_only'

export function EditRunForm({ run, approvedCount }: Props) {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [tags, setTags]             = useState<string[]>(run.tags ?? [])

  const [form, setForm] = useState({
    title:            run.title,
    description:      run.description ?? '',
    location:         run.location,
    city:             run.city,
    date:             run.date,
    time:             run.time.slice(0, 5),
    distance_km:      run.distance_km?.toString() ?? '',
    pace_target:      run.pace_target ?? '',
    level:            run.level,
    max_participants: run.max_participants?.toString() ?? '',
    is_no_drop:       run.is_no_drop,
    location_public:  run.location_public ?? true,
  })

  /* ── Geocoding ── */
  const [geoStatus,    setGeoStatus]    = useState<GeoStatus>('idle')
  const [geoResult,    setGeoResult]    = useState<GeoResult | null>(null)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(
    run.lat && run.lng ? { lat: run.lat, lng: run.lng } : null
  )
  const [userDragged,  setUserDragged]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Valori originali per calcolare diff
  const original = useRef({
    date:        run.date,
    time:        run.time.slice(0, 5),
    location:    run.location,
    city:        run.city,
    distance_km: run.distance_km?.toString() ?? '',
    pace_target: run.pace_target ?? '',
    level:       run.level,
  })

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

  // Geocoding solo quando location/city cambiano rispetto all'originale
  const locationChanged = form.location !== original.current.location || form.city !== original.current.city
  useEffect(() => {
    if (!locationChanged) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runGeocode(form.location, form.city), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.location, form.city, locationChanged, runGeocode])

  const effectiveCoords = userDragged
    ? manualCoords
    : geoResult ?? (run.lat && run.lng ? { lat: run.lat, lng: run.lng, display_name: run.location } as GeoResult : null)

  const today = new Date().toISOString().split('T')[0]

  // Controlla se ci sono cambiamenti importanti
  function hasImportantChanges(): boolean {
    return IMPORTANT_FIELDS.some(f => {
      const key = f as ImportantField
      return form[key] !== original.current[key]
    })
  }

  // Validazione max_participants
  function validateMaxParticipants(): string | null {
    if (!form.max_participants) return null
    const val = parseInt(form.max_participants)
    if (val < approvedCount) {
      return `Hai già ${approvedCount} partecipant${approvedCount === 1 ? 'e' : 'i'} approvato/i. Non puoi scendere sotto ${approvedCount}.`
    }
    return null
  }

  /* ── Submit: verifica → eventuale modale → salva ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const maxErr = validateMaxParticipants()
    if (maxErr) { setError(maxErr); return }

    // Se cambiamenti importanti e ci sono partecipanti approvati → chiedi conferma
    if (hasImportantChanges() && approvedCount > 0 && !showConfirm) {
      setShowConfirm(true)
      return
    }

    await save()
  }

  async function save() {
    setLoading(true); setError(''); setShowConfirm(false)
    const supabase = createClient()

    let coords = effectiveCoords
    if (locationChanged && !coords) {
      coords = await geocodeAddress(form.location, form.city)
    }

    const updates: Record<string, unknown> = {
      title:            form.title,
      description:      form.description || null,
      location:         form.location,
      city:             form.city,
      date:             form.date,
      time:             form.time,
      distance_km:      form.distance_km ? parseFloat(form.distance_km) : null,
      pace_target:      form.pace_target || null,
      level:            form.level,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      is_no_drop:       form.is_no_drop,
      location_public:  form.location_public,
      tags,
    }

    // Aggiorna coordinate solo se il luogo è cambiato
    if (locationChanged) {
      updates.lat = coords?.lat ?? null
      updates.lng = coords?.lng ?? null
    }

    const { error: updateErr } = await supabase
      .from('runs')
      .update(updates)
      .eq('id', run.id)

    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Notifica partecipanti se cambiamenti importanti
    if (hasImportantChanges() && approvedCount > 0) {
      const { data: parts } = await supabase
        .from('participations')
        .select('user_id')
        .eq('run_id', run.id)
        .in('status', ['approvata', 'in_attesa'])

      if (parts && parts.length > 0) {
        const notifications = parts
          .filter(p => p.user_id !== run.organizer_id)
          .map(p => ({
            user_id:  p.user_id,
            type:     'corsa_modificata' as const,
            title:    `"${form.title}" è stata modificata`,
            body:     'L\'organizzatore ha aggiornato data, luogo o dettagli. Controlla le novità.',
            run_id:   run.id,
            actor_id: run.organizer_id,
            read:     false,
          }))
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications)
        }
      }
    }

    router.push(`/corse/${run.id}`)
    router.refresh()
  }

  /* ── Mappa ── */
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
          Posizione non trovata. La corsa sarà salvata senza pin sulla mappa.
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
          ) : locationChanged ? (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">info</span>
              Pin approssimativo su {form.city}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-sm">place</span>
              Posizione attuale — trascina per modificare
            </span>
          )}
          {userDragged && (
            <button type="button" onClick={resetManualPin}
              className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span>Ripristina automatico
            </button>
          )}
        </div>
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
    <>
      {/* ── Modale conferma cambiamenti importanti ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">info</span>
              <div>
                <p className="text-sm font-extrabold text-gray-900">Stai modificando dei dettagli importanti</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Hai cambiato data, orario, luogo, distanza, ritmo o livello.
                  I {approvedCount} partecipant{approvedCount === 1 ? 'e' : 'i'} approvato/i riceveranno una notifica.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                Rivedi
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {loading ? 'Salvataggio…' : 'Conferma e notifica'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Banner serie */}
        {run.series_id && (
          <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
            <span className="material-symbols-outlined text-purple-500 text-xl shrink-0">info</span>
            <p className="text-xs text-purple-800 leading-relaxed">
              Stai modificando <strong>solo questo appuntamento</strong>, non l&apos;intera serie ricorrente.
            </p>
          </div>
        )}

        {/* ── Dove e quando ── */}
        <FormSection title="Dove e quando">
          <div>
            <label className={labelCls}>Città *</label>
            <input className={inputCls} value={form.city} onChange={set('city')}
              placeholder="es. Milano, Roma…" required />
          </div>
          <div>
            <label className={labelCls}>Punto di ritrovo *</label>
            <input className={inputCls} value={form.location} onChange={set('location')}
              placeholder="es. Ingresso Parco Sempione…" required />
          </div>
          <MapBlock />

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
                  ? 'Tutti possono vedere l\'indirizzo esatto.'
                  : '🔒 Solo i partecipanti approvati vedranno l\'indirizzo esatto.'}
              </p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data *</label>
              <input className={inputCls} type="date" min={today}
                value={form.date} onChange={set('date')} required />
            </div>
            <div>
              <label className={labelCls}>Orario *</label>
              <input className={inputCls} type="time"
                value={form.time} onChange={set('time')} required />
            </div>
          </div>
        </FormSection>

        {/* ── Tipo di allenamento ── */}
        <FormSection title="Tipo di allenamento">
          <div>
            <label className={labelCls}>Titolo *</label>
            <input className={inputCls} value={form.title} onChange={set('title')} required />
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
        <FormSection title="Ritmo e distanza">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Distanza (km)</label>
              <input className={inputCls} type="number" step="0.5" min="0.5"
                value={form.distance_km} onChange={set('distance_km')} placeholder="es. 10" />
            </div>
            <div>
              <label className={labelCls}>Ritmo target</label>
              <input className={inputCls} value={form.pace_target} onChange={set('pace_target')}
                placeholder="es. 5:30/km" />
            </div>
          </div>
        </FormSection>

        {/* ── Partecipazione ── */}
        <FormSection title="Partecipazione">
          <div>
            <label className={labelCls}>Max partecipanti</label>
            <input className={cn(inputCls)} type="number" min={approvedCount || 2}
              value={form.max_participants} onChange={set('max_participants')}
              placeholder="Lascia vuoto per nessun limite" />
            {approvedCount > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Minimo {approvedCount} — hai già {approvedCount} partecipant{approvedCount === 1 ? 'e' : 'i'} approvato/i.
              </p>
            )}
          </div>
        </FormSection>

        {/* ── Caratteristiche ── */}
        <FormSection title="Caratteristiche">
          <TagPicker selected={tags} onChange={setTags} />
        </FormSection>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-col gap-3">
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 disabled:opacity-60">
            <span className="material-symbols-outlined text-lg">
              {loading ? 'hourglass_empty' : 'check_circle'}
            </span>
            {loading ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
          <a href={`/corse/${run.id}`}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold text-sm px-6 py-3 rounded-2xl hover:bg-gray-50 transition-colors text-center">
            Annulla
          </a>
        </div>
      </form>
    </>
  )
}
