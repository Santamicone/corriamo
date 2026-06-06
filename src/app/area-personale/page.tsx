import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RunCard } from '@/components/RunCard'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { SeriesCard } from '@/components/SeriesCard'
import Link from 'next/link'
import type { Run, Series } from '@/lib/types'

export default async function AreaPersonalePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: myRuns },
    { data: myParticipations },
    { data: mySeries },
    { data: unreadMessages },
  ] = await Promise.all([
    supabase.from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('organizer_id', user.id)
      .gte('date', today)
      .order('date', { ascending: true }),

    supabase.from('participations')
      .select('*, run:runs(*, organizer:profiles!runs_organizer_id_fkey(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase.from('series')
      .select('*, organizer:profiles!series_organizer_id_fkey(*)')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false }),

    supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null),
  ])

  const approvedParticipations = myParticipations?.filter(p => p.status === 'approvata') ?? []
  const pendingParticipations  = myParticipations?.filter(p => p.status === 'in_attesa') ?? []
  const unreadCount = unreadMessages ? (unreadMessages as unknown as { count: number }).count ?? 0 : 0

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-extrabold text-gray-900">Area personale</h1>
            <p className="text-gray-500 mt-1">Le tue corse, le tue serie, le tue iscrizioni.</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">

          {/* ── Messaggi in evidenza ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">mail</span>
                Messaggi
                {unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nuov{unreadCount === 1 ? 'o' : 'i'}
                  </span>
                )}
              </h2>
              <Link href="/messaggi" className="text-sm font-semibold text-primary hover:underline">
                Apri posta →
              </Link>
            </div>
            <Link
              href="/messaggi"
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${unreadCount > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <span className={`material-symbols-outlined text-xl ${unreadCount > 0 ? 'text-primary' : 'text-gray-400'}`}>
                  {unreadCount > 0 ? 'mark_email_unread' : 'mail'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {unreadCount > 0
                    ? `${unreadCount} messaggio${unreadCount > 1 ? 'i' : ''} non lett${unreadCount > 1 ? 'i' : 'o'}`
                    : 'Nessun messaggio non letto'}
                </p>
                <p className="text-xs text-gray-400">Clicca per vedere posta in arrivo e conversazioni</p>
              </div>
              <span className="material-symbols-outlined text-gray-300 ml-auto">chevron_right</span>
            </Link>
          </section>

          {/* ── Richieste in attesa (organizzatore) ── */}
          {pendingParticipations.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-xl">hourglass_empty</span>
                  Richieste da approvare
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingParticipations.length}
                  </span>
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {pendingParticipations.map(p => {
                  const run = p.run as unknown as Run
                  return (
                    <Link key={p.id} href={`/corse/${run.id}`}
                      className="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-2xl hover:shadow-sm transition-all">
                      <span className="material-symbols-outlined text-orange-500 shrink-0">hourglass_empty</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{run.title}</p>
                        <p className="text-xs text-gray-400">{run.date} · {run.city}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 ml-auto shrink-0">chevron_right</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Corse che organizzo ── */}
          <section>
            <SectionHeader title="Corse che organizzo" count={myRuns?.length ?? 0} cta={{ href: '/nuova-corsa', label: '+ Nuova corsa' }} />
            {myRuns && myRuns.length > 0 ? (
              <RunGrid runs={myRuns as unknown as Run[]} />
            ) : <Empty icon="add_location" label="Nessuna corsa organizzata" />}
          </section>

          {/* ── Corse a cui partecipo ── */}
          <section>
            <SectionHeader title="Corse a cui partecipo" count={approvedParticipations.length} />
            {approvedParticipations.length > 0 ? (
              <RunGrid runs={approvedParticipations.map(p => p.run as unknown as Run)} />
            ) : <Empty icon="directions_run" label="Nessuna iscrizione approvata" />}
          </section>

          {/* ── Serie che organizzo ── */}
          <section>
            <SectionHeader title="Serie che organizzo" count={mySeries?.length ?? 0} cta={{ href: '/nuova-serie', label: '+ Nuova serie' }} />
            {mySeries && mySeries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(mySeries as unknown as Series[]).map(s => <SeriesCard key={s.id} series={s} />)}
              </div>
            ) : <Empty icon="event_repeat" label="Nessuna serie creata" />}
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}

/** Grid adattiva: 1 col se 1 item, 2 se 2, 3 altrimenti */
function RunGrid({ runs }: { runs: Run[] }) {
  const cols = runs.length === 1
    ? 'grid-cols-1 max-w-sm'
    : runs.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid gap-4 ${cols}`}>
      {runs.map(r => <RunCard key={r.id} run={r} />)}
    </div>
  )
}

function SectionHeader({ title, count, cta }: {
  title: string; count: number; cta?: { href: string; label: string }
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-extrabold text-gray-900">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-400">({count})</span>
      </h2>
      {cta && (
        <Link href={cta.href} className="text-sm font-semibold text-primary hover:underline">{cta.label}</Link>
      )}
    </div>
  )
}

function Empty({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl text-gray-400">
      <span className="material-symbols-outlined text-2xl opacity-30">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}
