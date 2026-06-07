'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from './ui/Avatar'
import { LEVEL_LABELS, parseRunDateTime } from '@/lib/utils'
import type { Run } from '@/lib/types'

/* ── Haversine distance ── */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ── Countdown formattato ── */
function minutesUntil(dateStr: string, timeStr: string): number {
  return Math.round((parseRunDateTime(dateStr, timeStr).getTime() - Date.now()) / 60000)
}

function formatCountdown(min: number): string {
  if (min <= 0)   return 'Sta partendo!'
  if (min < 60)   return `tra ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `tra ${h}h ${m}min` : `tra ${h}h`
}

type SpotRun = Run & { lat?: number; lng?: number; distance_from_user?: number }

export function SpotRunsStrip() {
  const [runs,         setRuns]         = useState<SpotRun[]>([])
  const [userPos,      setUserPos]      = useState<{ lat: number; lng: number } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [tick,         setTick]         = useState(0)   // per aggiornare i countdown

  /* Geolocalizzazione */
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    )
  }, [])

  /* Fetch corse dell'ultimo momento */
  const fetchSpot = useCallback(async () => {
    const supabase = createClient()
    const now      = new Date()
    const plus3h   = new Date(now.getTime() + 3 * 60 * 60 * 1000)

    const todayStr = now.toISOString().split('T')[0]
    const nowTime  = now.toTimeString().slice(0, 5)
    const maxTime  = plus3h.toISOString().split('T')[0] === todayStr
      ? plus3h.toTimeString().slice(0, 5)
      : '23:59'

    const { data } = await supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('status', 'aperta')
      .eq('date', todayStr)
      .gte('time', nowTime)
      .lte('time', maxTime)
      .order('time', { ascending: true })

    setRuns((data ?? []) as unknown as SpotRun[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSpot() }, [fetchSpot])

  /* Aggiorna countdown ogni 30s */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  /* Ordina per distanza se geolocalizzazione disponibile */
  const sortedRuns: SpotRun[] = userPos
    ? [...runs]
        .map(r => ({
          ...r,
          distance_from_user: (r.lat && r.lng)
            ? distanceKm(userPos.lat, userPos.lng, r.lat, r.lng)
            : undefined,
        }))
        .sort((a, b) => {
          if (a.distance_from_user !== undefined && b.distance_from_user !== undefined)
            return a.distance_from_user - b.distance_from_user
          return 0
        })
    : runs

  if (loading || sortedRuns.length === 0) return null

  return (
    <section className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* Header strip */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-white">
              Adesso
            </h2>
            <span className="text-xs text-gray-400 font-medium">
              {sortedRuns.length} cors{sortedRuns.length === 1 ? 'a' : 'e'} nelle prossime 3 ore
            </span>
          </div>
          <Link
            href="/nuova-corsa-spot"
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            Proponi adesso
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {sortedRuns.map(run => (
            <SpotCard key={run.id} run={run} tick={tick} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Card singola ── */
function SpotCard({ run, tick }: { run: SpotRun; tick: number }) {
  const min = minutesUntil(run.date, run.time)
  const countdown = formatCountdown(min)
  const isImminent = min <= 30

  // tick è un numero che cambia ogni 30s, serve solo per forzare il re-render del countdown
  void tick

  return (
    <Link
      href={`/corse/${run.id}`}
      className="group flex-none w-[260px] bg-white/8 hover:bg-white/14 border border-white/10 hover:border-primary/50 rounded-2xl p-4 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Badge + countdown */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
          isImminent ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-orange-400'
        }`}>
          <span className="material-symbols-outlined text-sm">bolt</span>
          {countdown}
        </span>
        {run.is_no_drop && (
          <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1">
            <span className="material-symbols-filled text-sm">favorite</span>
            No drop
          </span>
        )}
      </div>

      {/* Titolo */}
      <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors leading-snug line-clamp-2">
        {run.title}
      </p>

      {/* Dati */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-primary text-sm">place</span>
          {run.city}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-primary text-sm">schedule</span>
          {run.time.slice(0, 5)}
        </span>
        {run.distance_km && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-sm">route</span>
            {run.distance_km} km
          </span>
        )}
      </div>

      {/* Distanza dall'utente */}
      {run.distance_from_user !== undefined && (
        <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">my_location</span>
          a {run.distance_from_user < 1
            ? `${Math.round(run.distance_from_user * 1000)} m da te`
            : `${run.distance_from_user.toFixed(1)} km da te`}
        </span>
      )}

      {/* Organizzatore + livello */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Avatar name={run.organizer.full_name} src={run.organizer.avatar_url} size="sm" />
          <span className="text-xs text-gray-400 truncate max-w-[100px]">
            {run.organizer.full_name.split(' ')[0]}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {LEVEL_LABELS[run.level]}
        </span>
      </div>
    </Link>
  )
}
