import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import { ReplyForm } from './ReplyForm'
import { MarkReadTrigger } from './MarkReadTrigger'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default async function ThreadPage({ params }: { params: Promise<{ runId: string; otherId: string }> }) {
  const { runId, otherId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carica profilo dell'altro utente
  const { data: otherProfile } = await supabase
    .from('profiles').select('*').eq('id', otherId).single()
  if (!otherProfile) notFound()

  // Carica la corsa di contesto (se esiste)
  const { data: run } = runId !== 'direct'
    ? await supabase.from('runs').select('id, title, date, city').eq('id', runId).single()
    : { data: null }

  // Carica tutti i messaggi del thread
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
    )
    .eq('run_id', runId !== 'direct' ? runId : null as unknown as string)
    .order('created_at', { ascending: true })

  // IDs dei messaggi non letti da marcare
  const unreadIds = (messages ?? [])
    .filter(m => m.recipient_id === user.id && !m.read_at)
    .map(m => m.id)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Marca come letti lato client */}
      {unreadIds.length > 0 && <MarkReadTrigger messageIds={unreadIds} />}

      <main className="flex-1 flex flex-col">
        {/* Thread header */}
        <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
          <PageContainer width="form" className="py-4 flex items-center gap-3">
            <Link href="/messaggi" className="text-gray-400 hover:text-gray-700 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <Avatar name={otherProfile.full_name} src={otherProfile.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <Link href={`/profilo/${otherId}`}
                className="text-sm font-bold text-gray-900 hover:text-primary transition-colors truncate block">
                {otherProfile.full_name}
              </Link>
              {run && (
                <Link href={`/corse/${run.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5 truncate">
                  <span className="material-symbols-outlined text-sm">directions_run</span>
                  {run.title} · {run.city}
                </Link>
              )}
            </div>
            {run && (
              <Link href={`/corse/${run.id}`}
                className="shrink-0 text-xs bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-medium hover:bg-orange-100 transition-colors">
                Vedi corsa
              </Link>
            )}
          </PageContainer>
        </div>

        {/* Messages */}
        <PageContainer width="form" className="flex-1 py-6 flex flex-col gap-3">
          {messages && messages.length > 0 ? (
            <>
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id
                const time = format(parseISO(msg.created_at), "d MMM, HH:mm", { locale: it })
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <Avatar name={otherProfile.full_name} src={otherProfile.avatar_url} size="sm" className="shrink-0 mt-0.5" />
                    )}
                    <div className={`max-w-[78%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.body}
                      </div>
                      <div className="flex items-center gap-1.5 px-1">
                        <time className="text-[11px] text-gray-400">{time}</time>
                        {isMine && msg.read_at && (
                          <span className="material-symbols-filled text-primary text-sm">done_all</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">chat</span>
              <p className="text-sm text-gray-400">Inizia la conversazione.</p>
            </div>
          )}
        </PageContainer>

        {/* Reply form (sticky bottom) */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg">
          <PageContainer width="form" className="py-3">
            <ReplyForm
              runId={runId !== 'direct' ? runId : null}
              recipientId={otherId}
              senderId={user.id}
            />
          </PageContainer>
        </div>
      </main>

      <Footer />
    </div>
  )
}
