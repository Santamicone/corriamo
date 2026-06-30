import Link from 'next/link'

interface ToolShellProps {
  title: string
  subtitle: string
  icon: string
  /** Breve spiegazione di come si usa il tool, mostrata sopra al contenuto. */
  howTo?: React.ReactNode
  /** Testo del disclaimer in fondo. Se omesso, usa quello generico. */
  disclaimer?: React.ReactNode
  children: React.ReactNode
}

const DEFAULT_DISCLAIMER = (
  <>
    I consigli sono <strong>indicativi</strong> e a scopo informativo. La risposta reale
    all'allenamento dipende da preparazione, fondo, clima e percorso. Questo strumento non è
    un consiglio medico né sostituisce un allenatore.
  </>
)

/** Guscio comune dei tool: breadcrumb, intestazione, contenuto, disclaimer. */
export function ToolShell({ title, subtitle, icon, howTo, disclaimer, children }: ToolShellProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-6">
        <Link href="/tools" className="hover:text-primary transition-colors">
          Strumenti
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-gray-500">{title}</span>
      </nav>

      {/* Intestazione */}
      <div className="flex items-start gap-4 mb-8">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-orange-50 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>

      {/* Come si usa */}
      {howTo && (
        <div className="mb-8 rounded-2xl bg-orange-50/60 border border-orange-100 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-2">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            Come si usa
          </div>
          <div className="text-sm text-gray-600 leading-relaxed">{howTo}</div>
        </div>
      )}

      {children}

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-6">
        {disclaimer ?? DEFAULT_DISCLAIMER}
      </p>
    </div>
  )
}
