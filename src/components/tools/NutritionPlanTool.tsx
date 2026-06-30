'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  NUTRITION_FIELDS,
  computeNutritionPlan,
  type NutritionInput,
  type RaceDistance,
  type GelExperience,
  type GastricSensitivity,
  type RaceGoal,
} from '@/lib/running/nutrition'

export function NutritionPlanTool() {
  const [distance, setDistance] = useState<RaceDistance>('21k')
  const [startTime, setStartTime] = useState('')
  const [expectedTime, setExpectedTime] = useState('')
  const [weight, setWeight] = useState('')
  const [temperature, setTemperature] = useState('')
  const [gelExperience, setGelExperience] = useState<GelExperience>('qualcuna')
  const [gastric, setGastric] = useState<GastricSensitivity>('media')
  const [goal, setGoal] = useState<RaceGoal>('finire')
  const [submitted, setSubmitted] = useState(false)
  const [isLogged, setIsLogged] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLogged(!!data.user))
  }, [])

  const buildInput = (): NutritionInput => ({
    distance,
    startTime: startTime.trim() || undefined,
    expectedMinutes: parseExpected(expectedTime),
    weightKg: weight.trim() ? Number(weight) : undefined,
    temperatureC: temperature.trim() ? Number(temperature) : undefined,
    gelExperience,
    gastric,
    goal,
  })

  const plan = useMemo(() => {
    if (!submitted) return null
    return computeNutritionPlan(buildInput())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, distance, startTime, expectedTime, weight, temperature, gelExperience, gastric, goal])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setEmailState('idle')
    setEmailMsg(null)
  }

  const reset = () => { setSubmitted(false); setEmailState('idle'); setEmailMsg(null) }

  const sendByEmail = async () => {
    setEmailState('sending')
    setEmailMsg(null)
    const input = buildInput()
    try {
      const res = await fetch('/api/tools/piano-gara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invio non riuscito.')
      setEmailState('sent')
      setEmailMsg(data.sentTo ? `Inviato a ${data.sentTo}` : 'Piano inviato!')
    } catch (err) {
      setEmailState('error')
      setEmailMsg(err instanceof Error ? err.message : 'Invio non riuscito.')
    }
  }

  return (
    <div>
      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 grid gap-5">
        <Field label="Distanza della gara">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {NUTRITION_FIELDS.distances.map(d => {
              const selected = distance === d.value
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setDistance(d.value); reset() }}
                  className={[
                    'flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all',
                    selected ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-primary/30',
                  ].join(' ')}
                >
                  <span className={['material-symbols-outlined', selected ? 'text-primary' : 'text-gray-400'].join(' ')}>
                    {d.icon}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{d.label}</span>
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Orario di partenza" hint="facoltativo, es. 9:30">
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:MM"
              value={startTime}
              onChange={e => { setStartTime(e.target.value); reset() }}
              className="tool-input"
            />
          </Field>

          <Field label="Tempo previsto" hint="facoltativo, es. 1:45 oppure 50:00">
            <input
              type="text"
              inputMode="numeric"
              placeholder="h:mm"
              value={expectedTime}
              onChange={e => { setExpectedTime(e.target.value); reset() }}
              className="tool-input"
            />
          </Field>

          <Field label="Peso indicativo" hint="facoltativo, in kg">
            <input
              type="number"
              inputMode="numeric"
              placeholder="es. 70"
              value={weight}
              onChange={e => { setWeight(e.target.value); reset() }}
              className="tool-input"
            />
          </Field>

          <Field label="Temperatura prevista" hint="facoltativo, in °C">
            <input
              type="number"
              inputMode="numeric"
              placeholder="es. 18"
              value={temperature}
              onChange={e => { setTemperature(e.target.value); reset() }}
              className="tool-input"
            />
          </Field>

          <Field label="Esperienza con i gel">
            <select
              value={gelExperience}
              onChange={e => { setGelExperience(e.target.value as GelExperience); reset() }}
              className="tool-input"
            >
              {NUTRITION_FIELDS.gelExperience.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Sensibilità gastrica">
            <select
              value={gastric}
              onChange={e => { setGastric(e.target.value as GastricSensitivity); reset() }}
              className="tool-input"
            >
              {NUTRITION_FIELDS.gastric.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Obiettivo">
            <select
              value={goal}
              onChange={e => { setGoal(e.target.value as RaceGoal); reset() }}
              className="tool-input"
            >
              {NUTRITION_FIELDS.goals.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
        >
          <span className="material-symbols-outlined text-xl">restaurant_menu</span>
          Genera il mio piano
        </button>
      </form>

      {/* ── Risultato ── */}
      {plan && (
        <div className="mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Il tuo piano</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{plan.headline}</h2>
            {plan.gel && (
              <p className="text-sm text-gray-500 mt-2">
                Integrazione indicativa: <strong>{plan.gel.count} gel</strong> da ~{plan.gel.carbsPerGel} g
                di carboidrati (≈ {plan.gel.carbsPerHour} g/h
                {plan.gel.caffeineCount > 0 ? `, di cui ${plan.gel.caffeineCount} con caffeina` : ''}).
              </p>
            )}
          </div>

          <div className="grid gap-4">
            {plan.sections.map((section, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">{section.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-tight">{section.title}</h3>
                    {section.subtitle && <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>}
                  </div>
                </div>
                <ul className="grid gap-2.5 pl-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-primary/60 text-base mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Promemoria chiave */}
          <div className="mt-5 flex items-start gap-3 bg-error-container border border-error/20 rounded-2xl p-4">
            <span className="material-symbols-outlined text-error">priority_high</span>
            <p className="text-sm text-on-error-container leading-relaxed">
              <strong>Mai provare cose nuove il giorno della gara.</strong> Tutto ciò che mangi o bevi
              in gara dev'essere già stato testato in allenamento.
            </p>
          </div>

          {/* ── Piano via email ── */}
          <div className="mt-5 bg-orange-50 border border-primary/20 rounded-2xl p-5 text-center">
            {emailState === 'sent' ? (
              <>
                <span className="material-symbols-filled text-tertiary" style={{ fontSize: 36 }}>
                  mark_email_read
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1">Piano inviato! 📩</p>
                <p className="text-xs text-gray-500 mt-1">{emailMsg} — controlla anche lo spam.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">Vuoi il piano dettagliato via email?</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  {isLogged
                    ? 'Te lo inviamo all’indirizzo del tuo account, con un menù tipo pasto per pasto.'
                    : 'Accedi o registrati: ti inviamo il piano completo con il menù tipo per ogni pasto.'}
                </p>
                {isLogged ? (
                  <button
                    type="button"
                    onClick={sendByEmail}
                    disabled={emailState === 'sending'}
                    className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-hover transition-colors disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {emailState === 'sending' ? 'progress_activity' : 'mail'}
                    </span>
                    {emailState === 'sending' ? 'Invio in corso…' : 'Ricevi il piano via email'}
                  </button>
                ) : (
                  <Link
                    href="/registrati?next=/tools/alimentazione-gara"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-hover transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">mail</span>
                    Ricevi il piano via email
                  </Link>
                )}
                {emailState === 'error' && (
                  <p className="text-xs text-error font-medium mt-2">{emailMsg}</p>
                )}
              </>
            )}
          </div>

          {/* ── CTA principale ── */}
          <Link
            href="/bacheca"
            className="mt-6 flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
          >
            <span className="material-symbols-outlined text-xl">directions_run</span>
            Trova compagni per la tua prossima gara
          </Link>

          <button
            onClick={reset}
            className="mt-6 mx-auto flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">restart_alt</span>
            Modifica i dati
          </button>
        </div>
      )}
    </div>
  )
}

/** Converte "1:45" / "1:45:00" / "50:00" / "90" in minuti totali. */
function parseExpected(raw: string): number | undefined {
  const v = raw.trim()
  if (!v) return undefined
  const parts = v.split(':').map(p => Number(p))
  if (parts.some(Number.isNaN)) return undefined
  if (parts.length === 1) return parts[0] // minuti
  if (parts.length === 2) return parts[0] * 60 + parts[1] // h:mm
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60) // h:mm:ss
  return undefined
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  )
}
