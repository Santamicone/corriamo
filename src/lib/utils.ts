import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "d MMMM yyyy", { locale: it })
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM", { locale: it })
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
}

export const RECURRENCE_LABELS: Record<string, string> = {
  settimanale: 'Ogni settimana',
  bisettimanale: 'Ogni due settimane',
  mensile: 'Ogni mese',
}

export const DAY_LABELS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
