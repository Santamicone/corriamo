import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { MarkNotificationsRead } from './MarkNotificationsRead'
import type { Notification, NotificationType } from '@/lib/types'

/* ── Config visiva per tipo notifica ── */
const TYPE_CONFIG: Record<NotificationType, {
  icon: string; iconClass: string; bgClass: string; href: (n: Notification) => string
}> = {
  nuova_richiesta:     { icon: 'person_add',    iconClass: 'text-primary',   bgClass: 'bg-orange-50',  href: n => `/corse/${n.run_id}` },
  richiesta_approvata: { icon: 'check_circle',  iconClass: 'text-green-600', bgClass: 'bg-green-50',   href: n => `/corse/${n.run_id}` },
  richiesta_rifiutata: { icon: 'cancel',        iconClass: 'text-red-500',   bgClass: 'bg-red-50',     href: n => `/corse/${n.run_id}` },
  nuovo_messaggio:     { icon: 'mail',          iconClass: 'text-blue-500',  bgClass: 'bg-blue-50',    href: n => n.run_id && n.actor_id ? `/messaggi/${n.run_id}/${n.actor_id}` : '/messaggi' },
  promemoria_corsa:    { icon: 'alarm',         iconClass: 'text-primary',   bgClass: 'bg-orange-50',  href: n => `/corse/${n.run_id}` },
  corsa_annullata:     { icon: 'event_busy',    iconClass: 'text-red-500',   bgClass: 'bg-red-50',     href: n => `/corse/${n.run_id}` },
  corsa_modificata:    { icon: 'edit_calendar', iconClass: 'text-blue-500',  bgClass: 'bg-blue-50',    href: n => `/corse/${n.run_id}` },
}

export default async function NotifichePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*)')
    .eq('user_id', user.id)
    .lte('show_after', now)
    .order('created_at', { ascending: false })
    .limit(60)

  const notifications = (data ?? []) as unknown as Notification[]
  const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
  const unreadCount = unreadIds.length

  const grouped = groupByDate(notifications)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Marca come lette in background */}
      {unreadIds.length > 0 && <MarkNotificationsRead ids={unreadIds} />}

      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-gray-900">Notifiche</h1>
                {unreadCount > 0 && (
                  <span className="bg-primary text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-500 mt-1">Aggiornamenti su corse, messaggi e iscrizioni.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {notifications.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">notifications</span>
              <p className="text-base font-bold text-gray-700">Nessuna notifica ancora</p>
              <p className="text-sm text-gray-400 mt-1">
                Le notifiche su corse, messaggi e iscrizioni appariranno qui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(grouped).map(([dateLabel, items]) => (
                <section key={dateLabel}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
                    {dateLabel}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {items.map(n => (
                      <NotificationRow key={n.id} notification={n} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

/* ── Singola riga notifica ── */
function NotificationRow({ notification: n }: { notification: Notification }) {
  const cfg  = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.nuova_richiesta
  const href = cfg.href(n)

  return (
    <Link
      href={href}
      className={`flex items-start gap-4 px-4 py-4 rounded-2xl border transition-all hover:shadow-sm ${
        n.read
          ? 'bg-white border-gray-100 opacity-75 hover:opacity-100'
          : `${cfg.bgClass} border-transparent ring-1 ring-inset ring-gray-200`
      }`}
    >
      {/* Icon / Avatar */}
      <div className="relative shrink-0">
        {n.actor ? (
          <Avatar name={n.actor.full_name} src={n.actor.avatar_url} size="sm" />
        ) : (
          <div className={`w-8 h-8 rounded-full ${cfg.bgClass} flex items-center justify-center`}>
            <span className={`material-symbols-filled text-base ${cfg.iconClass}`}>{cfg.icon}</span>
          </div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${cfg.bgClass} border border-white`}>
          <span className={`material-symbols-filled text-[10px] ${cfg.iconClass}`}>{cfg.icon}</span>
        </span>
      </div>

      {/* Testo */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${n.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
        )}
        <time className="text-[11px] text-gray-400 mt-1 block">
          {format(parseISO(n.created_at), "d MMM 'alle' HH:mm", { locale: it })}
        </time>
      </div>

      {/* Dot non letto */}
      {!n.read && (
        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
      )}
    </Link>
  )
}

/* ── Raggruppa per oggi / ieri / data ── */
function groupByDate(items: Notification[]): Record<string, Notification[]> {
  const now   = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const yesterday = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd')

  return items.reduce<Record<string, Notification[]>>((acc, n) => {
    const d    = n.created_at.split('T')[0]
    const label = d === today ? 'Oggi' : d === yesterday ? 'Ieri' : format(parseISO(d), 'd MMMM', { locale: it })
    if (!acc[label]) acc[label] = []
    acc[label].push(n)
    return acc
  }, {})
}
