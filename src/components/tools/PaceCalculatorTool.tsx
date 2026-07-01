'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  formatTime,
  formatPace,
  formatDistance,
  parsePace,
  parseSmartTime,
  parseDistance,
  METERS_PER_MILE,
} from '@/lib/running/time'

/** Le tre variabili della corsa. Il campo "computed" è quello che ricalcoliamo. */
type Field = 'distance' | 'pace' | 'time'

const SHORTCUTS: { label: string; meters: number }[] = [
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: '15K', meters: 15000 },
  { label: '21K', meters: 21097.5 },
  { label: '30K', meters: 30000 },
  { label: '42K', meters: 42195 },
  { label: '50K', meters: 50000 },
  { label: '100K', meters: 100000 },
]

/**
 * Calcolatore passo · tempo · distanza.
 * L'utente compila due campi qualsiasi; il terzo — l'ultimo NON toccato — è quello
 * che ricalcoliamo in tempo reale. Nessun pulsante "Calcola".
 */
export function PaceCalculatorTool() {
  // Valori grezzi digitati (stringhe, per rispettare esattamente ciò che scrive l'utente).
  const [distanceRaw, setDistanceRaw] = useState('')
  const [paceRaw, setPaceRaw] = useState('')
  const [timeRaw, setTimeRaw] = useState('')
  // Ordine di utilizzo dei campi, dal più recente al meno recente. I primi due sono
  // input, l'ultimo è quello calcolato (output). Default: si calcola il tempo.
  const [order, setOrder] = useState<Field[]>(['pace', 'distance', 'time'])
  const computed = order[2]
  const [copied, setCopied] = useState(false)

  // Sposta un campo in testa alla coda di recency: diventa input, l'output passa
  // al campo rimasto più indietro.
  const touch = useCallback((field: Field) => {
    setOrder(prev => (prev[0] === field ? prev : [field, ...prev.filter(f => f !== field)]))
  }, [])

  // Precompila da URL (?d=metri&p=sec) al primo mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('d')
    const p = params.get('p')
    const t = params.get('t')
    if (d) setDistanceRaw(formatDistance(Number(d)))
    if (p) setPaceRaw(formatPace(Number(p)))
    if (t) setTimeRaw(formatTime(Number(t)))
    // L'output è la variabile mancante dal link.
    if (d && p) setOrder(['pace', 'distance', 'time'])
    else if (d && t) setOrder(['time', 'distance', 'pace'])
    else if (p && t) setOrder(['time', 'pace', 'distance'])
  }, [])

  // Valori parsati dei due campi di input (quelli diversi da "computed").
  const distanceM = computed === 'distance' ? null : parseDistance(distanceRaw)
  const paceSec = computed === 'pace' ? null : parsePace(paceRaw)
  const timeSec = computed === 'time' ? null : parseSmartTime(timeRaw)

  // Risultato calcolato per il campo di output.
  const result = useMemo(() => {
    if (computed === 'time' && distanceM && paceSec) {
      return (distanceM / 1000) * paceSec
    }
    if (computed === 'pace' && distanceM && timeSec) {
      return timeSec / (distanceM / 1000)
    }
    if (computed === 'distance' && paceSec && timeSec) {
      return (timeSec / paceSec) * 1000 // metri
    }
    return null
  }, [computed, distanceM, paceSec, timeSec])

  // Valore effettivo di ciascuna variabile (input digitato o risultato calcolato).
  const effDistanceM = computed === 'distance' ? result : distanceM
  const effPaceSec = computed === 'pace' ? result : paceSec
  const effTimeSec = computed === 'time' ? result : timeSec

  const applyShortcut = (meters: number) => {
    setDistanceRaw(formatDistance(meters))
    touch('distance')
  }

  const shareUrl = useMemo(() => {
    if (!effDistanceM || !effPaceSec) return null
    const p = new URLSearchParams({
      d: String(Math.round(effDistanceM)),
      p: String(Math.round(effPaceSec)),
    })
    return `/tools/passo?${p.toString()}`
  }, [effDistanceM, effPaceSec])

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard non disponibile: si ignora */
    }
  }

  // Conversioni del passo per output secondario.
  const pacePerMile = effPaceSec ? effPaceSec * (METERS_PER_MILE / 1000) : null
  const kmh = effPaceSec ? 3600 / effPaceSec : null

  // Quando l'utente tocca il campo attualmente calcolato, ne facciamo un input:
  // vi travasiamo il valore già calcolato così può continuare a modificarlo, e
  // spostiamo il calcolo su un altro campo.
  const handleFocus = (field: Field) => {
    if (field === computed) {
      if (field === 'distance' && effDistanceM != null) setDistanceRaw(formatDistance(effDistanceM))
      if (field === 'pace' && effPaceSec != null) setPaceRaw(formatPace(effPaceSec))
      if (field === 'time' && effTimeSec != null) setTimeRaw(formatTime(effTimeSec))
    }
    touch(field)
  }

  return (
    <div>
      <div className="grid gap-3">
        {/* ── Distanza ── */}
        <Card active={computed === 'distance'} label="Distanza" output={computed === 'distance'}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="es. 10, 21.097, 800, 1 mi"
            value={computed === 'distance' && effDistanceM != null ? formatDistance(effDistanceM) : distanceRaw}
            onFocus={() => handleFocus('distance')}
            onChange={e => setDistanceRaw(e.target.value)}
            className={fieldClass(computed === 'distance')}
          />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SHORTCUTS.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => applyShortcut(s.meters)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-primary transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        {/* ── Passo ── */}
        <Card active={computed === 'pace'} label="Passo" output={computed === 'pace'}>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="es. 430 → 4:30"
              value={computed === 'pace' && effPaceSec != null ? formatPace(effPaceSec) : paceRaw}
              onFocus={() => handleFocus('pace')}
              onChange={e => setPaceRaw(e.target.value)}
              className={fieldClass(computed === 'pace')}
            />
            <span className="text-base text-gray-400 font-bold shrink-0">/km</span>
          </div>
          {effPaceSec != null && (
            <p className="text-xs text-gray-400 tabular-nums mt-2">
              {formatPace(pacePerMile!)}/mi · {kmh!.toFixed(1).replace('.', ',')} km/h
            </p>
          )}
        </Card>

        {/* ── Tempo ── */}
        <Card active={computed === 'time'} label="Tempo" output={computed === 'time'}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="es. 4500 → 45:00"
            value={computed === 'time' && effTimeSec != null ? formatTime(effTimeSec) : timeRaw}
            onFocus={() => handleFocus('time')}
            onChange={e => setTimeRaw(e.target.value)}
            className={fieldClass(computed === 'time')}
          />
        </Card>
      </div>

      {/* ── Condivisione ── */}
      {shareUrl && (
        <button
          type="button"
          onClick={copyLink}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-full hover:border-primary/40 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {copied ? 'check' : 'link'}
          </span>
          {copied ? 'Link copiato!' : 'Copia link per condividere'}
        </button>
      )}

      {/* ── CTA verso il core del prodotto ── */}
      <Link
        href="/bacheca"
        className="mt-3 flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold px-6 py-3.5 rounded-full hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined text-xl">group</span>
        Trova qualcuno che corre a questo passo
      </Link>
    </div>
  )
}

function Card({
  active,
  output,
  label,
  children,
}: {
  active: boolean
  output: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'rounded-2xl p-4 sm:p-5 bg-white transition-colors',
        active ? 'border-2 border-primary/50' : 'border border-gray-100',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-500">
          {label}
          {output && <span className="text-primary font-bold"> · in calcolo</span>}
        </span>
        {output && (
          <span className="material-symbols-outlined text-primary text-lg">calculate</span>
        )}
      </div>
      {children}
    </div>
  )
}

/** Stile del campo: evidenziato in arancione quando è quello calcolato (output). */
function fieldClass(isOutput: boolean): string {
  return [
    'tool-input text-xl font-extrabold tabular-nums w-full',
    isOutput ? 'text-primary' : '',
  ].join(' ')
}
