'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayItaly } from '@/lib/utils'

const inputCls = "h-11 w-full px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all"
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

const LOOKING_FOR_OPTIONS = [
  { value: 'pacer',     label: 'Pacer',          desc: 'Qualcuno che ti aiuti a mantenere il ritmo', icon: 'speed' },
  { value: 'compagno',  label: 'Compagno di gara', desc: 'Per correre insieme e motivarsi a vicenda',  icon: 'group' },
  { value: 'supporter', label: 'Supporter',       desc: 'Qualcuno che ti inciti lungo il percorso',   icon: 'volunteer_activism' },
]

function buildTitle(lookingFor: string[], raceName: string): string {
  if (!raceName.trim()) return 'Compagni di gara'
  if (lookingFor.length === 0) return `Compagni per ${raceName.trim()}`
  const labels: Record<string, string> = { pacer: 'pacer', compagno: 'compagno', supporter: 'supporter' }
  const parts = lookingFor.map(k => labels[k] ?? k)
  return `Cerco ${parts.join(' e ')} — ${raceName.trim()}`
}

export interface GaraPrefill {
  race_id: string
  race_name: string
  race_distance: string
  city: string
  date: string
}

export function NuovaGaraForm({ userId, prefill }: { userId: string; prefill?: GaraPrefill }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm] = useState({
    race_name: prefill?.race_name ?? '', race_distance: prefill?.race_distance ?? '',
    date: prefill?.date ?? '', time: '09:00',
    city: prefill?.city ?? '', race_target_time: '', description: '', race_registered: false,
  })
  const [lookingFor, setLookingFor] = useState<string[]>([])

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  const toggleLookingFor = (value: string) =>
    setLookingFor(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lookingFor.length === 0) { setError('Seleziona almeno una cosa che stai cercando.'); return }
    setLoading(true)
    setError('')

    const title = buildTitle(lookingFor, form.race_name)

    const supabase = createClient()
    const { data, error: err } = await supabase.from('runs').insert({
      organizer_id:     userId,
      title,
      description:      form.description || null,
      date:             form.date,
      time:             form.time,
      location:         form.city,
      city:             form.city,
      level:            'tutti',
      is_no_drop:       false,
      is_spot:          false,
      status:           'aperta',
      type:             'gara',
      race_name:        form.race_name || null,
      race_distance:    form.race_distance || null,
      race_target_time: form.race_target_time || null,
      race_registered:  form.race_registered,
      looking_for:      lookingFor,
      tags:             [],
      race_id:          prefill?.race_id ?? null,
    }).select('id').single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/gare/${data.id}`)
    router.refresh()
  }

  const today = todayItaly()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {prefill && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-indigo-600">event_available</span>
          <p className="text-sm text-indigo-800">
            Stai cercando compagni per <strong>{prefill.race_name}</strong>. Abbiamo già compilato i dati della gara — completa cosa cerchi.
          </p>
        </div>
      )}

      {/* La gara */}
      <FormSection title="La gara" desc="Di quale gara si tratta?">
        <div>
          <label className={labelCls}>Nome della gara *</label>
          <input className={inputCls} value={form.race_name} onChange={set('race_name')} placeholder="es. Maratona di Roma 2026, Bologna Marathon…" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distanza *</label>
            <select className={inputCls} value={form.race_distance} onChange={set('race_distance')} required>
              <option value="">Seleziona…</option>
              <option value="5k">5K</option>
              <option value="10k">10K</option>
              <option value="21k">Mezza maratona (21K)</option>
              <option value="42k">Maratona (42K)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Città *</label>
            <input className={inputCls} value={form.city} onChange={set('city')} placeholder="es. Roma, Milano…" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Data della gara *</label>
            <input className={inputCls} type="date" min={today} value={form.date} onChange={set('date')} required />
          </div>
          <div>
            <label className={labelCls}>Orario di partenza *</label>
            <input className={inputCls} type="time" value={form.time} onChange={set('time')} required />
          </div>
        </div>
      </FormSection>

      {/* Obiettivo */}
      <FormSection title="Il tuo obiettivo" desc="Aiuta gli altri a capire se siete compatibili.">
        <div>
          <label className={labelCls}>Tempo obiettivo</label>
          <input className={inputCls} value={form.race_target_time} onChange={set('race_target_time')} placeholder="es. 3:45:00, sub-4h, 55 min…" />
          <p className="text-xs text-gray-400 mt-1">Indica un obiettivo di massima: aiuta chi cerca un compagno con ritmo simile.</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <input type="checkbox" checked={form.race_registered}
            onChange={e => setForm(p => ({ ...p, race_registered: e.target.checked }))}
            className="w-4 h-4 rounded accent-indigo-600" />
          <div>
            <span className="text-sm font-semibold text-gray-900">Sono già iscritto alla gara</span>
            <p className="text-xs text-gray-400">Aiuta gli altri a capire se cerchi qualcuno di già iscritto o meno.</p>
          </div>
        </label>
        <div>
          <label className={labelCls}>Note aggiuntive</label>
          <textarea
            value={form.description} onChange={set('description')}
            placeholder="Racconta qualcosa di più su di te, il tuo livello attuale, cosa ti aspetti…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-all"
          />
        </div>
      </FormSection>

      {/* Cosa cerchi */}
      <FormSection title="Cosa stai cercando *" desc="Seleziona una o più opzioni.">
        <div className="flex flex-col gap-3">
          {LOOKING_FOR_OPTIONS.map(opt => {
            const active = lookingFor.includes(opt.value)
            return (
              <label key={opt.value}
                className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all ${
                  active ? 'bg-indigo-50 border-indigo-300' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <input type="checkbox" checked={active} onChange={() => toggleLookingFor(opt.value)}
                  className="w-4 h-4 mt-0.5 rounded accent-indigo-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-500 text-base">{opt.icon}</span>
                    <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            )
          })}
        </div>
      </FormSection>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-base px-6 py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-60">
        <span className="material-symbols-outlined text-lg">
          {loading ? 'hourglass_empty' : 'emoji_events'}
        </span>
        {loading ? 'Pubblicazione…' : 'Pubblica il post'}
      </button>
    </form>
  )
}
