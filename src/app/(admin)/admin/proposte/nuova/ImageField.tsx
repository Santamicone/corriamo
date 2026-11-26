'use client'

import { useEffect, useRef, useState } from 'react'
import { proposalPlaceholder, type ProposalKind } from '@/lib/proposals'
import { PROPOSAL_IMAGE_SIZE, PROPOSAL_IMAGE_TARGET_BYTES } from '@/lib/proposalImages'

/** Ritaglia al centro un quadrato, lo porta a 800×800 e lo comprime in JPEG sotto i 150 KB. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = PROPOSAL_IMAGE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#fff' // le trasparenze di un PNG diventerebbero nere in JPEG
  ctx.fillRect(0, 0, PROPOSAL_IMAGE_SIZE, PROPOSAL_IMAGE_SIZE)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
    0, 0, PROPOSAL_IMAGE_SIZE, PROPOSAL_IMAGE_SIZE)
  bitmap.close()

  let blob: Blob | null = null
  for (let quality = 0.85; quality >= 0.45; quality -= 0.1) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= PROPOSAL_IMAGE_TARGET_BYTES) break
  }
  if (!blob) throw new Error('toBlob')
  return blob
}

/** Campo immagine del modulo proposta. Il file viene caricato solo quando si pubblica. */
export function ImageField({ kind, value, onChange }: {
  kind: ProposalKind
  value: Blob | null
  onChange: (blob: Blob | null) => void
}) {
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = previewRef.current
    if (!img) return
    if (!value) { img.src = proposalPlaceholder(kind); return }
    const url = URL.createObjectURL(value)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [value, kind])

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      onChange(await toSquareJpeg(file))
    } catch {
      onChange(null)
      setError('Non riesco a leggere questa immagine: prova con un JPEG, PNG o WebP.')
    }
  }

  const remove = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={previewRef} src={proposalPlaceholder(kind)} alt="Anteprima dell'immagine della proposta"
        className="h-28 w-28 shrink-0 rounded-2xl border border-gray-100 bg-gray-50 object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">
          {value
            ? `Immagine tua, ritagliata al centro: ${Math.round(value.size / 1024)} KB.`
            : 'Senza caricare nulla si usa l’immagine della tipologia.'}
        </p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick}
          aria-label="Carica un'immagine per la proposta"
          className="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700" />
        {value && (
          <button type="button" onClick={remove} className="mt-2 text-sm font-semibold text-gray-500 hover:text-red-600">
            Togli e usa quella della tipologia
          </button>
        )}
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
