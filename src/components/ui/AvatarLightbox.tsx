'use client'
import { useState, useEffect, useCallback } from 'react'
import { Avatar } from './Avatar'

interface AvatarLightboxProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarLightbox({ name, src, size = 'xl', className }: AvatarLightboxProps) {
  const [open, setOpen] = useState(false)

  // Solo le URL reali aprono il lightbox (non preset né iniziali)
  const isPhoto = !!src && !src.startsWith('preset:')

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    // Blocca lo scroll del body
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, close])

  return (
    <>
      {/* Avatar cliccabile */}
      <button
        type="button"
        onClick={() => isPhoto && setOpen(true)}
        className={isPhoto ? 'cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full' : 'cursor-default'}
        aria-label={isPhoto ? `Ingrandisci foto di ${name}` : undefined}
        disabled={!isPhoto}
      >
        <Avatar name={name} src={src} size={size} className={className} />
      </button>

      {/* Lightbox */}
      {open && isPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto di ${name}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={close}
        >
          {/* Pulsante chiudi */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Chiudi"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          {/* Immagine ingrandita */}
          <div
            className="relative max-w-sm w-full animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={src!}
              alt={`Foto profilo di ${name}`}
              className="w-full rounded-3xl shadow-2xl object-cover aspect-square"
            />
            <p className="text-center text-white/70 text-sm mt-3 font-medium">{name}</p>
          </div>
        </div>
      )}
    </>
  )
}
