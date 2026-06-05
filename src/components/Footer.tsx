import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-base">directions_run</span>
              </div>
              <span className="text-base font-extrabold text-gray-900">Vieni a correre?</span>
            </div>
            <p className="text-sm text-gray-400">
              © {year} — Corri in compagnia, in sicurezza.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { href: '/bacheca',     label: 'Bacheca' },
              { href: '#',            label: 'Sicurezza' },
              { href: '#',            label: 'Privacy Policy' },
              { href: '#',            label: 'Termini di Servizio' },
              { href: '#',            label: 'Contatti' },
            ].map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
