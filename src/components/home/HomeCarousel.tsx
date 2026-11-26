'use client'

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 5000
/** Dopo un tocco lo scorrimento automatico aspetta un po' prima di ripartire. */
const TOUCH_RESUME_MS = 8000

/**
 * Carosello a scorrimento nativo (si sfoglia anche col dito). Avanza da solo ogni 5 secondi, si ferma
 * con il mouse sopra, il tocco o il focus da tastiera, e non si muove da solo se il sistema chiede di
 * ridurre le animazioni. Le card arrivano già disegnate dal server come `children`.
 */
export function HomeCarousel({ children, slideClassName, label }: {
  children: ReactNode
  /** Larghezza di ogni card (quante se ne vedono insieme) */
  slideClassName: string
  label: string
}) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [stops, setStops] = useState<number[]>([0])
  const [current, setCurrent] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const touchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const slides = Children.toArray(children)

  // Punti di arresto: l'inizio di ogni card, senza doppioni in fondo alla corsa
  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    const items = Array.from(track.children) as HTMLElement[]
    const first = items[0]?.offsetLeft ?? 0
    const next: number[] = []
    for (const item of items) {
      const left = Math.min(item.offsetLeft - first, Math.max(max, 0))
      if (next.length === 0 || left - next[next.length - 1] > 4) next.push(left)
    }
    setStops(next.length ? next : [0])
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(measure) // chiamato anche alla prima osservazione
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure, slides.length])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => () => clearTimeout(touchTimer.current), [])

  const goTo = useCallback((index: number) => {
    trackRef.current?.scrollTo({ left: stops[index] ?? 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [stops, reducedMotion])

  const onScroll = () => {
    const left = trackRef.current?.scrollLeft ?? 0
    let best = 0
    stops.forEach((stop, i) => { if (Math.abs(stop - left) < Math.abs(stops[best] - left)) best = i })
    setCurrent(best)
  }

  const paused = hovered || focused || touched || reducedMotion
  useEffect(() => {
    if (paused || stops.length < 2) return
    const timer = setTimeout(() => goTo((current + 1) % stops.length), AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [paused, current, stops, goTo])

  const onTouchStart = () => {
    clearTimeout(touchTimer.current)
    setTouched(true)
  }
  const onTouchEnd = () => {
    clearTimeout(touchTimer.current)
    touchTimer.current = setTimeout(() => setTouched(false), TOUCH_RESUME_MS)
  }

  return (
    <div
      role="group"
      aria-roledescription="carosello"
      aria-label={label}
      // pointerType: sui telefoni il tocco genera anche un "mouse enter" che non verrebbe mai chiuso
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false) }}
      onFocus={(e) => { if (e.target.matches(':focus-visible')) setFocused(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="min-w-0"
    >
      <ul
        ref={trackRef}
        onScroll={onScroll}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <li key={i} className={cn('shrink-0 snap-start [&>*]:h-full', slideClassName)}>{slide}</li>
        ))}
      </ul>

      {stops.length > 1 && (
        <div className="mt-2 flex justify-center">
          {stops.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Vai alla posizione ${i + 1} di ${stops.length}`}
              aria-current={i === current}
              className="flex h-6 min-w-5 items-center justify-center px-1"
            >
              <span className={cn('block h-2 rounded-full transition-all', i === current ? 'w-5 bg-primary' : 'w-2 bg-gray-300')} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
