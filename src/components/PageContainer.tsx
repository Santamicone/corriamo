import type { ReactNode } from 'react'

/**
 * Larghezze standard delle pagine (desktop). Un solo punto di verità: usare
 * sempre <PageContainer> invece di scrivere `max-w-* mx-auto px-...` a mano.
 *
 *  - wide    → liste, dashboard, mappe, landing (bacheca, gare, home)
 *  - content → dettagli, profili, pagine di testo (dettaglio corsa, profilo, termini)
 *  - form    → form e flussi di creazione (nuova corsa, modifica, impostazioni)
 *
 * La larghezza `wide` coincide con quella dell'header, così il contenuto è
 * sempre allineato alla barra di navigazione.
 */
export type PageWidth = 'wide' | 'content' | 'form'

const widthClasses: Record<PageWidth, string> = {
  wide: 'max-w-7xl',
  content: 'max-w-5xl',
  form: 'max-w-2xl',
}

type PageContainerProps = {
  width?: PageWidth
  /** Classi extra (es. spaziatura verticale: "py-8"). */
  className?: string
  children: ReactNode
}

export function PageContainer({ width = 'content', className = '', children }: PageContainerProps) {
  return (
    <div className={`${widthClasses[width]} w-full mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}
