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
  { label: '400m', meters: 400 },
  { label: '3K', meters: 3000 },
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: '15K', meters: 15000 },
  { label: '21K', meters: 21097.5 },
  { label: '30K', meters: 30000 },
  { label: '42K', meters: 42195 },
  { label: '50K', meters: 50000 },
  { label: '100K', meters: 100000 },
]

/** Punti di passaggio per gli split automatici (v2). */
const SPLIT_POINTS: { label: string; m: number }[] = [
  { label: '1 km', m: 1000 },
  { label: '5 km', m: 5000 },
  { label: '10 km', m: 10000 },
  { label: '15 km', m: 15000 },
  { label: '20 km', m: 20000 },
  { label: 'Mezza maratona', m: 21097.5 },
  { label: '30 km', m: 30000 },
  { label: 'Maratona', m: 42195 },
]

/** Voce salvata nella cronologia (metri, secondi/km, secondi). */
type HistoryEntry = { d: number; p: number; t: number }

const HISTORY_KEY = 'vac:passo:history'

/** Riga del braccialetto da gara: etichetta km + tempo cumulativo. */
type BandRow = { label: string; timeSec: number; highlight: boolean }

/**
 * Costruisce le righe del braccialetto: un passaggio per ogni km intero, con i
 * multipli di 5 km evidenziati, la mezza maratona intercalata e la riga di
 * arrivo se la distanza non è un km intero. Tempi cumulativi a passo costante.
 */
