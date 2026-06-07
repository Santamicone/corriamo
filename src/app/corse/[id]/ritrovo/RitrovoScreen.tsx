'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  runId:                string
  userId:               string
  runTitle:             string
  runDate:              string
  runTime:              string
  color:                string   // hex bg
  textColor:            string   // '#FFFFFF' o '#111827'
  colorName:            string
  totalParticipants:    number
  initialCheckInsCount: number
  initialIsActive:      boolean
  existingCheckInId:    string | null
  runDetailHref:        string
}

export function RitrovoScreen({
  runId, userId, runTitle, runDate, runTime,
  color, textColor, colorName,
  totalParticipants, initialCheckInsCount,
  initialIsActive, existingCheckInId, runDetailHref,
}: Props) {
  const [isActive,    setIsActive]    = useState(initialIsActive)
  const [checkInId,   setCheckInId]   = useState(existingCheckInId)
  const [count,       setCount]       = useState(initialCheckInsCount)
  const [loading,     setLoading]     = useState(false)
  const [wakeLock,    setWakeLock]    = useState(false)
  const [showTip,     setShowTip]     = useState(false)

  const formattedDate = format(parseISO(runDate), "EEEE d MMMM", { locale: it })
  const formattedTime = runTime.slice(0, 5)

  /* ── Wake Lock ── */
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<unknown> } })
        .wakeLock.request('screen')
      setWakeLock(true)
    } catch {
      // Wake lock non disponibile — silenzioso
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      requestWakeLock()
      // Suggerimento luminosità — solo al primo utilizzo
      const seen = localStorage.getItem('ritrovo_brightness_tip')
      if (!seen) { setShowTip(true); localStorage.setItem('ritrovo_brightness_tip', '1') }
    }
  }, [isActive, requestWakeLock])

  /* ── Realtime — check-in degli altri ── */
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`check-ins-${runId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'check_ins',
        filter: `run_id=eq.${runId}`,
      }, (p) => {
        if ((p.new as { user_id: string }).user_id !== userId)
          setCount(c => c + 1)
      })
      .on('postgres_changes', {
        event:  'DELETE',
        schema: 'public',
        table:  'check_ins',
        filter: `run_id=eq.${runId}`,
      }, (p) => {
        if ((p.old as { user_id: string }).user_id !== userId)
          setCount(c => Math.max(0, c - 1))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [runId, userId])

  /* ── Azioni ── */
  const handleActivate = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('check_ins')
      .insert({ run_id: runId, user_id: userId })
      .select('id').single()
    if (!error && data) {
      setCheckInId(data.id)
      setIsActive(true)
      setCount(c => c + 1)
    }
    setLoading(false)
  }

  const handleDeactivate = async () => {
    if (!checkInId) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('check_ins').delete().eq('id', checkInId)
    setCheckInId(null)
    setIsActive(false)
    setCount(c => Math.max(0, c - 1))
    setLoading(false)
  }

  /* ── Dots indicator ── */
  const dots = Array.from({ length: Math.min(totalParticipants, 8) }, (_, i) => i < count)

  /* ── Stili derivati dal colore di sfondo ── */
  const isLight   = textColor === '#111827'
  const btnBg     = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'
  const btnBgHov  = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)'
  const borderCol = isLight ? 'rgba(0,0,0,0.2)'  : 'rgba(255,255,255,0.3)'

  /* ── Overlay attivo: schermo quasi pulito ── */
  if (isActive) {
    return (
      <div
        className="min-h-dvh flex flex-col select-none"
        style={{ backgroundColor: color, color: textColor }}
      >
        {/* Barra superiore minima */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
          <Link href={runDetailHref}
            style={{ color: textColor }}
            className="flex items-center gap-1.5 opacity-60 hover:opacity-90 text-sm font-semibold transition-opacity">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Torna alla corsa
          </Link>
          {wakeLock && (
            <span className="text-[10px] font-semibold opacity-50 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">brightness_high</span>
              Schermo attivo
            </span>
          )}
        </div>

        {/* Centro — massima visibilità */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">

          {/* Icona grande */}
          <span className="material-symbols-filled select-none"
                style={{ fontSize: 120, opacity: 0.9 }}>
            directions_run
          </span>

          {/* Info corsa */}
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-extrabold leading-tight">{runTitle}</p>
            <p className="text-base opacity-70 capitalize">{formattedDate} · {formattedTime}</p>
          </div>

          {/* Dots counter */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2.5">
              {dots.map((filled, i) => (
                <span key={i}
                      className="w-4 h-4 rounded-full border-2 transition-all duration-300"
                      style={{
                        backgroundColor: filled ? textColor : 'transparent',
                        borderColor: textColor,
                        opacity: filled ? 1 : 0.4,
                      }} />
              ))}
              {totalParticipants > 8 && (
                <span className="text-sm opacity-60">+{totalParticipants - 8}</span>
              )}
            </div>
            <p className="text-lg font-bold opacity-90">
              {count === 0
                ? 'Sei il primo ad arrivare'
                : count === 1
                  ? '1 runner qui — aspetta gli altri'
                  : `${count} runner qui`}
              {count > 0 && count < totalParticipants && (
                <span className="block text-sm font-normal opacity-60 mt-0.5">
                  su {totalParticipants} partecipanti
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Suggerimento luminosità */}
        {showTip && (
          <div className="mx-5 mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
               style={{ backgroundColor: btnBg }}>
            <span className="material-symbols-outlined text-xl shrink-0">brightness_high</span>
            <p className="text-xs font-medium leading-snug flex-1">
              Per massima visibilità, porta la luminosità dello schermo al massimo.
            </p>
            <button onClick={() => setShowTip(false)} className="opacity-60 hover:opacity-100">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Disattiva */}
        <div className="px-5 pb-8 shrink-0">
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: btnBg, border: `2px solid ${borderCol}` }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = btnBgHov)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = btnBg)}
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {loading ? 'Aggiornamento…' : 'Ho trovato il gruppo — Disattiva'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Stato preview (non ancora attivo) ── */
  return (
    <div
      className="min-h-dvh flex flex-col select-none"
      style={{ backgroundColor: color, color: textColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <Link href={runDetailHref}
          style={{ color: textColor }}
          className="flex items-center gap-1.5 opacity-60 hover:opacity-90 text-sm font-semibold transition-opacity">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Torna alla corsa
        </Link>
        <span className="text-xs font-bold opacity-50 uppercase tracking-wider">{colorName}</span>
      </div>

      {/* Contenuto */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 text-center py-8">

        {/* Icona preview */}
        <span className="material-symbols-filled select-none"
              style={{ fontSize: 96, opacity: 0.7 }}>
          directions_run
        </span>

        {/* Info */}
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-extrabold leading-tight">{runTitle}</p>
          <p className="text-base opacity-70 capitalize">{formattedDate} · {formattedTime}</p>
        </div>

        {/* Istruzioni */}
        <div className="max-w-xs flex flex-col gap-3">
          <div className="rounded-2xl px-5 py-4 text-left flex flex-col gap-1.5"
               style={{ backgroundColor: btnBg }}>
            <p className="text-sm font-bold">Come funziona</p>
            <p className="text-sm opacity-80 leading-relaxed">
              Arrivato al punto di ritrovo? Tap su <strong>Sono qui</strong> — lo schermo si illumina
              di questo colore. Gli altri partecipanti fanno lo stesso: identificatevi a colpo d&apos;occhio.
            </p>
          </div>

          {/* Counter attuale */}
          {count > 0 && (
            <div className="flex items-center justify-center gap-2 opacity-80">
              <div className="flex gap-1.5">
                {dots.slice(0, Math.min(count, 8)).map((_, i) => (
                  <span key={i} className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: textColor }} />
                ))}
              </div>
              <p className="text-sm font-semibold">
                {count === 1 ? '1 runner è già qui' : `${count} runner sono già qui`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 shrink-0 flex flex-col gap-3">
        <button
          onClick={handleActivate}
          disabled={loading}
          className="w-full py-5 rounded-2xl text-lg font-extrabold flex items-center justify-center gap-3 transition-all active:scale-95"
          style={{
            backgroundColor: textColor,
            color: color,
          }}
        >
          <span className="material-symbols-filled text-2xl">location_on</span>
          {loading ? 'Attivazione…' : 'Sono qui'}
        </button>
        <p className="text-xs text-center opacity-50">
          Lo schermo si illuminerà interamente di {colorName.toLowerCase()}
        </p>
      </div>
    </div>
  )
}
