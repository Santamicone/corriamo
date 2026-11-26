'use client'

import { useEffect, useRef, useState } from 'react'
import { proposalPlaceholder, type ProposalKind } from '@/lib/proposals'
import { cn } from '@/lib/utils'

/**
 * Immagine di una proposta: quella caricata dall'admin (SQL #56) o il segnaposto della tipologia.
 * Se quella caricata non si carica, ricade sul segnaposto. Decorativa: il testo accanto dice già tutto.
 */
export function ProposalImage({ kind, url, className }: { kind: ProposalKind; url?: string | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const ref = useRef<HTMLImageElement>(null)
  const src = url && url !== failedUrl ? url : proposalPlaceholder(kind)

  // L'errore può arrivare prima che React agganci onError (HTML reso dal server)
  useEffect(() => {
    const img = ref.current
    if (url && img && img.complete && img.naturalWidth === 0) setFailedUrl(url)
  }, [url])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      width={800}
      height={800}
      loading="lazy"
      decoding="async"
      onError={() => { if (url) setFailedUrl(url) }}
      className={cn('bg-orange-100 object-cover', className)}
    />
  )
}
