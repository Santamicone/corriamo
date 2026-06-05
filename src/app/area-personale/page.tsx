import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RunCard } from '@/components/RunCard'
import { SeriesCard } from '@/components/SeriesCard'
import Link from 'next/link'
import type { Run, Series } from '@/lib/types'

export default async function AreaPersonalePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: myRuns }, { data: myParticipations }, { data: mySeries }] = await Promise.all([
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
  ])

  const approvedParticipations = myParticipations?.filter(p => p.status === 'approvata') ?? []
  const pendingParticipations = myParticipations?.filter(p => p.status === 'in_attesa') ?? []

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2">Area personale</h1>
        <p className="text-on-surface-variant mb-8">Le tue corse, le tue serie, le tue iscrizioni.</p>

        <div className="flex flex-col gap-10">
          {/* Corse organizzate */}
          <Section title="Corse che organizzo" count={myRuns?.length ?? 0} cta={{ href: '/nuova-corsa', label: '+ Nuova corsa' }}>
            {myRuns && myRuns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(myRuns as unknown as Run[]).map(r => <RunCard key={r.id} run={r} />)}
              </div>
            ) : <Empty icon="add_location" label="Nessuna corsa organizzata" />}
          </Section>

          {/* Serie organizzate */}
          <Section title="Serie che organizzo" count={mySeries?.length ?? 0} cta={{ href: '/nuova-serie', label: '+ Nuova serie' }}>
            {mySeries && mySeries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(mySeries as unknown as Series[]).map(s => <SeriesCard key={s.id} series={s} />)}
              </div>
            ) : <Empty icon="event_repeat" label="Nessuna serie creata" />}
          </Section>

          {/* Corse approvate */}
          <Section title="Corse a cui partecipo" count={approvedParticipations.length}>
            {approvedParticipations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedParticipations.map(p => (
                  <RunCard key={p.id} run={p.run as unknown as Run} />
                ))}
              </div>
            ) : <Empty icon="directions_run" label="Nessuna iscrizione approvata" />}
          </Section>

          {/* In attesa */}
          {pendingParticipations.length > 0 && (
            <Section title="Richieste in attesa" count={pendingParticipations.length}>
              <div className="flex flex-col gap-3">
                {pendingParticipations.map(p => {
                  const run = p.run as unknown as Run
                  return (
                    <Link key={p.id} href={`/corse/${run.id}`}
                      className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-sm transition-all">
                      <span className="material-symbols-outlined text-primary">hourglass_empty</span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{run.title}</p>
                        <p className="text-xs text-on-surface-variant">{run.date} · {run.city}</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant ml-auto">chevron_right</span>
                    </Link>
                  )
                })}
              </div>
            </Section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Section({
  title, count, cta, children
}: {
  title: string; count: number; cta?: { href: string; label: string }; children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-on-surface">
          {title}
          <span className="ml-2 text-sm font-normal text-on-surface-variant">({count})</span>
        </h2>
        {cta && (
          <Link href={cta.href} className="text-sm font-semibold text-primary hover:underline">{cta.label}</Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Empty({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-6 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface-variant">
      <span className="material-symbols-outlined text-2xl opacity-40">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}
