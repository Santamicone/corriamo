'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'
import type { Profile } from '@/lib/types'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    })
  }, [pathname])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/bacheca', label: 'Bacheca' },
    { href: '/nuova-corsa', label: 'Proponi una corsa' },
    { href: '/nuova-serie', label: 'Proponi una serie' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 md:px-12 h-16 flex items-center justify-between gap-4">
        <Link href="/bacheca" className="text-2xl font-extrabold text-primary tracking-tight">
          Corriamo?
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-surface-container transition-colors"
              >
                <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                <span className="hidden md:block text-sm font-medium text-on-surface max-w-[120px] truncate">
                  {profile.full_name}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">expand_more</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl z-50 overflow-hidden">
                    <Link
                      href={`/profilo/${profile.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-container transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">person</span>
                      Il mio profilo
                    </Link>
                    <Link
                      href="/area-personale"
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-container transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">dashboard</span>
                      Area personale
                    </Link>
                    <hr className="border-outline-variant" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Esci
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-on-surface-variant hover:text-on-surface px-3 py-2">
                Accedi
              </Link>
              <Link href="/registrati" className="text-sm font-semibold bg-primary text-on-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                Registrati
              </Link>
            </div>
          )}

          <button
            className="md:hidden p-2 rounded-lg hover:bg-surface-container transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface pb-4">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-6 py-3 text-sm font-medium text-on-surface hover:bg-surface-container"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {profile && (
            <>
              <Link href="/area-personale" className="block px-6 py-3 text-sm font-medium text-on-surface hover:bg-surface-container" onClick={() => setMenuOpen(false)}>
                Area personale
              </Link>
              <button onClick={handleLogout} className="block w-full text-left px-6 py-3 text-sm font-medium text-error hover:bg-error-container">
                Esci
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
