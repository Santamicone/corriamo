import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { notFound, redirect } from 'next/navigation'
import { BoardWindow, type BoardMessage } from '@/components/board/BoardWindow'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function RunChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/corse/${id}/chat`)

  /* ── Fetch corsa ── */
  const { data: run } = await supabase
    .from('runs')
    .select('id, title, organizer_id, status')
    .eq('id', id)
    .single()

  if (!run) notFound()

  const isOrganizer = user.id === run.organizer_id

  /* ── Verifica accesso ── */
  const { data: myPart } = await supabase
    .from('participations')
    .select('status')
    .eq('run_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isApproved = myPart?.status === 'approvata'
  const hasAccess  = isOrganizer || isApproved
  const isPending  = myPart?.status === 'in_attesa'

  /* ── Pagina accesso negato ── */
  if (!hasAccess) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-gray-400">lock</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 mb-2">Bacheca riservata</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {isPending
                  ? 'La tua iscrizione è ancora in attesa di approvazione. Accederai alla bacheca non appena l\'organizzatore ti approverà.'
                  : 'Questa bacheca è riservata ai partecipanti approvati della corsa.'}
              </p>
            </div>
            <Link href={`/corse/${id}`}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Torna alla corsa
            </Link>
          </div>
        </main>
      </div>
    )
  }

  /* ── Post iniziali (ultimi 50, più recenti in cima) ── */
  const { data: rawMessages } = await supabase
    .from('run_chat')
    .select('*, author:profiles!run_chat_author_id_fkey(*)')
    .eq('run_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const messages = (rawMessages ?? []) as unknown as BoardMessage[]

  /* ── Partecipanti approvati (per contare il gruppo) ── */
  const { data: approvedParts } = await supabase
    .from('participations')
    .select('id')
    .eq('run_id', id)
    .eq('status', 'approvata')

  // Gruppo = organizzatore + partecipanti approvati
  const groupSize = (approvedParts?.length ?? 0) + 1

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <BoardWindow
          scopeId={id}
          userId={user.id}
          title={run.title}
          subtitle={`Bacheca · ${groupSize} runner nel gruppo`}
          backHref={`/corse/${id}`}
          backLabel="Torna alla corsa"
          headerIcon="chat_bubble"
          emptyText="Sii il primo a scrivere! Coordinarsi, condividere il percorso o motivarsi — questa bacheca è vostra."
          placeholder="Scrivi sulla bacheca della corsa…"
          initialMessages={messages}
          canModerate={false}
          config={{
            table: 'run_chat',
            scopeColumn: 'run_id',
            authorSelect: '*, author:profiles!run_chat_author_id_fkey(*)',
            channelPrefix: 'run-board',
          }}
        />
      </main>
    </div>
  )
}
