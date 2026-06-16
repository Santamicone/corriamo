'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const LS_DISMISSED = 'pwa_install_dismissed_ts'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000 // 14 giorni prima di riproporlo

// Evento non standard, non tipizzato in lib.dom
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function snoozed(): boolean {
  const ts = parseInt(localStorage.getItem(LS_DISMISSED) ?? '0', 10)
  return ts > 0 && Date.now() - ts < SNOOZE_MS
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [iosMode, setIosMode] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || snoozed()) return

    // Android/Chrome: aspetta l'evento del browser
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      if (snoozed()) return
      setDeferred(e as BeforeInstallPromptEvent)
      setIosMode(false)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS Safari: nessuna API → mostra istruzioni manuali dopo un attimo
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setIosMode(true)
        setShow(true)
      }, 2500)
    }

    // Se l'app viene installata, nascondi tutto
    const onInstalled = () => {
      setShow(false)
      localStorage.setItem(LS_DISMISSED, Date.now().toString())
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(LS_DISMISSED, Date.now().toString())
    setShow(false)
  }

  async function handleInstall() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    } else {
      dismiss()
    }
    setDeferred(null)
  }

  // Escluso dalle pagine corsa: lì c'è già una barra sticky "Partecipa" su mobile
  if (pathname?.startsWith('/corse/')) return null

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-outline-variant bg-surface-bright px-4 py-3 shadow-lg">
        <span className="material-symbols-outlined shrink-0 text-2xl text-primary">
          install_mobile
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface">Installa l&apos;app</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {iosMode ? (
              <>
                Tocca <span className="font-semibold">Condividi</span> e poi{' '}
                <span className="font-semibold">&laquo;Aggiungi alla schermata Home&raquo;</span>
              </>
            ) : (
              'Aggiungila alla home per aprirla come una vera app'
            )}
          </p>
        </div>
        {!iosMode && (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 active:scale-95"
          >
            Installa
          </button>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label="Chiudi"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  )
}
