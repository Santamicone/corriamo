'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'
import type { Profile } from '@/lib/types'

/* ── Hook: messaggi non letti ── */
function useUnreadMessages(userId: string | null) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const fetch = async () => {
      const { count: c } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null)
      setCount(c ?? 0)
    }
    fetch()
    const ch = supabase
      .channel('messages-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])
  return count
}

/* ── Hook: notifiche non lette ── */
function useUnreadNotifications(userId: string | null) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const now = new Date().toISOString()
    const fetch = async () => {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .lte('show_after', new Date().toISOString())
      setCount(c ?? 0)
    }
    fetch()
    const ch = supabase
      .channel('notifications-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])
  return count
}

export function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const unreadMessages     = useUnreadMessages(profile?.id ?? null)
  const unreadNotifications = useUnreadNotifications(profile?.id ?? null)
  const totalBadge = unreadMessages + unreadNotifications

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    })
  }, [pathname])

  const handleLogout = async () => {
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/bacheca',     label: 'Bacheca' },
    { href: '/nuova-corsa', label: 'Proponi una corsa' },
    { href: '/nuova-serie', label: 'Proponi una serie' },
  ]

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-lg">directions_run</span>
          </div>
          <span className="text-lg font-extrabold text-gray-900 tracking-tight">
            Vieni a correre?
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                isActive(link.href)
                  ? 'bg-orange-50 text-primary font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {profile && (
            /* Bell icon notifiche */
            <Link
              href="/notifiche"
              className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
              aria-label={`Notifiche${unreadNotifications > 0 ? ` (${unreadNotifications} non lette)` : ''}`}
            >
              <span className="material-symbols-outlined text-xl">
                {unreadNotifications > 0 ? 'notifications_active' : 'notifications'}
              </span>
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                  {totalBadge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                  )}
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                  {profile.full_name.split(' ')[0]}
                </span>
                <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name}</p>
                      {profile.city && <p className="text-xs text-gray-400">{profile.city}</p>}
                    </div>
                    <Link href={`/profilo/${profile.id}`} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-gray-400">person</span>
                      Il mio profilo
                    </Link>
                    <Link href="/area-personale" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-gray-400">dashboard</span>
                      Area personale
                    </Link>
                    <Link href="/messaggi" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-gray-400">mail</span>
                      Messaggi
                      {unreadMessages > 0 && (
                        <span className="ml-auto bg-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadMessages}
                        </span>
                      )}
                    </Link>
                    <Link href="/notifiche" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-gray-400">notifications</span>
                      Notifiche
                      {unreadNotifications > 0 && (
                        <span className="ml-auto bg-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <span className="material-symbols-outlined text-base">logout</span>
                      Esci
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"
                className="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors">
                Accedi
              </Link>
              <Link href="/registrati"
                className="inline-flex items-center gap-1 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                Registrati
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md py-2 px-4 flex flex-col gap-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive(link.href) ? 'bg-orange-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
              )}
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {!profile ? (
            <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
              Accedi
            </Link>
          ) : (
            <>
              <Link href="/area-personale" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Area personale
              </Link>
              <Link href="/messaggi" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Messaggi
                {unreadMessages > 0 && <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadMessages}</span>}
              </Link>
              <Link href="/notifiche" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Notifiche
                {unreadNotifications > 0 && <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadNotifications}</span>}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left">
                Esci
              </button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
