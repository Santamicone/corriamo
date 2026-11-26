import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { PROPOSAL_BUCKET, PROPOSAL_IMAGE_MAX_BYTES } from '@/lib/proposalImages'

export const runtime = 'nodejs'

/**
 * Carica l'immagine di una proposta (SQL #56) e ne restituisce l'indirizzo pubblico. Stesso livello
 * delle altre API delle proposte (AAL1 + service-role): il bucket non ha policy di scrittura.
 * Il modulo invia già un JPEG quadrato; qui si controlla che sia davvero un JPEG e non troppo grande.
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi(false)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const invalid = (error: string) => NextResponse.json({ error }, { status: 400 })
  if (!(file instanceof File)) return invalid('Nessuna immagine ricevuta')
  if (file.size > PROPOSAL_IMAGE_MAX_BYTES) return invalid('Immagine troppo grande (massimo 1 MB)')

  const bytes = new Uint8Array(await file.arrayBuffer())
  // Firma JPEG: non ci si fida del tipo dichiarato dal browser
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return invalid('Formato non valido')

  const svc = createServiceRoleClient()
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await svc.storage.from(PROPOSAL_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) return NextResponse.json({ error: `Caricamento non riuscito: ${error.message}` }, { status: 500 })

  return NextResponse.json({ url: svc.storage.from(PROPOSAL_BUCKET).getPublicUrl(path).data.publicUrl })
}
