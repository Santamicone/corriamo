/**
 * Destinazione di ritorno dopo il login (?next=…).
 * Accetta solo percorsi interni: niente URL assoluti, niente `//host`
 * (open redirect) e niente caratteri di controllo.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/bacheca'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f]/.test(raw)) return fallback
  return raw
}
