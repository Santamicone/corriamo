'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseTime, formatPace, formatPaceRange, formatTime } from '@/lib/running/time'
import { computePaceZones, trainingToRaceTimeSec, type Experience } from '@/lib/running/paceZones'

type InputMode = 'race' | 'training'

const DISTANCE_OPTIONS = [
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: 'Mezza maratona', meters: 21097.5 },
  { label: 'Maratona', meters: 42195 },
]

const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
]

const OBJECTIVE_OPTIONS = [
  { value: 'k5', label: 'Migliorare sui 5K' },
  { value: 'k10', label: 'Migliorare sui 10K' },
  { value: 'half', label: 'Preparare una mezza' },
  { value: 'marathon', label: 'Preparare una maratona' },
  { value: 'salute', label: 'Stare in forma / divertirmi' },
]

const STORAGE_KEY = 'vac:zone-passo:form'

export function PaceZonesTool() {
  const [mode, setMode] = useState<InputMode>('race')
  const [meters, setMeters] = useState(10000)
  const [trainingKm, setTrainingKm] = useState('')
  const [time, setTime] = useState('')
  const [experience, setExperience] = useState<Experience>('intermedio')
  const [objective, setObjective] = useState('k10')
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLogged, setIsLogged] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLogged(!!data.user))
  }, [])

  // Ripristina il modulo al ritorno (es. dopo la registrazione) così l'utente
  // ritrova i dati già compilati e la scheda pronta per l'invio via email.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.mode) setMode(s.mode)
      if (typeof s.meters === 'number') setMeters(s.meters)
      if (typeof s.trainingKm === 'string') setTrainingKm(s.trainingKm)
      if (typeof s.time === 'string') setTime(s.time)
      if (s.experience) setExperience(s.experience)
      if (s.objective) setObjective(s.objective)
      if (typeof s.daysPerWeek === 'number') setDaysPerWeek(s.daysPerWeek)
      if (s.submitted) setSubmitted(true)
    } catch { /* sessionStorage non disponibile o dato corrotto: si ignora */ }
  }, [])

  // Distanza e tempo effettivi da dare al modello: in modalità "allenamento"
  // la distanza è libera (km) e il tempo viene riportato a una prestazione gara equivalente.
  const effective = useMemo(() => {
    const sec = parseTime(time)
    if (!sec) return null
    if (mode === 'training') {
      const km = Number(trainingKm.replace(',', '.'))
      if (!km || km <= 0) return null
      return { raceMeters: km * 1000, raceTimeSec: trainingToRaceTimeSec(sec) }
    }
    return { raceMeters: meters, raceTimeSec: sec }
  }, [mode, time, trainingKm, meters])

  const result = useMemo(() => {
    if (!submitted || !effective) return null
    return computePaceZones({ ...effective, experience, daysPerWeek })
  }, [submitted, effective, experience, daysPerWeek])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!effective) {
      setError(
        mode === 'training'
          ? 'Inserisci una distanza in km e un tempo valido (mm:ss oppure h:mm:ss).'
          : 'Inserisci un tempo valido nel formato mm:ss oppure h:mm:ss.',
      )
      setSubmitted(false)
      return
    }
    setError(null)
    setSubmitted(true)
    setEmailState('idle')
    setEmailMsg(null)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode, meters, trainingKm, time, experience, objective, daysPerWeek, submitted: true,
      }))
    } catch { /* sessionStorage non disponibile: si ignora */ }
  }

  const sendByEmail = async () => {
    if (!effective) return
    setEmailState('sending')
    setEmailMsg(null)
    try {
      const res = await fetch('/api/tools/scheda-ritmi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...effective, experience, daysPerWeek }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invio non riuscito.')
      setEmailState('sent')
      setEmailMsg(data.sentTo ? `Inviata a ${data.sentTo}` : 'Scheda inviata!')
    } catch (err) {
      setEmailState('error')
      setEmailMsg(err instanceof Error ? err.message : 'Invio non riuscito.')
    }
  }

  const distLabel =
    mode === 'training'
      ? `${trainingKm.replace('.', ',')} km`
      : DISTANCE_OPTIONS.find(d => d.meters === meters)?.label ?? ''

  return (
    <div>
      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 grid gap-5">
        {/* ── Selettore modalità: gara recente vs allenamento ── */}
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-full p-1">
          {([
            { value: 'race', label: 'Da una gara' },
            { value: 'training', label: 'Da un allenamento' },
          ] as const).map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => { setMode(m.value); setSubmitted(false) }}
              className={[
                'text-sm font-semibold py-2 rounded-full transition-colors',
                mode === m.value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'training' && (
          <p className="text-sm text-gray-500 -mt-1">
            Non hai ancora fatto una gara, o almeno non negli ultimi mesi? Scrivi distanza e tempo
            di un tuo allenamento corso a <strong>ritmo sostenuto</strong>: stimiamo i passi da lì.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {mode === 'race' ? (
            <Field label="Distanza gara recente">
              <select
                value={meters}
                onChange={e => { setMeters(Number(e.target.value)); setSubmitted(false) }}
                className="tool-input"
              >
                {DISTANCE_OPTIONS.map(d => (
                  <option key={d.meters} value={d.meters}>{d.label}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Distanza allenamento (km)" hint="es. 8 oppure 10,5">
              <input
                type="text"
                inputMode="decimal"
                placeholder="km"
                value={trainingKm}
                onChange={e => { setTrainingKm(e.target.value); setSubmitted(false) }}
                className="tool-input"
              />
            </Field>
          )}

          <Field
            label={mode === 'training' ? 'Tempo dell’allenamento' : 'Tempo ottenuto'}
            hint="es. 45:00 oppure 1:32:00"
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="mm:ss"
              value={time}
              onChange={e => { setTime(e.target.value); setSubmitted(false) }}
              className="tool-input"
            />
          </Field>

          <Field label="Livello di esperienza">
            <select
              value={experience}
              onChange={e => { setExperience(e.target.value as Experience); setSubmitted(false) }}
              className="tool-input"
            >
              {EXPERIENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Obiettivo">
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="tool-input"
            >
              {OBJECTIVE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Giorni di allenamento a settimana">
            <select
              value={daysPerWeek}
              onChange={e => { setDaysPerWeek(Number(e.target.value)); setSubmitted(false) }}
              className="tool-input"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'giorno' : 'giorni'}</option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-error font-medium">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
        >
          <span className="material-symbols-outlined text-xl">calculate</span>
          Calcola i miei ritmi
        </button>
      </form>

      {/* ── Risultato ── */}
      {result && (
        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4">
            Dal tuo <strong>{distLabel} in {formatTime(parseTime(time)!)}</strong>, i tuoi ritmi indicativi sono:
          </p>

          <div className="grid gap-2">
            {result.zones.map(z => (
              <div
                key={z.key}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{z.label}</p>
                  <p className="text-xs text-gray-400">{z.hint}</p>
                </div>
                <span className="text-sm font-extrabold text-primary tabular-nums shrink-0">
                  {formatPaceRange(z.loPace, z.hiPace)}
                </span>
              </div>
            ))}
          </div>

          {/* Ritmi gara */}
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-8 mb-3">
            I tuoi ritmi gara indicativi
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {result.racePaces.map(r => (
              <div
                key={r.key}
                className={[
                  'rounded-xl border px-3 py-3 text-center',
                  objective === r.key ? 'border-primary/40 bg-orange-50' : 'border-gray-100 bg-white',
                ].join(' ')}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{r.label}</p>
                <p className="text-base font-extrabold text-gray-900 tabular-nums mt-0.5">{formatTime(r.timeSec)}</p>
                <p className="text-[11px] text-gray-400 tabular-nums">{formatPace(r.paceSecPerKm)}/km</p>
              </div>
            ))}
          </div>

          {/* ── CTA principale ── */}
          <Link
            href="/bacheca"
            className="mt-8 flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold px-6 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">group</span>
            Trova qualcuno con cui fare questo allenamento
          </Link>

          {/* ── Scheda via email ── */}
          <div className="mt-4 bg-orange-50 border border-primary/20 rounded-2xl p-5 text-center">
            {emailState === 'sent' ? (
              <>
                <span className="material-symbols-filled text-tertiary" style={{ fontSize: 36 }}>
                  mark_email_read
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1">Scheda inviata! 📩</p>
                <p className="text-xs text-gray-500 mt-1">{emailMsg} — controlla anche lo spam.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900">Vuoi la scheda completa via email?</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  {isLogged
                    ? 'Te la inviamo all’indirizzo del tuo account, pronta da consultare.'
                    : 'Accedi o registrati: ti inviamo i tuoi ritmi e le guide di allenamento.'}
                </p>
                {isLogged ? (
                  <button
                    onClick={sendByEmail}
                    disabled={emailState === 'sending'}
                    className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-hover transition-colors disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {emailState === 'sending' ? 'progress_activity' : 'mail'}
                    </span>
                    {emailState === 'sending' ? 'Invio in corso…' : 'Ricevi la scheda via email'}
                  </button>
                ) : (
                  <Link
                    href="/registrati?next=/tools/zone-di-passo"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-hover transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">mail</span>
                    Ricevi la scheda via email
                  </Link>
                )}
                {emailState === 'error' && (
                  <p className="text-xs text-error font-medium mt-2">{emailMsg}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
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
