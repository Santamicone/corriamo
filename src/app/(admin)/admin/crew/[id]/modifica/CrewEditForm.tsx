'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LIMITS, validateRow } from '@/lib/crews/import'

export interface CrewEditInitial {
  id: string
  slug: string | null
  name: string
  city: string
  zone: string
  crew_type: string
  meeting_point: string
  schedule_text: string
  website_url: string
  instagram_url: string
  description: string
  avatar_url: string
  lat: number | null
  lng: number | null
  show_on_map: boolean
  last_confirmed_at: string | null
  /** null = email dichiarata da chi rivendica: non si mostra né si modifica */
  contact_email: string | null
}

type Point = { lat: number; lng: number } | null

const TYPE_OPTIONS = [
  { value: 'running_club', label: 'Club' },
  { value: 'training_group', label: 'Gruppo di allenamento' },
  { value: 'friends', label: 'Gruppo di amici' },
]

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400'

/** Modulo di modifica di una scheda informativa (docs/MAPPA-CREW.md §9). */
export function CrewEditForm({ initial }: { initial: CrewEditInitial }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: initial.name, city: initial.city, zone: initial.zone, crew_type: initial.crew_type,
    meeting_point: initial.meeting_point, schedule_text: initial.schedule_text,
    website_url: initial.website_url, instagram_url: initial.instagram_url,
    description: initial.description, avatar_url: initial.avatar_url,
    contact_email: initial.contact_email ?? '',
  })
  const [point, setPoint] = useState<Point>(
    initial.lat !== null && initial.lng !== null ? { lat: initial.lat, lng: initial.lng } : null)
  const [showOnMap, setShowOnMap] = useState(initial.show_on_map)
  const [markChecked, setMarkChecked] = useState(false)
  // Se città o ritrovo cambiano, la posizione va cercata di nuovo (a mano, con il pulsante)
  const [locationStale, setLocationStale] = useState(false)
  const [busy, setBusy] = useState<'geo' | 'save' | null>(null)
  const [error, setError] = useState('')
  const [geoMsg, setGeoMsg] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value
    setForm(f => ({ ...f, [k]: value }))
    setSaved(false)
    if (k === 'city' || k === 'meeting_point') setLocationStale(true)
  }

  const cercaPosizione = async () => {
    setError(''); setGeoMsg(''); setBusy('geo')
    try {
      const city = form.city.trim()
      if (!city) throw new Error('Indica prima la città')
      const meeting = form.meeting_point.trim()
      const res = await fetch('/api/admin/crew/importa/geocodifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ key: 'p', city, meeting_point: meeting || null, precision: meeting ? 'area' : 'city' }] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Ricerca della posizione non riuscita')
      const found = (data.results?.p ?? null) as Point
      if (found) {
        setPoint(found); setShowOnMap(true); setLocationStale(false)
        setGeoMsg(`Posizione trovata (pin ${meeting ? 'di zona' : 'di città'}).`)
      } else {
        setPoint(null); setShowOnMap(false)
        setGeoMsg('Posizione non trovata: senza di essa la scheda non comparirà sulla mappa.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const salva = async () => {
    setError(''); setSaved(false); setWarnings([])
    // Controllo subito, con le stesse regole del server, per non far attendere
    const check = validateRow({ ...form })
    if (!check.row) { setError(check.errors.join('; ')); return }
    setWarnings(check.warnings)

    setBusy('save')
    try {
      const res = await fetch(`/api/admin/crew/${initial.id}/modifica`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: check.row,
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          show_on_map: showOnMap && !!point,
          mark_checked: markChecked,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio non riuscito')
      setSaved(true); setMarkChecked(false)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium text-gray-700">Nome *
            <input className={inputCls} value={form.name} onChange={set('name')} maxLength={LIMITS.name} /></label>
          <label className="text-sm font-medium text-gray-700">Città *
            <input className={inputCls} value={form.city} onChange={set('city')} maxLength={LIMITS.city} /></label>
          <label className="text-sm font-medium text-gray-700">Zona o provincia
            <input className={inputCls} value={form.zone} onChange={set('zone')} maxLength={LIMITS.zone} placeholder="es. PG" /></label>
          <label className="text-sm font-medium text-gray-700">Tipo
            <select className={inputCls} value={form.crew_type} onChange={set('crew_type')}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Ritrovo
            <input className={inputCls} value={form.meeting_point} onChange={set('meeting_point')} maxLength={LIMITS.meeting_point} /></label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Giorni e orari
            <input className={inputCls} value={form.schedule_text} onChange={set('schedule_text')} maxLength={LIMITS.schedule_text} placeholder="es. Martedì e giovedì 19:30" /></label>
          <label className="text-sm font-medium text-gray-700">Sito web
            <input className={inputCls} value={form.website_url} onChange={set('website_url')} placeholder="www.esempio.it" /></label>
          <label className="text-sm font-medium text-gray-700">Instagram
            <input className={inputCls} value={form.instagram_url} onChange={set('instagram_url')} placeholder="@nomecrew" /></label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Descrizione
            <textarea className={inputCls} rows={3} value={form.description} onChange={set('description')} maxLength={LIMITS.description} /></label>
          <label className="text-sm font-medium text-gray-700">Link del logo
            <input className={inputCls} value={form.avatar_url} onChange={set('avatar_url')} placeholder="https://…/logo.png" /></label>
          {initial.contact_email === null ? (
            <p className="text-sm text-gray-500 self-end pb-2">
              L’email di contatto è stata indicata da chi ha chiesto di rivendicare la crew: da qui non si vede né si modifica.
            </p>
          ) : (
            <label className="text-sm font-medium text-gray-700">Email pubblica di contatto
              <input className={inputCls} type="email" value={form.contact_email} onChange={set('contact_email')} /></label>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Serve almeno un link pubblico (sito o Instagram). Niente numeri di telefono né dati di persone.
          L’email non si mostra: resta privata e serve a verificare chi rivendica la crew.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
        <h2 className="font-bold text-gray-900">Posizione sulla mappa</h2>
        <p className="text-sm text-gray-600">
          {point
            ? <>Pin attuale: <span className="font-mono">{point.lat.toFixed(2)}, {point.lng.toFixed(2)}</span> ({form.meeting_point.trim() ? 'di zona, circa 1 km' : 'di città'}).</>
            : 'Nessuna posizione: la scheda non compare sulla mappa.'}
        </p>
        {locationStale && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            Hai cambiato città o ritrovo: cerca di nuovo la posizione, altrimenti resta quella di prima.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={cercaPosizione} disabled={busy !== null}
            className="px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {busy === 'geo' ? 'Cerco…' : 'Cerca di nuovo la posizione'}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="h-4 w-4" checked={showOnMap && !!point} disabled={!point}
              onChange={e => { setShowOnMap(e.target.checked); setSaved(false) }} />
            Mostra sulla mappa
          </label>
        </div>
        {geoMsg && <p className="text-xs text-gray-500">{geoMsg}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="h-4 w-4" checked={markChecked}
            onChange={e => { setMarkChecked(e.target.checked); setSaved(false) }} />
          Segna i dati come controllati oggi
          {initial.last_confirmed_at && (
            <span className="text-xs text-gray-400">
              (ultimo controllo: {new Date(initial.last_confirmed_at).toLocaleDateString('it-IT')})
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <Link href="/admin/crew"
            className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Torna all’elenco
          </Link>
          <button onClick={salva} disabled={busy !== null}
            className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {busy === 'save' ? 'Salvo…' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      {warnings.map((w, k) => <p key={k} className="text-xs text-amber-700">⚠️ {w}</p>)}
      {saved && (
        <p role="status" className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          Modifiche salvate.{' '}
          <Link href={`/crew/${initial.slug ?? initial.id}`} className="underline">Vedi la scheda</Link>
        </p>
      )}
    </div>
  )
}
