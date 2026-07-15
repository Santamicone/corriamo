import type { ReactNode } from 'react'

export type ImpactStat = {
  value: number
  /** Etichetta al singolare (usata quando value === 1) */
  label: string
  /** Etichetta al plurale (default: uguale a `label`) */
  labelPlural?: string
  icon: string
}

/**
 * Card read-only che racconta l'IMPATTO SOCIALE (persone coinvolte, tornate,
 * alla prima uscita) a partire da segnali verificati — non dal chilometraggio.
 * Vedi docs/GAMIFICATION.md §7. Usata sia sulla pagina crew sia sul profilo.
 *
 * Non renderizza nulla se tutti i valori sono 0 (empty-state coerente con le
 * altre sezioni: la card compare solo quando c'è qualcosa da raccontare).
 */
export function ImpactCard({
  title,
  subtitle,
  stats,
  footer,
}: {
  title: string
  subtitle?: string
  stats: ImpactStat[]
  footer?: ReactNode
}) {
  const visible = stats.filter((s) => s.value > 0)
  if (visible.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-base">
          volunteer_activism
        </span>
        {title}
      </h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {visible.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-2xl py-3 px-2 text-center"
          >
            <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">
              {s.icon}
            </span>
            <span className="text-xl font-extrabold text-gray-900 leading-none">{s.value}</span>
            <span className="text-[11px] text-gray-400 leading-tight">
              {s.value === 1 ? s.label : s.labelPlural ?? s.label}
            </span>
          </div>
        ))}
      </div>

      {footer}
    </div>
  )
}
