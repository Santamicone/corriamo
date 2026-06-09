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

const navLinks = [
  { href: '/bacheca',        label: 'Bacheca',                icon: 'directions_run', help: false },
  { href: '/nuova-corsa',    label: 'Proponi una corsa',      icon: 'add_circle',     help: false },
  { href: '/gare',           label: 'Cerca compagni di gara', icon: 'emoji_events',   help: false },
  { href: '/come-funziona',  label: 'Come funziona',          icon: 'help_outline',   help: true  },
]

export function Header() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [mobileOpen,  setMobileOpen]  = useState(false)  // hamburger mobile
  const [userOpen,    setUserOpen]    = useState(false)  // dropdown avatar desktop
  const [loggingOut,  setLoggingOut]  = useState(false)  // feedback logout

  const unreadMessages      = useUnreadMessages(profile?.id ?? null)
  const unreadNotifications = useUnreadNotifications(profile?.id ?? null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    })
  }, [pathname])

  // Chiudi menu al cambio pagina
  useEffect(() => { setMobileOpen(false); setUserOpen(false) }, [pathname])

  const handleLogout = async () => {
    setMobileOpen(false)
    setUserOpen(false)
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <>
      {/* ── Overlay logout ── */}
      {loggingOut && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-filled text-green-500" style={{ fontSize: 72 }}>check_circle</span>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">Arrivederci!</p>
            <p className="text-sm text-gray-400 mt-1">Hai effettuato il logout con successo.</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="Vieni a correre?" className="w-8 h-8 rounded-xl object-contain" />
            <span className="text-lg font-extrabold text-gray-900 tracking-tight hidden sm:block">
              Vieni a correre?
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  link.help
                    ? isActive(link.href)
                      ? 'bg-gray-100 text-gray-700 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    : isActive(link.href)
                      ? 'bg-orange-50 text-primary font-semibold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}>
                {link.help && (
                  <span className="material-symbols-outlined text-base">{link.icon}</span>
                )}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Destra */}
          <div className="flex items-center gap-1.5">

            {profile ? (
              <>
                {/* Bell notifiche */}
                <Link href="/notifiche"
                  className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
                  aria-label={`Notifiche${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`}>
                  <span className="material-symbols-outlined text-xl">
                    {unreadNotifications > 0 ? 'notifications_active' : 'notifications'}
                  </span>
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* Avatar — su desktop apre dropdown, su mobile va al profilo */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setUserOpen(!userOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                      {(unreadMessages + unreadNotifications) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                      {profile.full_name.split(' ')[0]}
                    </span>
                    <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
                  </button>

                  {/* Dropdown desktop */}
                  {userOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden py-1">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name}</p>
                          {profile.city && <p className="text-xs text-gray-400">{profile.city}</p>}
                        </div>
                        {[
                          { href: `/profilo/${profile.id}`, icon: 'person',    label: 'Il mio profilo' },
                          { href: '/area-personale',        icon: 'dashboard', label: 'Area personale' },
                        ].map(item => (
                          <Link key={item.href} href={item.href} onClick={() => setUserOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <span className="material-symbols-outlined text-base text-gray-400">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                        <Link href="/messaggi" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className="material-symbols-outlined text-base text-gray-400">mail</span>
                          Messaggi
                          {unreadMessages > 0 && (
                            <span className="ml-auto bg-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
                          )}
                        </Link>
                        <Link href="/notifiche" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <span className="material-symbols-outlined text-base text-gray-400">notifications</span>
                          Notifiche
                          {unreadNotifications > 0 && (
                            <span className="ml-auto bg-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">{unreadNotifications}</span>
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

                {/* Avatar mobile — link diretto al profilo, nessun dropdown */}
                <Link href={`/profilo/${profile.id}`} className="md:hidden relative">
                  <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                  {(unreadMessages + unreadNotifications) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                  )}
                </Link>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login"
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors">
                  Accedi
                </Link>
                <Link href="/registrati"
                  className="inline-flex items-center gap-1 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                  Registrati
                </Link>
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden relative p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileOpen ? 'close' : 'menu'}
              </span>
              {/* Badge punto rosso — solo quando il menu è chiuso e ci sono notifiche/messaggi non letti */}
              {!mobileOpen && (unreadMessages + unreadNotifications) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Menu mobile — fixed overlay full-height ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />

          {/* Pannello */}
          <div className="fixed top-16 left-0 right-0 bottom-0 z-50 bg-white overflow-y-auto flex flex-col">

            {/* Navigazione */}
            <div className="px-4 pt-4 pb-2 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1">Naviga</p>
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors',
                    link.help
                      ? isActive(link.href)
                        ? 'bg-gray-100 text-gray-700'
                        : 'text-gray-500 hover:bg-gray-50'
                      : isActive(link.href)
                        ? 'bg-orange-50 text-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                  )}>
                  <span className={cn(
                    'material-symbols-outlined text-base',
                    link.help ? 'text-gray-400' : 'text-gray-400'
                  )}>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-gray-100 mx-4" />

            {/* Account */}
            <div className="px-4 pt-3 pb-6 flex flex-col gap-1">
              {profile ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1">Account</p>
                  <Link href={`/profilo/${profile.id}`} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                    <span>{profile.full_name.split(' ')[0]}</span>
                  </Link>
                  <Link href="/area-personale" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-base text-gray-400">dashboard</span>
                    Area personale
                  </Link>
                  <Link href="/messaggi" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-base text-gray-400">mail</span>
                    Messaggi
                    {unreadMessages > 0 && (
                      <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadMessages}</span>
                    )}
                  </Link>
                  <Link href="/notifiche" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-base text-gray-400">
                      {unreadNotifications > 0 ? 'notifications_active' : 'notifications'}
                    </span>
                    Notifiche
                    {unreadNotifications > 0 && (
                      <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left">
                    <span className="material-symbols-outlined text-base">logout</span>
                    Esci
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1">Account</p>
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-base text-gray-400">login</span>
                    Accedi
                  </Link>
                  <Link href="/registrati" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 mx-4 mt-2 bg-primary text-white text-sm font-semibold px-4 py-3 rounded-2xl hover:bg-primary-hover transition-colors">
                    Registrati gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
