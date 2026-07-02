'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { parsePace, formatPace, formatTime, formatDistance } from '@/lib/running/time'
import { parseGpx, type ParsedCourse } from '@/lib/running/gpx'
import { RACE_COURSES, type RaceCourse } from '@/lib/running/raceCourses.generated'
import {
  computeRaceStrategy,
  buildRaceComment,
  type RaceConditions,
  type Terrain,
  type WindType,
  type Crowd,
  type Approach,
} from '@/lib/running/raceStrategy'

const TERRAINS: { value: Terrain; label: string }[] = [
  { value: 'asfalto', label: 'Asfalto' },
  { value: 'misto', label: 'Misto' },
  { value: 'sterrato', label: 'Sterrato' },
  { value: 'sampietrini', label: 'Sampietrini' },
  { value: 'trail', label: 'Trail leggero' },
]
const WINDS: { value: WindType; label: string }[] = [
  { value: 'nullo', label: 'Assente / debole' },
  { value: 'contro', label: 'Contrario' },
  { value: 'favore', label: 'A favore' },
  { value: 'laterale', label: 'Laterale' },
]
const CROWDS: { value: Crowd; label: string }[] = [
  { value: 'basso', label: 'Poco affollata' },
  { value: 'medio', label: 'Media' },
  { value: 'alto', label: 'Molto partecipata' },
]
const APPROACHES: { value: Approach; label: string; hint: string }[] = [
  { value: 'prudente', label: 'Prudente', hint: 'parti cauto, progressione finale' },
  { value: 'regolare', label: 'Regolare', hint: 'ritmo costante' },
  { value: 'aggressivo', label: 'Aggressivo', hint: 'parti forte, rischio maggiore' },
]

