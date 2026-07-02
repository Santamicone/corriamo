'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Race } from '@/lib/types'
import { countryLabel } from '@/components/RaceCard'
import { formatDateShort } from '@/lib/utils'
import {
  matchRaces,
  type MatchPrefs,
  type MatchGoal,
  type MatchPref,
} from '@/lib/running/raceMatcher'

const DISTANCE_OPTIONS = [
  { value: '', label: 'Qualsiasi' },
  { value: '42k', label: 'Maratona' },
  { value: '21k', label: 'Mezza' },
  { value: '10k', label: '10K' },
  { value: '5k', label: '5K' },
]

const HORIZON_OPTIONS = [
  { value: '3', label: 'Entro 3 mesi' },
  { value: '6', label: 'Entro 6 mesi' },
  { value: '12', label: 'Entro 1 anno' },
  { value: '', label: 'Nessun limite' },
]

const AREA_OPTIONS = [
  { value: '', label: 'Ovunque' },
  { value: 'italia', label: 'Solo Italia' },
  { value: 'europa', label: 'Europa' },
]

const GOAL_OPTIONS: { value: MatchGoal; label: string; icon: string }[] = [
  { value: 'finire', label: 'Arrivare in fondo', icon: 'flag' },
  { value: 'pb', label: 'Fare il personale', icon: 'timer' },
  { value: 'esperienza', label: 'Vivere l’esperienza', icon: 'celebration' },
  { value: 'viaggio', label: 'Correre in viaggio', icon: 'flight' },
  { value: 'prep_maratona', label: 'Preparare la maratona', icon: 'fitness_center' },
]

const PREF_OPTIONS: { value: MatchPref; label: string; icon: string }[] = [
  { value: 'pianura', label: 'Percorso pianeggiante', icon: 'trending_flat' },
  { value: 'clima_fresco', label: 'Clima fresco', icon: 'ac_unit' },
  { value: 'gara_grande', label: 'Gara grande', icon: 'groups' },
  { value: 'gara_piccola', label: 'Gara piccola', icon: 'group' },
]

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

export function RaceMatcherTool({ races }: { races: Race[] }) {
  const [distance, setDistance] = useState('')
  const [horizon, setHorizon] = useState('6')
  const [area, setArea] = useState('')
  const [goal, setGoal] = useState<MatchGoal>('finire')
  const [selPrefs, setSelPrefs] = useState<MatchPref[]>([])
  const [submitted, setSubmitted] = useState(false)

  const togglePref = (p: MatchPref) => {
    setSubmitted(false)
    setSelPrefs(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }

  const results = useMemo(() => {
    if (!submitted) return null
    const prefs: MatchPrefs = {
      distance: (distance || undefined) as MatchPrefs['distance'],
      horizonMonths: horizon ? Number(horizon) : undefined,
      area: (area || undefined) as MatchPrefs['area'],
      goal,
      prefs: selPrefs,
    }
    return matchRaces(races, prefs)
  }, [submitted, distance, horizon, area, goal, selPrefs, races])

  return (
    <div>
      <form
        onSubmit={e => { e.preventDefault(); setSubmitted(true) }}
        className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 grid gap-5"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-700">Distanza</span>
            <select value={distance} onChange={e => { setDistance(e.target.value); setSubmitted(false) }} className="tool-input">
              {DISTANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-700">Periodo</span>
            <select value={horizon} onChange={e => { setHorizon(e.target.value); setSubmitted(false) }} className="tool-input">
              {HORIZON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-700">Dove</span>
            <select value={area} onChange={e => { setArea(e.target.value); setSubmitted(false) }} className="tool-input">
              {AREA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700">Il tuo obiettivo</span>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => { setGoal(o.value); setSubmitted(false) }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                  goal === o.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/50 bg-white'
                }`}>
                <span className="material-symbols-outlined text-base">{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700">Preferenze <span className="font-normal text-gray-400">(facoltative)</span></span>
          <div className="flex flex-wrap gap-2">
            {PREF_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => togglePref(o.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                  selPrefs.includes(o.value)
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/50 bg-white'
                }`}>
                <span className="material-symbols-outlined text-base">{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
          Trova le mie gare
        </button>
      </form>

      {results && (
        <div className="mt-8">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                <strong className="text-gray-900">Per te</strong>, in ordine di affinità:
              </p>
              <div className="flex flex-col gap-3">
                {results.map(({ race, reasons }, i) => {
                  const country = countryLabel(race.country)
                  return (
                    <Link key={race.id} href={`/calendario-gare/${race.slug}`}
                      className="group flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-md transition-all">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-orange-50 text-primary font-extrabold flex items-center justify-center text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-gray-900 group-hover:text-primary transition-colors leading-snug">{race.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {race.distances.map(d => DISTANCE_LABELS[d] ?? d).join(', ')} · {race.city} {country.flag} · <span className="capitalize">{formatDateShort(race.event_date)}</span>
                        </p>
                        {reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {reasons.map(r => (
                              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-primary px-2 py-0.5 text-[11px] font-semibold">
                                <span className="material-symbols-outlined text-xs">check</span>{r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all self-center">arrow_forward</span>
                    </Link>
                  )
                })}
              </div>

              <Link href="/calendario-gare"
                className="mt-6 flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold px-6 py-3.5 rounded-full hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-xl">calendar_month</span>
                Sfoglia tutto il calendario
              </Link>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
              <p className="font-bold text-gray-900">Nessuna gara con questi criteri</p>
              <p className="text-sm text-gray-500 mt-1">Prova ad allargare il periodo o l’area, o togli qualche preferenza.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
