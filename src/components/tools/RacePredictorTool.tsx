'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { parseTime, formatTime, formatPace } from '@/lib/running/time'
import {
  predictTime,
  DISTANCES,
  DISTANCE_LABELS,
  type DistanceKey,
} from '@/lib/running/riegel'

const KEYS = Object.keys(DISTANCES) as DistanceKey[]

/**
 * Esponenti del predittore. Riegel classico (1.06) descrive il caso buono,
 * con preparazione specifica sulla distanza ("ottimistico"). Per l'amatore
 * medio la previsione realistica è un po' più prudente sulle lunghe (1.10),
 * dove conta di più l'allenamento mirato.
 */
const EXP_OPTIMISTIC = 1.06
const EXP_REALISTIC = 1.1

export function RacePredictorTool() {
  const [fromKey, setFromKey] = useState<DistanceKey>('k10')
  const [toKey, setToKey] = useState<DistanceKey>('half')
  const [time, setTime] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = useMemo(() => {
    if (!submitted) return null
    const sec = parseTime(time)
    if (!sec || fromKey === toKey) return null
    const fromM = DISTANCES[fromKey]
    const toM = DISTANCES[toKey]
    const realistic = predictTime(sec, fromM, toM, EXP_REALISTIC)
    const optimistic = predictTime(sec, fromM, toM, EXP_OPTIMISTIC)
    const toKm = toM / 1000
    return {
      realistic,
      optimistic,
      paceRealistic: realistic / toKm,
      paceOptimistic: optimistic / toKm,
    }
  }, [submitted, time, fromKey, toKey])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (fromKey === toKey) {
      setError('Scegli due distanze diverse: la gara di partenza e quella da prevedere.')
      setSubmitted(false)
      return
    }
    if (!parseTime(time)) {
      setError('Inserisci un tempo valido nel formato mm:ss oppure h:mm:ss.')
      setSubmitted(false)
      return
    }
    setError(null)
    setSubmitted(true)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 grid gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-700">Hai un tempo su…</span>
            <select
              value={fromKey}
              onChange={e => { setFromKey(e.target.value as DistanceKey); setSubmitted(false) }}
              className="tool-input"
            >
              {KEYS.map(k => <option key={k} value={k}>{DISTANCE_LABELS[k]}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-700">Tempo ottenuto</span>
            <input
              type="text"
              inputMode="text"
              placeholder="mm:ss"
              value={time}
              onChange={e => { setTime(e.target.value); setSubmitted(false) }}
              className="tool-input"
            />
            <span className="text-xs text-gray-400">es. 40:00 oppure 1:32:00</span>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-700">Distanza da prevedere</span>
            <select
              value={toKey}
              onChange={e => { setToKey(e.target.value as DistanceKey); setSubmitted(false) }}
              className="tool-input"
            >
              {KEYS.map(k => <option key={k} value={k}>{DISTANCE_LABELS[k]}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-error font-medium">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
        >
          <span className="material-symbols-outlined text-xl">timer</span>
          Prevedi il mio tempo
        </button>
      </form>

      {result && (
        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-4">
            Da un <strong>{DISTANCE_LABELS[fromKey]} in {formatTime(parseTime(time)!)}</strong>,
            la tua <strong>{DISTANCE_LABELS[toKey]}</strong> potrebbe stare tra:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Realistico</p>
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums mt-1">{formatTime(result.realistic)}</p>
              <p className="text-xs text-gray-400 tabular-nums mt-0.5">{formatPace(result.paceRealistic)}/km</p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-orange-50 p-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Ottimistico</p>
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums mt-1">{formatTime(result.optimistic)}</p>
              <p className="text-xs text-gray-500 tabular-nums mt-0.5">{formatPace(result.paceOptimistic)}/km</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600 leading-relaxed bg-secondary-container rounded-xl px-4 py-3">
            La previsione <strong>ottimistica</strong> richiede una preparazione specifica sulla distanza.
            Più la gara è lunga, più conta l'allenamento mirato: la conversione dipende da fondo, clima e altimetria.
          </p>

          <Link
            href="/bacheca"
            className="mt-6 flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold px-6 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">group</span>
            Trova compagni con cui prepararla
          </Link>
        </div>
      )}
    </div>
  )
}
