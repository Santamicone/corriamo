import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { notFound, redirect } from 'next/navigation'
import { BoardWindow, type BoardMessage } from '@/components/board/BoardWindow'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Il segmento [id] accetta sia lo slug personalizzato sia l'uuid legacy. */
function lookupColumn(param: string): 'id' | 'slug' {
  return UUID_RE.test(param) ? 'id' : 'slug'
}

export default async function CrewChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/crew/${id}/chat`)

  /* ── Fetch crew (risolve slug o uuid) ── */
  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, slug')
    .eq(lookupColumn(id), id)
    .single()

  if (!crew) notFound()

  /* ── Verifica accesso: solo membri attivi ── */
  const { data: myMembership } = await supabase
    .from('crew_members')
    .select('role, status')
    .eq('crew_id', crew.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isActiveMember = myMembership?.status === 'active'
  const isPending      = myMembership?.status === 'pending'
  const canModerate    = isActiveMember && (myMembership?.role === 'owner' || myMembership?.role === 'admin')
  const crewDetailHref = `/crew/${crew.slug ?? crew.id}`

  /* ── Pagina accesso negato ── */
  if (!isActiveMember) {
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
                  ? 'La tua richiesta di ingresso è ancora in attesa di approvazione. Accederai alla bacheca non appena verrai approvato.'
                  : 'Questa bacheca è riservata ai membri della crew. Entra nella crew per partecipare.'}
              </p>
            </div>
            <Link href={crewDetailHref}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Torna alla crew
            </Link>
          </div>
        </main>
      </div>
    )
  }

  /* ── Post iniziali (ultimi 50, più recenti in cima) ── */
  const { data: rawMessages } = await supabase
    .from('crew_chat')
    .select('*, author:profiles!crew_chat_author_id_fkey(*)')
    .eq('crew_id', crew.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const messages = (rawMessages ?? []) as unknown as BoardMessage[]

  /* ── Conteggio membri attivi ── */
  const { count } = await supabase
    .from('crew_members')
    .select('id', { count: 'exact', head: true })
    .eq('crew_id', crew.id)
    .eq('status', 'active')

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <BoardWindow
          scopeId={crew.id}
          userId={user.id}
          title={crew.name}
          subtitle={`Bacheca della crew · ${count ?? 0} ${count === 1 ? 'membro' : 'membri'}`}
          backHref={crewDetailHref}
          backLabel="Torna alla crew"
          headerIcon="forum"
          emptyText="Questa è la bacheca della crew. Coordinatevi, organizzate le uscite o fatevi due chiacchiere."
          placeholder="Scrivi sulla bacheca della crew…"
          initialMessages={messages}
          canModerate={canModerate}
          config={{
            table: 'crew_chat',
            scopeColumn: 'crew_id',
            authorSelect: '*, author:profiles!crew_chat_author_id_fkey(*)',
            channelPrefix: 'crew-board',
          }}
        />
      </main>
    </div>
  )
}
