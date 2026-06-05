import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function MessaggiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Recupera tutti i messaggi che mi riguardano, con profili e run
  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(*), recipient:profiles!messages_recipient_id_fkey(*), run:runs(id, title, date, city)')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Raggruppa per (run_id, other_user_id) → thread
  type ThreadKey = string
  const threadMap = new Map<ThreadKey, {
    runId: string | null
    runTitle: string
    runDate: string
    runCity: string
    otherUser: { id: string; full_name: string; avatar_url: string | null }
    lastBody: string
    lastDate: string
    unread: number
  }>()

  for (const msg of messages ?? []) {
    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
    const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender
    const key: ThreadKey = `${msg.run_id ?? 'null'}__${otherId}`

    if (!threadMap.has(key)) {
      threadMap.set(key, {
        runId: msg.run_id,
        runTitle: (msg.run as { title: string } | null)?.title ?? 'Conversazione',
        runDate:  (msg.run as { date: string } | null)?.date ?? '',
        runCity:  (msg.run as { city: string } | null)?.city ?? '',
        otherUser: { id: otherId, full_name: otherUser?.full_name ?? '?', avatar_url: otherUser?.avatar_url ?? null },
        lastBody: msg.body,
        lastDate: msg.created_at,
        unread: 0,
      })
    }

    // Conta non letti ricevuti
    if (msg.recipient_id === user.id && !msg.read_at) {
      const thread = threadMap.get(key)!
      thread.unread++
    }
  }

  const threads = Array.from(threadMap.values())
  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-900">Messaggi</h1>
              {totalUnread > 0 && (
                <span className="bg-primary text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">Le tue conversazioni con altri runner.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {threads.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">mail</span>
              <p className="text-base font-bold text-gray-700">Nessun messaggio ancora</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                Quando scrivi a un organizzatore o qualcuno ti scrive, le conversazioni appariranno qui.
              </p>
              <Link href="/bacheca"
                className="inline-flex items-center gap-2 mt-5 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors">
                <span className="material-symbols-outlined text-base">search</span>
                Trova una corsa
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {threads.map(thread => {
                const href = `/messaggi/${thread.runId ?? 'direct'}/${thread.otherUser.id}`
                const isUnread = thread.unread > 0
                return (
                  <Link key={`${thread.runId}-${thread.otherUser.id}`} href={href}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm ${isUnread ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
                    <Avatar name={thread.otherUser.full_name} src={thread.otherUser.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm truncate ${isUnread ? 'font-extrabold text-gray-900' : 'font-semibold text-gray-800'}`}>
                          {thread.otherUser.full_name}
                        </p>
                        <time className="text-xs text-gray-400 shrink-0">
                          {thread.lastDate ? formatDate(thread.lastDate.split('T')[0]) : ''}
                        </time>
                      </div>
                      {thread.runId && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-sm">directions_run</span>
                          {thread.runTitle}
                          {thread.runCity && <span className="text-gray-400">· {thread.runCity}</span>}
                        </p>
                      )}
                      <p className={`text-sm mt-0.5 truncate ${isUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                        {thread.lastBody}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
