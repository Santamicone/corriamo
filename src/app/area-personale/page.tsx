import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RunCard } from '@/components/RunCard'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { SeriesCard } from '@/components/SeriesCard'
import Link from 'next/link'
import type { Run, Series, CrewType } from '@/lib/types'
import { CREW_TYPE_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

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
    { data: myCrewMemberships },
    { data: myProfile },
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

    supabase.from('crew_members')
      .select('crew_id, role, status, crew:crews!crew_id(id, name, crew_type)')
      .eq('user_id', user.id)
      .eq('status', 'active'),

    supabase.from('profiles')
      .select('bio, level, city, age, pb_5k, pb_10k, pb_21k, pb_42k')
      .eq('id', user.id)
      .single(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crewMemberships = (myCrewMemberships ?? []).map((m: any) => ({
    crew_id: m.crew_id as string,
    role: m.role as string,
    crew: (Array.isArray(m.crew) ? m.crew[0] : m.crew) as { id: string; name: string; crew_type: CrewType } | null,
  })).filter(m => m.crew)

  const myOwnedCrews = crewMemberships.filter(m => m.role === 'owner')
  const myMemberCrews = crewMemberships.filter(m => m.role !== 'owner')

  // Calcola completezza profilo
  const profile = myProfile as { bio?: string; level?: string; city?: string; age?: number; pb_5k?: string; pb_10k?: string; pb_21k?: string; pb_42k?: string } | null
  const missingFields: string[] = []
  if (!profile?.bio)    missingFields.push('bio')
  if (!profile?.level || profile.level === 'principiante') missingFields.push('livello')
  if (!profile?.age)    missingFields.push('età')
  if (!profile?.pb_5k && !profile?.pb_10k && !profile?.pb_21k && !profile?.pb_42k) missingFields.push('personal best')

  const approvedParticipations = myParticipations?.filter(p => p.status === 'approvata') ?? []
  const pendingParticipations  = myParticipations?.filter(p => p.status === 'in_attesa') ?? []
  const unreadCount = unreadMessages ? (unreadMessages as unknown as { count: number }).count ?? 0 : 0

  // Utente senza alcuna attività: corse, iscrizioni, serie o crew
  const isBrandNew =
    (myRuns?.length ?? 0) === 0 &&
    (myParticipations?.length ?? 0) === 0 &&
    (mySeries?.length ?? 0) === 0 &&
    crewMemberships.length === 0

  // Checklist di attivazione — per chi ha iniziato ma non ha completato i passi chiave
  const activationSteps = [
    {
      label: 'Completa il profilo',
      hint: missingFields.length > 0 ? `Mancano: ${missingFields.join(', ')}` : 'Profilo completo',
      done: missingFields.length === 0,
      href: '/profilo/modifica',
    },
    {
      label: 'Unisciti alla prima corsa',
      hint: 'Manda “Mi interessa” o chiedi di partecipare',
      done: (myParticipations?.length ?? 0) > 0,
      href: '/bacheca',
    },
    {
      label: 'Proponi una corsa o entra in una crew',
      hint: 'Organizza un appuntamento o unisciti a un gruppo',
      done: (myRuns?.length ?? 0) > 0 || crewMemberships.length > 0,
      href: '/nuova-corsa',
    },
  ]
  const activationDone = activationSteps.filter(s => s.done).length
  const showActivation = !isBrandNew && activationDone < activationSteps.length

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

          {/* ── Checklist di attivazione ── */}
          {showActivation && (
            <div className="bg-white border border-gray-100 rounded-2xl px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">Completa la tua attivazione</p>
                <span className="text-xs font-semibold text-gray-400">{activationDone}/{activationSteps.length}</span>
              </div>
              {/* Barra di progresso */}
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(activationDone / activationSteps.length) * 100}%` }}
                />
              </div>
              <div className="flex flex-col gap-2">
                {activationSteps.map(step => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      step.done ? 'bg-green-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl shrink-0 ${step.done ? 'text-green-500' : 'text-gray-300'}`}>
                      {step.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {step.label}
                      </p>
                      {!step.done && <p className="text-xs text-gray-400 mt-0.5">{step.hint}</p>}
                    </div>
                    {!step.done && <span className="material-symbols-outlined text-gray-300 shrink-0">chevron_right</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Onboarding nuovo utente: percorso guidato in 3 step ── */}
          {isBrandNew && (
            <section className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-3xl px-6 py-7">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-xl">waving_hand</span>
                <h2 className="text-lg font-extrabold text-gray-900">Benvenuto! Ecco come iniziare</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">Tre passaggi e corri in compagnia.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { n: '1', icon: 'travel_explore', title: 'Trova una corsa', text: 'Cerca appuntamenti vicino a te, al ritmo giusto.' },
                  { n: '2', icon: 'favorite',       title: "Manda “Mi interessa”", text: 'Fai sapere che ci sei, o chiedi di partecipare.' },
                  { n: '3', icon: 'directions_run', title: 'Ci vediamo!',    text: 'Coordinatevi in chat e correte insieme.' },
                ].map(s => (
                  <div key={s.n} className="flex flex-col gap-2 bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                      <span className="material-symbols-outlined text-primary text-xl">{s.icon}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <Link href="/bacheca"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-lg">search</span>
                  Trova una corsa
                </Link>
                <Link href="/nuova-corsa"
                  className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">add</span>
                  Proponi tu una corsa
                </Link>
              </div>
            </section>
          )}

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

          {/* ── Crew ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">group</span>
                La mia crew
              </h2>
              <Link href="/crew/nuova" className="text-sm font-semibold text-primary hover:underline">
                + Crea crew
              </Link>
            </div>

            {myOwnedCrews.length > 0 ? (
              <div className="flex flex-col gap-2">
                {myOwnedCrews.map(m => (
                  <Link key={m.crew_id} href={`/crew/${m.crew_id}/gestisci`}
                    className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">group</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.crew!.name}</p>
                      <p className="text-xs text-gray-400">
                        {CREW_TYPE_LABELS[m.crew!.crew_type].ownerLabel} · {CREW_TYPE_LABELS[m.crew!.crew_type].name}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1 shrink-0">
                      Gestisci
                    </span>
                  </Link>
                ))}
              </div>
            ) : myMemberCrews.length > 0 ? (
              <div className="flex flex-col gap-2">
                {myMemberCrews.map(m => (
                  <Link key={m.crew_id} href={`/crew/${m.crew_id}`}
                    className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-400 text-xl">group</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.crew!.name}</p>
                      <p className="text-xs text-gray-400">{CREW_TYPE_LABELS[m.crew!.crew_type].name}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 shrink-0">chevron_right</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-white border border-dashed border-gray-200 rounded-2xl px-5 py-5">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-gray-300 text-xl">group_add</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">Non hai ancora una crew</p>
                  <p className="text-xs text-gray-400 mt-0.5">Crea il tuo gruppo di runner per corse riservate e coordinamento WhatsApp.</p>
                </div>
                <Link href="/crew/nuova"
                  className="shrink-0 text-sm font-semibold text-white bg-primary rounded-xl px-4 py-2 hover:opacity-90 transition-opacity">
                  Crea
                </Link>
              </div>
            )}
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
                        <p className="text-xs text-gray-400">{formatDate(run.date)} · {run.city}</p>
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
