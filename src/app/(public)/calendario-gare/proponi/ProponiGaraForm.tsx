'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayItaly } from '@/lib/utils'
import type { CatalogDistance } from '@/lib/types'

const inputCls = 'h-11 w-full px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5'

const DISTANCES: { value: CatalogDistance; label: string }[] = [
  { value: '5k', label: '5K' }, { value: '10k', label: '10K' },
  { value: '21k', label: 'Mezza' }, { value: '42k', label: 'Maratona' },
  { value: 'trail', label: 'Trail' }, { value: 'ultra', label: 'Ultra' }, { value: 'other', label: 'Altro' },
]

const COUNTRIES = [
  ['IT', 'Italia'], ['FR', 'Francia'], ['DE', 'Germania'], ['ES', 'Spagna'], ['GB', 'Regno Unito'],
  ['PT', 'Portogallo'], ['CH', 'Svizzera'], ['AT', 'Austria'], ['NL', 'Paesi Bassi'], ['BE', 'Belgio'],
]

const RACE_TYPES = [
  ['competitiva', 'Competitiva'], ['non_competitiva', 'Non competitiva'],
  ['federale', 'Federale'], ['internazionale', 'Internazionale'], ['charity', 'Charity'],
]

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function ProponiGaraForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    name: '', city: '', region: '', country: 'IT', event_date: '',
    race_type: 'competitiva', official_url: '',
  })
  const [distances, setDistances] = useState<CatalogDistance[]>([])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  const toggleDistance = (d: CatalogDistance) =>
    setDistances(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (distances.length === 0) { setError('Seleziona almeno una distanza.'); return }
    setLoading(true); setError('')

    const year = form.event_date.slice(0, 4)
    const base = `${slugify(form.name)}-${year}`
    const supabase = createClient()

    const row = {
      name: form.name.trim(),
      city: form.city.trim(),
      region: form.region.trim() || null,
      country: form.country,
      event_date: form.event_date,
      distances,
      race_type: form.race_type,
      official_url: form.official_url.trim() || null,
      source: 'utente',
      status: 'pending',
      created_by: userId,
    }

    // Slug unico: se collide, riprova con un suffisso breve.
    let err = (await supabase.from('races').insert({ ...row, slug: base })).error
    if (err?.code === '23505') {
      err = (await supabase.from('races').insert({ ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}` })).error
    }

    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
        <h2 className="text-xl font-extrabold text-gray-900">Grazie!</h2>
        <p className="text-sm text-gray-600 max-w-sm">
          La tua segnalazione è stata inviata. La valuteremo e, se tutto è a posto, la vedrai comparire nel calendario gare.
        </p>
        <button onClick={() => router.push('/calendario-gare')}
          className="mt-2 inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors">
          Torna al calendario
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
        <div>
          <label className={labelCls}>Nome della gara *</label>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="es. Maratona di Foo 2027" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Città *</label>
            <input className={inputCls} value={form.city} onChange={set('city')} placeholder="es. Foo" required />
          </div>
          <div>
            <label className={labelCls}>Regione</label>
            <input className={inputCls} value={form.region} onChange={set('region')} placeholder="es. Lazio" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nazione *</label>
            <select className={inputCls} value={form.country} onChange={set('country')}>
              {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Data *</label>
            <input className={inputCls} type="date" min={todayItaly()} value={form.event_date} onChange={set('event_date')} required />
          </div>
        </div>
        <div>
          <label className={labelCls}>Distanze *</label>
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map(d => {
              const active = distances.includes(d.value)
              return (
                <button key={d.value} type="button" onClick={() => toggleDistance(d.value)}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                    active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-400 bg-white'
                  }`}>{d.label}</button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tipo</label>
            <select className={inputCls} value={form.race_type} onChange={set('race_type')}>
              {RACE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sito ufficiale</label>
            <input className={inputCls} type="url" value={form.official_url} onChange={set('official_url')} placeholder="https://…" />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-60">
        <span className="material-symbols-outlined text-lg">{loading ? 'hourglass_empty' : 'send'}</span>
        {loading ? 'Invio…' : 'Invia la segnalazione'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        La gara sarà pubblicata solo dopo una verifica. Grazie per il contributo!
      </p>
    </form>
  )
}