export function RaceStrategyTool() {
  const [course, setCourse] = useState<ParsedCourse | null>(null)
  const [raceName, setRaceName] = useState('')
  const [gpxError, setGpxError] = useState<string | null>(null)
  const [paceInput, setPaceInput] = useState('')

  const [temperature, setTemperature] = useState('')
  const [humidity, setHumidity] = useState('')
  const [windKmh, setWindKmh] = useState('')
  const [windType, setWindType] = useState<WindType>('nullo')
  const [terrain, setTerrain] = useState<Terrain>('asfalto')
  const [crowd, setCrowd] = useState<Crowd>('medio')
  const [approach, setApproach] = useState<Approach>('regolare')

  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [courseQuery, setCourseQuery] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setGpxError(null)
    setSubmitted(false)
    setSelectedCourseId(null)
    try {
      const text = await file.text()
      const parsed = parseGpx(text)
      if (parsed.segments.length === 0) {
        throw new Error('Il percorso è troppo corto per essere analizzato.')
      }
      setCourse(parsed)
      if (!raceName.trim()) setRaceName(file.name.replace(/\.gpx$/i, ''))
    } catch (err) {
      setCourse(null)
      setGpxError(err instanceof Error ? err.message : 'File GPX non valido.')
    }
  }

  const handleSelectCourse = (race: RaceCourse) => {
    setGpxError(null)
    setSubmitted(false)
    if (fileRef.current) fileRef.current.value = ''
    if (selectedCourseId === race.id) {
      // Deseleziona il percorso.
      setSelectedCourseId(null)
      setCourse(null)
      return
    }
    setSelectedCourseId(race.id)
    setCourse(race)
    setRaceName(race.name)
  }

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase()
    if (!q) return RACE_COURSES
    return RACE_COURSES.filter(
      c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q),
    )
  }, [courseQuery])

  const idealPaceSec = useMemo(() => parsePace(paceInput), [paceInput])

  const conditions = useMemo<RaceConditions>(() => ({
    temperatureC: temperature.trim() ? Number(temperature) : undefined,
    humidityPct: humidity.trim() ? Number(humidity) : undefined,
    windKmh: windKmh.trim() ? Number(windKmh) : undefined,
    windType,
    terrain,
    crowd,
    approach,
  }), [temperature, humidity, windKmh, windType, terrain, crowd, approach])

  const result = useMemo(() => {
    if (!submitted || !course || !idealPaceSec) return null
    return computeRaceStrategy({ idealPaceSec, segments: course.segments, conditions })
  }, [submitted, course, idealPaceSec, conditions])

  const commentParagraphs = useMemo(() => {
    if (!result || !idealPaceSec) return null
    return buildRaceComment(result, conditions, idealPaceSec)
  }, [result, conditions, idealPaceSec])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!course) {
      setFormError('Seleziona un percorso demo o carica un file GPX.')
      return
    }
    if (!idealPaceSec) {
      setFormError('Inserisci un passo ideale valido (es. 5:00).')
      return
    }
    setSubmitted(true)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 grid gap-5">
        {/* ── Percorso ── */}
        <div className="grid gap-3">
          <span className="text-sm font-semibold text-gray-700">1. Percorso di gara</span>

          {/* Percorsi precaricati (gare reali) */}
          <div className="grid gap-2">
            <span className="text-xs text-gray-400">Scegli una gara dal catalogo…</span>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none">search</span>
              <input
                type="text"
                value={courseQuery}
                onChange={e => setCourseQuery(e.target.value)}
                placeholder="Cerca per gara o città (es. Roma, Berlino…)"
                className="tool-input pl-10"
              />
            </div>
            <div className="grid gap-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredCourses.length === 0 && (
                <p className="text-xs text-gray-400 px-1 py-2">Nessuna gara trovata per «{courseQuery}».</p>
              )}
              {filteredCourses.map(race => {
                const selected = selectedCourseId === race.id
                return (
                  <button
                    key={race.id}
                    type="button"
                    onClick={() => handleSelectCourse(race)}
                    className={[
                      'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                      selected ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-primary/30',
                    ].join(' ')}
                  >
                    <span className="min-w-0">
                      <span className={['block text-sm font-bold truncate', selected ? 'text-primary' : 'text-gray-700'].join(' ')}>{race.name}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{race.city}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-[11px] text-gray-500">
                      <span><strong className="text-gray-700">{formatDistance(race.distanceM)}</strong></span>
                      <span className="hidden sm:inline">D+ <strong className="text-gray-700">{race.ascentM}</strong></span>
                      {selected && <span className="material-symbols-outlined text-primary text-lg">check_circle</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload GPX personale */}
          <span className="text-xs text-gray-400">…oppure carica il tuo file GPX</span>
          <input
            ref={fileRef}
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            onChange={e => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-5 text-gray-500 hover:border-primary/40 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">upload_file</span>
            {course && !selectedCourseId ? 'Cambia file GPX' : 'Carica il file GPX del percorso'}
          </button>
          {gpxError && <p className="text-xs text-error font-medium">{gpxError}</p>}
          {course && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
              <span><strong className="text-gray-700">{formatDistance(course.distanceM)}</strong> totali</span>
              <span>D+ <strong className="text-gray-700">{course.ascentM} m</strong></span>
              <span>D− <strong className="text-gray-700">{course.descentM} m</strong></span>
              {!course.hasElevation && (
                <span className="text-primary">⚠ nessuna quota nel file: altimetria non considerata</span>
              )}
            </div>
          )}
        </div>

        {course && <ElevationProfile course={course} />}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-gray-700">Nome gara (facoltativo)</span>
          <input
            type="text"
            value={raceName}
            onChange={e => setRaceName(e.target.value)}
            placeholder="es. Maratona di Roma"
            className="tool-input"
          />
        </label>

        {/* ── Passo ideale ── */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-gray-700">2. Passo ideale su piatto</span>
          <input
            type="text"
            inputMode="numeric"
            value={paceInput}
            onChange={e => { setPaceInput(e.target.value); setSubmitted(false) }}
            placeholder="min/km, es. 5:00"
            className="tool-input"
          />
          <span className="text-xs text-gray-400">
            Il passo che reggeresti su percorso piatto, asfalto regolare e clima favorevole.
          </span>
        </label>

        {/* ── Condizioni ── */}
        <div className="grid gap-4">
          <span className="text-sm font-semibold text-gray-700">3. Condizioni di gara</span>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Temperatura" hint="°C, facoltativo">
              <input type="number" inputMode="numeric" value={temperature}
                onChange={e => { setTemperature(e.target.value); setSubmitted(false) }}
                placeholder="es. 18" className="tool-input" />
            </Field>
            <Field label="Umidità" hint="%, facoltativo">
              <input type="number" inputMode="numeric" value={humidity}
                onChange={e => { setHumidity(e.target.value); setSubmitted(false) }}
                placeholder="es. 60" className="tool-input" />
            </Field>
            <Field label="Vento" hint="km/h, facoltativo">
              <input type="number" inputMode="numeric" value={windKmh}
                onChange={e => { setWindKmh(e.target.value); setSubmitted(false) }}
                placeholder="es. 15" className="tool-input" />
            </Field>
            <Field label="Direzione vento">
              <select value={windType} onChange={e => { setWindType(e.target.value as WindType); setSubmitted(false) }} className="tool-input">
                {WINDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Fondo">
              <select value={terrain} onChange={e => { setTerrain(e.target.value as Terrain); setSubmitted(false) }} className="tool-input">
                {TERRAINS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Affollamento">
              <select value={crowd} onChange={e => { setCrowd(e.target.value as Crowd); setSubmitted(false) }} className="tool-input">
                {CROWDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Approccio alla gara">
            <div className="grid grid-cols-3 gap-2">
              {APPROACHES.map(a => {
                const selected = approach === a.value
                return (
                  <button key={a.value} type="button"
                    onClick={() => { setApproach(a.value); setSubmitted(false) }}
                    className={[
                      'flex flex-col items-center gap-0.5 px-2 py-3 rounded-xl border text-center transition-all',
                      selected ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-primary/30',
                    ].join(' ')}>
                    <span className={['text-sm font-bold', selected ? 'text-primary' : 'text-gray-700'].join(' ')}>{a.label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{a.hint}</span>
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {formError && <p className="text-sm text-error font-medium">{formError}</p>}

        <button type="submit"
          className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
          <span className="material-symbols-outlined text-xl">insights</span>
          Calcola la strategia
        </button>
      </form>

      {/* ── Risultato ── */}
      {result && idealPaceSec && (
        <div className="mt-8">
          {/* Riepilogo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Tempo finale stimato" value={formatTime(result.totalTimeSec)} accent
              hint={`± ${formatTime(result.marginSec)}`} />
            <Stat label="Passo medio reale" value={`${formatPace(result.avgPaceSec)}/km`}
              hint={`ideale ${formatPace(idealPaceSec)}`} />
            <Stat label="Distanza" value={formatDistance(result.distanceM)}
              hint={`+${result.ascentM} / −${result.descentM} m`} />
            <Stat label="Impatto condizioni" value={`${result.environmentPct >= 0 ? '+' : ''}${result.environmentPct}%`}
              hint="fondo e meteo" />
          </div>

          {/* Commento gara (dalle caratteristiche del percorso) */}
          {commentParagraphs && commentParagraphs.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-white border border-primary/20 rounded-2xl p-5 sm:p-6 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                <h3 className="text-base font-extrabold text-gray-900">Come affrontare la gara</h3>
              </div>
              <div className="grid gap-3">
                {commentParagraphs.map((para, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Tratti critici */}
          {result.criticalKms.length > 0 && (
            <div className="flex items-start gap-3 bg-error-container border border-error/20 rounded-2xl p-4 mb-5">
              <span className="material-symbols-outlined text-error">warning</span>
              <p className="text-sm text-on-error-container leading-relaxed">
                <strong>Tratti critici:</strong> km {result.criticalKms.join(', ')}. Qui il rischio di
                perdere ritmo o bruciare energie è più alto — arrivaci con margine.
              </p>
            </div>
          )}

          {/* Tabella split */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Split consigliati per km</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left font-semibold px-4 py-2">Km</th>
                    <th className="text-left font-semibold px-4 py-2">Passo</th>
                    <th className="text-left font-semibold px-4 py-2">vs ideale</th>
                    <th className="text-left font-semibold px-4 py-2 hidden sm:table-cell">Pend.</th>
                    <th className="text-left font-semibold px-4 py-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {result.splits.map(s => (
                    <tr key={s.km} className={['border-t border-gray-50', s.critical ? 'bg-error-container/40' : ''].join(' ')}>
                      <td className="px-4 py-2.5 font-bold text-gray-700">{s.km}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-900">{formatPace(s.paceSec)}</td>
                      <td className={['px-4 py-2.5 font-mono font-semibold', s.deltaSec > 0 ? 'text-error' : s.deltaSec < 0 ? 'text-tertiary' : 'text-gray-400'].join(' ')}>
                        {s.deltaSec > 0 ? '+' : ''}{s.deltaSec}s
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{s.gradePct > 0 ? '+' : ''}{s.gradePct}%</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Link href="/gare"
            className="mt-6 flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
            <span className="material-symbols-outlined text-xl">group</span>
            Trova pacer e compagni per questa gara
          </Link>
        </div>
      )}
    </div>
  )
}

/** Profilo altimetrico compatto in SVG. */
function ElevationProfile({ course }: { course: ParsedCourse }) {
  if (!course.hasElevation || course.segments.length < 2) return null
  const W = 600
  const H = 90
  const grades = course.segments.map(s => s.gradePct)
  const maxAbs = Math.max(3, ...grades.map(g => Math.abs(g)))
  const n = course.segments.length
  const barW = W / n

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">Profilo per km (pendenza)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img"
        aria-label="Profilo altimetrico del percorso">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#e5e7eb" strokeWidth="1" />
        {course.segments.map((s, i) => {
          const h = (Math.abs(s.gradePct) / maxAbs) * (H / 2 - 4)
          const up = s.gradePct >= 0
          const y = up ? H / 2 - h : H / 2
          const color = up ? '#ea580c' : '#16a34a'
          return <rect key={i} x={i * barW + 0.5} y={y} width={Math.max(0.5, barW - 1)} height={Math.max(1, h)} fill={color} opacity={0.85} />
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>km 1</span>
        <span className="text-primary">salita</span>
        <span className="text-tertiary">discesa</span>
        <span>km {n}</span>
      </div>
    </div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={['rounded-2xl border p-4', accent ? 'border-primary/30 bg-orange-50' : 'border-gray-100 bg-white'].join(' ')}>
      <p className="text-xs text-gray-400 font-medium leading-tight">{label}</p>
      <p className={['text-xl font-extrabold mt-1', accent ? 'text-primary' : 'text-gray-900'].join(' ')}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
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
