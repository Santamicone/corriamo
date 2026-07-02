import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/utenti', label: 'Utenti', icon: 'group' },
  { href: '/admin/gare', label: 'Gare', icon: 'flag' },
  { href: '/admin/contenuti', label: 'Contenuti', icon: 'inventory_2' },
  { href: '/admin/segnalazioni', label: 'Segnalazioni', icon: 'report' },
  { href: '/admin/broadcast', label: 'Broadcast', icon: 'campaign' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate base: utente loggato + is_admin. L'AAL2 è verificato dalle singole
  // pagine operative (requireAal2), così le pagine /admin/mfa/* restano raggiungibili.
  await getAdminContext()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold">
            <span className="material-symbols-outlined text-amber-400">shield_person</span>
            Admin · Vieni a correre?
          </div>
          <Link href="/bacheca" className="text-sm text-gray-300 hover:text-white transition-colors">
            ← Torna all&apos;app
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        <nav className="md:w-52 flex-shrink-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {NAV.map(item => (
              <li key={item.href}>
                <Link href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-white hover:text-gray-900 transition-colors whitespace-nowrap">
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
