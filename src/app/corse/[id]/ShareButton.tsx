'use client'
import { useState, useRef, useEffect } from 'react'
import { LEVEL_LABELS } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  runId: string
  title: string
  date: string
  time: string
  location: string
  city: string
  distanceKm: number | null
  level: string
  isNoDrop: boolean
}

export function ShareButton({ runId, title, date, time, location, city, distanceKm, level, isNoDrop }: Props) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vieniacorrere.it'
  const runUrl  = `${siteUrl}/corse/${runId}?ref=share`

  const dateFormatted = (() => {
    try { return format(parseISO(date), "d MMMM", { locale: it }) }
    catch { return date }
  })()

  const waText = encodeURIComponent(
    `🏃 *${title}*\n` +
    `📅 ${dateFormatted} · ⏰ ${time.slice(0, 5)}\n` +
    `📍 ${location}, ${city}` +
    (distanceKm ? ` · 🏃 ${distanceKm} km` : '') + '\n' +
    `${LEVEL_LABELS[level] ?? level}` +
    (isNoDrop ? ' · No drop ❤️' : '') +
    `\n\nVuoi unirti? →\n${runUrl}`
  )

  const waUrl = `https://wa.me/?text=${waText}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(runUrl)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1800)
    } catch {}
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title, text: `${title} — Vieni a correre?`, url: runUrl })
      setOpen(false)
    } catch {}
  }

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">share</span>
        Condividi
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 overflow-hidden py-1">
          {/* Copia link */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className={`material-symbols-outlined text-lg ${copied ? 'text-green-600' : 'text-gray-400'}`}>
              {copied ? 'check_circle' : 'content_copy'}
            </span>
            {copied ? 'Copiato!' : 'Copia link'}
          </button>

          {/* WhatsApp */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="w-5 h-5 shrink-0">
              {/* WhatsApp icon SVG */}
              <svg viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.52 5.847L0 24l6.335-1.481A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.666-.498-5.2-1.37l-.372-.22-3.863.903.946-3.728-.24-.388A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </span>
            Condividi su WhatsApp
          </a>

          {/* Web Share API (solo mobile) */}
          {hasNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-lg text-gray-400">ios_share</span>
              Condividi…
            </button>
          )}

          <hr className="border-gray-100 my-1" />
          <div className="px-4 py-2">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Chi riceve il link vedrà una pagina dedicata con tutti i dettagli e la possibilità di iscriversi.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
