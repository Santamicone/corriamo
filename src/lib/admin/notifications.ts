/**
 * Notifiche email agli admin (SQL #52, Edge Function `notify-admins`).
 * Valori condivisi tra la pagina /admin/notifiche e la sua API.
 */

export const EVENT_TYPES = [
  { value: 'user_signup', label: 'Nuova registrazione', hint: 'Quando un utente si iscrive (anche con Apple, Google o Facebook).', icon: 'person_add' },
  { value: 'run_created', label: 'Nuova corsa', hint: 'Quando un utente crea una corsa. Una serie ricorrente conta come un solo avviso.', icon: 'directions_run' },
] as const

export const FREQUENCIES = [
  { value: 'immediate', label: 'Subito', hint: 'Un’email per ogni evento, entro pochi secondi' },
  { value: 'hourly', label: 'Riepilogo orario', hint: 'Al massimo un’email all’ora con tutto quello che è successo' },
  { value: 'daily', label: 'Riepilogo giornaliero', hint: 'Una sola email al giorno, all’ora scelta (ora italiana)' },
] as const

export type EventTypeValue = (typeof EVENT_TYPES)[number]['value']
export type FrequencyValue = (typeof FREQUENCIES)[number]['value']
