'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageField } from './ImageField'
import { geocodeAddress, geocodeCity } from '@/lib/geocoding'
import { PROPOSAL_KINDS, type ProposalKind } from '@/lib/proposals'
import { cn } from '@/lib/utils'

const inputCls = 'h-10 w-full px-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1'

function fromKind(kind: ProposalKind) {
  const k = PROPOSAL_KINDS[kind]
  return {
    title: k.title,
    distance_min_km: String(k.distance[0]),
    distance_max_km: String(k.distance[1]),
    pace_target: k.pace ?? '',
    level: k.level,
    time_from: k.window[0],
    time_to: k.window[1],
  }
}

/** Modulo admin: nuova proposta da modello (SQL #53). Salva con POST /api/admin/proposte. */
export function ProposalForm({ today }: { today: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<ProposalKind>('lungo')
  const [form, setForm] = useState({
    ...fromKind('lungo'),
    city: '', zone: '', target_date: '', description: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [image, setImage] = useState<Blob | null>(null)
  // Indirizzo del file già caricato: dopo un avviso o un errore non si ricarica la stessa immagine
  const uploaded = useRef<{ blob: Blob; url: string } | null>(null)

  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null
    if (uploaded.current?.blob === image) return uploaded.current.url
    const body = new FormData()
    body.append('file', image, 'proposta.jpg')
    const res = await fetch('/api/admin/proposte/immagine', { method: 'POST', body })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) throw new Error(data.error ?? 'Immagine non caricata')
    uploaded.current = { blob: image, url: data.url }
    return data.url
  }

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [f]: e.target.value }))
    setWarnings([])
  }

  const pickKind = (k: ProposalKind) => {
    setKind(k)
    setForm(p => ({ ...p, ...fromKind(k) }))
    setWarnings([])
  }

  const submit = async (force: boolean) => {
    setBusy(true); setError('')
    // Pin indicativo: zona + città, altrimenti solo città. Il DB lo arrotonda a 2 decimali (~1 km).
    const geo = form.zone.trim()
      ? await geocodeAddress(form.zone.trim(), form.city.trim())
      : await geocodeCity(form.city.trim())
    let image_url: string | null
    try {
      image_url = await uploadImage()
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Immagine non caricata')
      return
    }
    const res = await fetch('/api/admin/proposte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, kind, image_url, lat: geo?.lat ?? null, lng: geo?.lng ?? null, force }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.status === 409 && Array.isArray(data.warnings)) { setWarnings(data.warnings); return }
    if (!res.ok) { setError(data.error ?? 'Proposta non creata'); return }
    router.push('/admin/proposte')
    router.refresh()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit(false) }} className="flex flex-col gap-5 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className={labelCls}>Tipologia</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PROPOSAL_KINDS) as ProposalKind[]).map(k => (
            <button key={k} type="button" onClick={() => pickKind(k)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-colors',
                kind === k ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}>
              <span className="material-symbols-outlined text-base">{PROPOSAL_KINDS[k].icon}</span>
              {PROPOSAL_KINDS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Titolo *</label>
          <input className={inputCls} value={form.title} onChange={set('title')} required minLength={3} maxLength={120} />
        </div>
        <div>
          <label className={labelCls}>Città *</label>
          <input className={inputCls} value={form.city} onChange={set('city')} required placeholder="es. Perugia" />
        </div>
        <div>
          <label className={labelCls}>Zona (indicativa)</label>
          <input className={inputCls} value={form.zone} onChange={set('zone')} placeholder="es. Percorso Verde, Villa Borghese" />
        </div>
        <div>
          <label className={labelCls}>Giorno *</label>
          <input className={inputCls} type="date" min={today} value={form.target_date} onChange={set('target_date')} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Dalle *</label>
            <input className={inputCls} type="time" value={form.time_from} onChange={set('time_from')} required />
          </div>
          <div>
            <label className={labelCls}>Alle *</label>
            <input className={inputCls} type="time" value={form.time_to} onChange={set('time_to')} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Km da</label>
            <input className={inputCls} type="number" step="0.5" min="0.5" value={form.distance_min_km} onChange={set('distance_min_km')} />
          </div>
          <div>
            <label className={labelCls}>Km a</label>
            <input className={inputCls} type="number" step="0.5" min="0.5" value={form.distance_max_km} onChange={set('distance_max_km')} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Ritmo (min/km)</label>
          <input className={inputCls} value={form.pace_target} onChange={set('pace_target')} placeholder="es. 5:15-5:45, vuoto = variabile" />
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
        <div className="sm:col-span-2">
          <label className={labelCls}>Descrizione</label>
          <textarea value={form.description} onChange={set('description')} rows={3}
            placeholder="Facoltativa. Niente nomi di persone: è una proposta del servizio."
            className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className={labelCls}>Immagine</p>
        <ImageField kind={kind} value={image} onChange={blob => { setImage(blob); setWarnings([]) }} />
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col gap-2">
          {warnings.map(w => (
            <p key={w} className="text-sm text-amber-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-base shrink-0">warning</span>{w}
            </p>
          ))}
          <button type="button" disabled={busy} onClick={() => submit(true)}
            className="self-start px-4 py-2 rounded-full bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
            Pubblica comunque
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <button type="submit" disabled={busy}
        className="self-start inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
        <span className="material-symbols-outlined text-base">{busy ? 'hourglass_empty' : 'add'}</span>
        {busy ? 'Pubblicazione…' : 'Pubblica la proposta'}
      </button>
    </form>
  )
}
