import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parsa data e orario di una corsa trattandoli come ora italiana (Europe/Rome).
 * Necessario perché il server Vercel gira in UTC ma gli orari nel DB
 * sono inseriti dagli utenti in ora locale italiana (CET/CEST).
 */
export function parseRunDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min]  = timeStr.split(':').map(Number)

  // Crea un timestamp UTC con i valori numerici grezzi
  const naiveUtc = Date.UTC(y, m - 1, d, h, min)

  // Chiede a Intl che ora mostra Rome per quel timestamp UTC
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour12:   false,
    hour:     'numeric',
    minute:   'numeric',
  }).formatToParts(new Date(naiveUtc))

  const romeH   = parseInt(parts.find(p => p.type === 'hour')?.value   ?? String(h))
  const romeMin = parseInt(parts.find(p => p.type === 'minute')?.value ?? String(min))

  // Calcola la differenza e corregge il timestamp
  const diffMs = ((h - romeH) * 60 + (min - romeMin)) * 60_000
  return new Date(naiveUtc + diffMs)
}

/**
 * Data odierna (YYYY-MM-DD) in ora italiana (Europe/Rome).
 * Il server Vercel gira in UTC: tra mezzanotte e le 2 di notte italiane
 * `new Date().toISOString()` restituirebbe il giorno precedente.
 */
export function todayItaly(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/* ── Purple Screen — colori ritrovo ── */
const RITROVO_COLORS = [
  { bg: '#7C3AED', text: '#FFFFFF', name: 'Viola' },
  { bg: '#DC2626', text: '#FFFFFF', name: 'Rosso' },
  { bg: '#0891B2', text: '#FFFFFF', name: 'Azzurro' },
  { bg: '#16A34A', text: '#FFFFFF', name: 'Verde' },
  { bg: '#DB2777', text: '#FFFFFF', name: 'Fucsia' },
  { bg: '#EA580C', text: '#FFFFFF', name: 'Arancio' },
  { bg: '#2563EB', text: '#FFFFFF', name: 'Blu' },
  { bg: '#059669', text: '#FFFFFF', name: 'Smeraldo' },
  { bg: '#9333EA', text: '#FFFFFF', name: 'Indaco' },
  { bg: '#B45309', text: '#FFFFFF', name: 'Marrone' },
  { bg: '#0F766E', text: '#FFFFFF', name: 'Teal' },
  { bg: '#BE123C', text: '#FFFFFF', name: 'Cremisi' },
  { bg: '#1D4ED8', text: '#FFFFFF', name: 'Cobalto' },
  { bg: '#7E22CE', text: '#FFFFFF', name: 'Porpora' },
  { bg: '#065F46', text: '#FFFFFF', name: 'Foresta' },
  { bg: '#B91C1C', text: '#FFFFFF', name: 'Mattone' },
  { bg: '#0369A1', text: '#FFFFFF', name: 'Oceano' },
  { bg: '#6D28D9', text: '#FFFFFF', name: 'Ametista' },
] as const

export type RitrovoColor = typeof RITROVO_COLORS[number]

/** Restituisce il colore assegnato a una corsa (deterministico dall'ID) */
export function runRitrovoColor(runId: string): RitrovoColor {
  const hash = runId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return RITROVO_COLORS[hash % RITROVO_COLORS.length]
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEE d MMMM yyyy", { locale: it })
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "EEE d MMM", { locale: it })
}

export function formatPace(paceMin: number, paceMax?: number | null): string {
  const fmt = (v: number) => {
    const min = Math.floor(v)
    const sec = Math.round((v - min) * 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }
  if (paceMax) return `${fmt(paceMin)}–${fmt(paceMax)} min/km`
  return `${fmt(paceMin)} min/km`
}

export const LEVEL_LABELS: Record<string, string> = {
  tutti: 'Tutti i livelli',
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
  // Livelli profilo estesi
  amatore_gare: 'Amatore, ma faccio gare',
  atleta: 'Atleta agonista',
}

export const RECURRENCE_LABELS: Record<string, string> = {
  settimanale: 'Ogni settimana',
  bisettimanale: 'Ogni due settimane',
  mensile: 'Ogni mese',
}

export const DAY_LABELS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

/** Normalizza il ritmo target: se è un numero puro (es. "5" o "5.5") lo converte in "5:00 min/km" */
export function formatPaceTarget(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Se contiene già ":" o "/" o lettere, restituisci com'è
  if (/[:\/a-zA-Z]/.test(trimmed)) return trimmed
  // Se è un numero decimale tipo "5" o "5.5"
  const num = parseFloat(trimmed)
  if (!isNaN(num)) {
    const min = Math.floor(num)
    const sec = Math.round((num - min) * 60)
    return `${min}:${sec.toString().padStart(2, '0')} min/km`
  }
  return trimmed
}