function buildBand(distanceM: number, paceSec: number): BandRow[] {
  const rows: { m: number; label: string; highlight: boolean }[] = []
  const fullKm = Math.floor(distanceM / 1000)
  for (let k = 1; k <= fullKm; k++) {
    const isFive = k % 5 === 0
    rows.push({ m: k * 1000, label: isFive ? `${k}K` : String(k), highlight: isFive })
  }
  // Mezza maratona, se rientra nella distanza e non coincide con un km intero.
  const HALF = 21097.5
  if (distanceM >= HALF && Math.abs(HALF - Math.round(HALF / 1000) * 1000) > 1) {
    rows.push({ m: HALF, label: 'Mezza', highlight: true })
  }
  // Arrivo: se la distanza non è un km intero, aggiunge la riga finale.
  if (Math.abs(distanceM - fullKm * 1000) > 1) {
    rows.push({ m: distanceM, label: formatDistance(distanceM), highlight: true })
  }
  return rows
    .sort((a, b) => a.m - b.m)
    .map(r => ({ label: r.label, timeSec: paceSec * (r.m / 1000), highlight: r.highlight }))
}

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

  // ── v2 · Arrotondamenti passo ──
  // Quando il passo è il valore calcolato e non è "tondo", proponiamo i multipli
  // di 5 secondi vicini, comodi per programmare gli allenamenti.
  const paceRoundings = useMemo(() => {
    if (computed !== 'pace' || effPaceSec == null) return null
    const s = Math.round(effPaceSec)
    if (s % 5 === 0) return null
    const base = Math.floor(s / 5) * 5
    return [base, base + 5, base + 10]
  }, [computed, effPaceSec])

  const applyRounding = (sec: number) => {
    // Fissa il passo scelto tenendo la distanza: ricalcoliamo il tempo.
    setPaceRaw(formatPace(sec))
    setOrder(['pace', 'distance', 'time'])
  }

  // ── v2 · Split automatici ──
  // Passaggi cumulativi ai punti chiave, fino alla distanza inserita.
  const splits = useMemo(() => {
    if (effPaceSec == null || effDistanceM == null || effDistanceM < 1000) return null
    const rows = SPLIT_POINTS.filter(p => p.m <= effDistanceM + 1).map(p => ({
      label: p.label,
      timeSec: effPaceSec * (p.m / 1000),
    }))
    // Aggiunge la distanza totale se non coincide con un punto standard.
    const isStandard = SPLIT_POINTS.some(p => Math.abs(p.m - effDistanceM) < 1)
    if (!isStandard) {
      rows.push({ label: formatDistance(effDistanceM), timeSec: effPaceSec * (effDistanceM / 1000) })
    }
    return rows.length ? rows : null
  }, [effPaceSec, effDistanceM])

  // ── v2 · Braccialetto da gara ──
  // Strip stampabile con il passaggio cumulativo a ogni km, da ritagliare.
  const [showBand, setShowBand] = useState(false)
  const band = useMemo(() => {
    if (effPaceSec == null || effDistanceM == null || effDistanceM < 2000) return null
    return buildBand(effDistanceM, effPaceSec)
  }, [effPaceSec, effDistanceM])

  // ── v2 · Cronologia (localStorage) ──
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      /* localStorage non disponibile o dato corrotto: si ignora */
    }
  }, [])

  // Salva l'ultimo calcolo completo dopo una breve pausa (debounce), deduplicando.
  useEffect(() => {
    if (effDistanceM == null || effPaceSec == null || effTimeSec == null) return
    if (!(effDistanceM > 0 && effPaceSec > 0 && effTimeSec > 0)) return
    const entry: HistoryEntry = {
      d: Math.round(effDistanceM),
      p: Math.round(effPaceSec),
      t: Math.round(effTimeSec),
    }
    const id = setTimeout(() => {
      setHistory(prev => {
        const next = [entry, ...prev.filter(e => !(e.d === entry.d && e.p === entry.p))].slice(0, 6)
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
        } catch {
          /* localStorage non disponibile: si ignora */
        }
        return next
      })
    }, 1200)
    return () => clearTimeout(id)
  }, [effDistanceM, effPaceSec, effTimeSec])

  const restore = (e: HistoryEntry) => {
    setDistanceRaw(formatDistance(e.d))
    setPaceRaw(formatPace(e.p))
    setTimeRaw(formatTime(e.t))
    setOrder(['pace', 'distance', 'time'])
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* localStorage non disponibile: si ignora */
    }
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
          {paceRoundings && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-xs text-gray-400 shrink-0">Arrotonda a</span>
              {paceRoundings.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => applyRounding(sec)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 tabular-nums hover:bg-orange-50 hover:text-primary transition-colors"
                >
                  {formatPace(sec)}
                </button>
              ))}
            </div>
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

      {/* ── Split automatici ── */}
      {splits && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Passaggi a questo passo
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            {splits.map((s, i) => (
              <div
                key={s.label}
                className={[
                  'flex items-center justify-between px-4 py-2.5 text-sm',
                  i > 0 ? 'border-t border-gray-50' : '',
                ].join(' ')}
              >
                <span className="text-gray-600">{s.label}</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatTime(s.timeSec)}</span>
              </div>
            ))}
          </div>

          {band && (
            <button
              type="button"
              onClick={() => setShowBand(v => !v)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-full hover:border-primary/40 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                {showBand ? 'expand_less' : 'straighten'}
              </span>
              {showBand ? 'Nascondi braccialetto' : 'Crea braccialetto da gara'}
            </button>
          )}
        </div>
      )}

      {/* ── Braccialetto da gara (stampabile e ritagliabile) ── */}
      {showBand && band && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              Stampa, ritaglia lungo il bordo e arrotola al polso.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-on-primary text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-hover transition-colors"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Stampa
            </button>
          </div>

          <div id="pace-band" className="pace-band">
            <div className="pace-band-head">
              <span className="pace-band-title">Vieni a correre?</span>
              <span className="pace-band-meta">
                {effDistanceM != null && formatDistance(effDistanceM)}
                {effTimeSec != null && ` · ${formatTime(effTimeSec)}`}
                {effPaceSec != null && ` · ${formatPace(effPaceSec)}/km`}
              </span>
            </div>
            {band.map((r, i) => (
              <div
                key={`${r.label}-${i}`}
                className={['pace-band-row', r.highlight ? 'is-hl' : ''].join(' ')}
              >
                <span className="pace-band-km">{r.label}</span>
                <span className="pace-band-time">{formatTime(r.timeSec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA verso il core del prodotto ── */}
      <Link
        href="/bacheca"
        className="mt-6 flex items-center justify-center gap-2 bg-secondary text-on-secondary font-semibold px-6 py-3.5 rounded-full hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined text-xl">group</span>
        Trova qualcuno che corre a questo passo
      </Link>

      {/* ── Cronologia ── */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Calcoli recenti
            </p>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs font-semibold text-gray-400 hover:text-error transition-colors"
            >
              Svuota
            </button>
          </div>
          <div className="grid gap-2">
            {history.map((e, i) => (
              <button
                key={`${e.d}-${e.p}-${i}`}
                type="button"
                onClick={() => restore(e)}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5 text-left hover:border-primary/30 transition-colors"
              >
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {formatDistance(e.d)}
                </span>
                <span className="text-sm text-gray-500 tabular-nums">
                  {formatPace(e.p)}/km · {formatTime(e.t)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{BAND_STYLES}</style>
    </div>
  )
}

/**
 * Stili del braccialetto. A schermo è una striscia stretta; in stampa nasconde
 * il resto della pagina e lascia solo la striscia con bordo tratteggiato (guida
 * di taglio), ottimizzata per essere ritagliata e arrotolata al polso.
 */
const BAND_STYLES = `
.pace-band {
  width: 62mm;
  max-width: 100%;
  margin: 0 auto;
  border: 1.5px dashed #9ca3af;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  font-variant-numeric: tabular-nums;
}
.pace-band-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: #ea580c;
  color: #fff;
  text-align: center;
}
.pace-band-title { font-size: 11px; font-weight: 800; letter-spacing: .04em; }
.pace-band-meta { font-size: 12px; font-weight: 700; }
.pace-band-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 5px 14px;
  font-size: 15px;
  border-top: 1px solid #f1f5f9;
}
.pace-band-row.is-hl { background: #dbeafe; }
.pace-band-km { color: #6b7280; font-weight: 700; }
.pace-band-row.is-hl .pace-band-km { color: #1e3a8a; }
.pace-band-time { font-weight: 800; color: #111827; }
@media print {
  body * { visibility: hidden !important; }
  #pace-band, #pace-band * { visibility: visible !important; }
  #pace-band {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
  }
}
`

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
