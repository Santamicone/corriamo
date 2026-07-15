/**
 * Chiave localStorage per l'ultimo messaggio "visto" di una bacheca.
 * Tracciamento per-dispositivo (nessun DB): condivisa tra il pallino di
 * notifica (BoardUnreadDot) e la bacheca stessa (BoardWindow), che avanza
 * il valore man mano che l'utente legge.
 */
export function boardSeenKey(scope: 'crew' | 'run', scopeId: string): string {
  return `vac:board-seen:${scope}:${scopeId}`
}
