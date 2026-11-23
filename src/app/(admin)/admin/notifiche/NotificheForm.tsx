'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EVENT_TYPES, FREQUENCIES } from '@/lib/admin/notifications'

export interface RuleState {
  event_type: string
  enabled: boolean
  frequency: string
  last_sent_at: string | null
  /** Eventi registrati e non ancora inviati */
  pending: number
}

export interface RecipientState {
  user_id: string
  name: string
  email: string
  enabled: boolean
  isMe: boolean
}

const inputCls = 'border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Rome' }) : 'mai'

/** Impostazioni delle notifiche email agli admin (SQL #52, Edge Function `notify-admins`). */
export function NotificheForm({
  initialRules, initialDailyHour, initialRecipients,
}: { initialRules: RuleState[]; initialDailyHour: number; initialRecipients: RecipientState[] }) {
  const router = useRouter()
  const [rules, setRules] = useState(initialRules)
  const [dailyHour, setDailyHour] = useState(initialDailyHour)
  const [recipients, setRecipients] = useState(initialRecipients)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const patchRule = (type: string, patch: Partial<RuleState>) => {
    setRules(list => list.map(r => (r.event_type === type ? { ...r, ...patch } : r)))
    setSaved(false)
  }

  const usesDaily = rules.some(r => r.enabled && r.frequency === 'daily')
  const activeRecipients = recipients.filter(r => r.enabled).length
  const anyEnabled = rules.some(r => r.enabled)

  const salva = async () => {
    setBusy(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/notifiche', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: rules.map(r => ({ event_type: r.event_type, enabled: r.enabled, frequency: r.frequency })),
          daily_hour: dailyHour,
          recipients: recipients.map(r => ({ user_id: r.user_id, enabled: r.enabled })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio non riuscito')
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
        <h2 className="font-bold text-gray-900">Eventi e frequenza</h2>
        {EVENT_TYPES.map(ev => {
          const rule = rules.find(r => r.event_type === ev.value)
          if (!rule) return null
          return (
            <div key={ev.value} className="flex flex-col gap-2 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={rule.enabled}
                  onChange={e => patchRule(ev.value, { enabled: e.target.checked })} />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <span className="material-symbols-outlined text-lg text-gray-400">{ev.icon}</span>
                    {ev.label}
                  </span>
                  <span className="block text-sm text-gray-500">{ev.hint}</span>
                </span>
              </label>
              <div className="pl-7 flex flex-col gap-1.5">
                <select className={`${inputCls} w-full sm:w-80`} value={rule.frequency} disabled={!rule.enabled}
                  onChange={e => patchRule(ev.value, { frequency: e.target.value })}
                  aria-label={`Frequenza: ${ev.label}`}>
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <p className="text-xs text-gray-400">
                  {FREQUENCIES.find(f => f.value === rule.frequency)?.hint}
                  {' · '}Ultimo invio: {fmt(rule.last_sent_at)}
                  {rule.pending > 0 && <> · <span className="text-amber-700 font-semibold">{rule.pending} in attesa di invio</span></>}
                </p>
              </div>
            </div>
          )
        })}

        {usesDaily && (
          <label className="text-sm font-medium text-gray-700">Ora del riepilogo giornaliero (ora italiana)
            <select className={`${inputCls} block mt-1`} value={dailyHour}
              onChange={e => { setDailyHour(Number(e.target.value)); setSaved(false) }}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
        <h2 className="font-bold text-gray-900">Chi le riceve</h2>
        <p className="text-sm text-gray-500">
          Tutti gli admin, a meno che non tolgano la spunta. L’email è quella con cui hanno fatto l’accesso.
        </p>
        <ul className="flex flex-col gap-2">
          {recipients.map(r => (
            <li key={r.user_id}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4" checked={r.enabled}
                  onChange={e => { setRecipients(list => list.map(x => (x.user_id === r.user_id ? { ...x, enabled: e.target.checked } : x))); setSaved(false) }} />
                <span className="text-sm">
                  <span className="font-semibold text-gray-900">{r.name}{r.isMe ? ' (tu)' : ''}</span>
                  <span className="text-gray-500"> · {r.email || 'nessuna email'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {anyEnabled && activeRecipients === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            Nessun destinatario attivo: gli eventi restano in coda (fino a 7 giorni) finché qualcuno non riattiva gli avvisi.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={salva} disabled={busy}
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Salvo…' : 'Salva impostazioni'}
        </button>
        {saved && <p role="status" className="text-sm text-green-700">Impostazioni salvate.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
    </div>
  )
}
