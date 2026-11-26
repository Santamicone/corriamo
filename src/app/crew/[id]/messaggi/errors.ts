/** Messaggi leggibili per gli errori delle RPC dei messaggi privati della crew (SQL #62). */
const MESSAGES: Record<string, string> = {
  not_authenticated: 'Devi accedere per scrivere.',
  user_suspended: 'Il tuo account è sospeso.',
  forbidden: 'Non puoi scrivere a questa persona.',
  empty_message: 'Scrivi un messaggio o allega un file.',
  message_too_long: 'Il messaggio è troppo lungo (massimo 2000 caratteri).',
  no_recipients: 'Scegli almeno un destinatario.',
  too_many_recipients: 'Puoi scrivere al massimo a 50 persone per volta.',
  invalid_recipient: 'Uno dei destinatari non fa più parte della crew.',
  rate_limited: 'Hai inviato troppi messaggi: riprova tra un po’.',
  invalid_attachment: 'Allegato non valido.',
  batch_conflict: 'Invio non riuscito, riprova.',
  blocked: 'Non puoi scrivere a questa persona.',
  message_not_found: 'Messaggio non trovato.',
}

export function messageError(e: unknown): string {
  const text = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : ''
  const code = Object.keys(MESSAGES).find((c) => text.includes(c))
  return code ? MESSAGES[code] : 'Qualcosa non ha funzionato. Riprova.'
}

export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
