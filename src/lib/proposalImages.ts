/** Immagini caricate per le proposte (SQL #56): bucket pubblico, scrittura solo dalle API admin. */
export const PROPOSAL_BUCKET = 'proposal-images'
/** Il modulo admin comprime sotto questa soglia; il bucket accetta fino a 1 MB. */
export const PROPOSAL_IMAGE_TARGET_BYTES = 150 * 1024
export const PROPOSAL_IMAGE_MAX_BYTES = 1024 * 1024
export const PROPOSAL_IMAGE_SIZE = 800

export function proposalImageUrlPrefix(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${PROPOSAL_BUCKET}/`
}
