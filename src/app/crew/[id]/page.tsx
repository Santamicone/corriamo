import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { Crew, CrewMember, Run } from '@/lib/types'
import { RunCard } from '@/components/RunCard'
import { CrewFeed } from '@/components/CrewFeed'
import { buildCrewFeed } from '@/lib/crewFeed'
import type { FeedActivity, FeedMember } from '@/lib/crewFeed'
import { CrewBoard } from '@/components/CrewBoard'
import { CrewMemberList } from '@/components/CrewMemberList'
import { CrewEmptyState } from '@/components/CrewEmptyState'
import { ImpactCard } from '@/components/ImpactCard'
import { NextOutingCard } from '@/components/NextOutingCard'
import type { NextOutingRun, NextOutingParticipant } from '@/components/NextOutingCard'
import { AttendanceButton } from '@/components/AttendanceButton'
import { JoinCrewButton } from './JoinCrewButton'
import type { Metadata } from 'next'
import { todayItaly, parseRunDateTime } from '@/lib/utils'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Il segmento [id] accetta sia lo slug personalizzato sia l'uuid legacy. */
function lookupColumn(param: string): 'id' | 'slug' {
  return UUID_RE.test(param) ? 'id' : 'slug'
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('crews')
    .select('name, description, slug, cover_url')
    .eq(lookupColumn(id), id)
    .single()
  if (!data) return { title: 'Crew — Vieni a correre?' }
  return {
    title: `${data.name} — Vieni a correre?`,
    description: data.description ?? undefined,
    alternates: data.slug ? { canonical: `/crew/${data.slug}` } : undefined,
    openGraph: data.cover_url ? { images: [data.cover_url] } : undefined,
  }
}

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: crew } = await supabase
    .from('crews')
    .select('*, owner:profiles!owner_id(id, full_name, avatar_url, city)')
    .eq(lookupColumn(id), id)
    .single() as { data: (Crew & { owner: { id: string; full_name: string; avatar_url: string | null; city: string | null } }) | null }

  if (!crew) notFound()

  const { data: members } = await supabase
    .from('crew_members')
    .select('*, user:profiles!user_id(id, full_name, avatar_url, city)')
    .eq('crew_id', crew.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true }) as { data: (CrewMember & { user: { id: string; full_name: string; avatar_url: string | null; city: string | null } })[] | null }

  const isMember = user && members?.some((m) => m.user_id === user.id)

  // Corse crew-only future (visibili solo ai membri)
  let crewRuns = null
  if (isMember) {
    const { data } = await supabase
      .from('runs')
      .select('id, title, date, time, city, distance_km')
      .eq('crew_id', crew.id)
      .eq('run_visibility', 'crew_only')
      .eq('status', 'aperta')
      .order('date', { ascending: true })
      .limit(5)
    crewRuns = data
  }

  // Feed attività Strava degli atleti della crew — mostrato su tutte le crew,
  // a chiunque visiti la pagina. La RLS su strava_activities filtra per viewer:
  //  · anon / non-membri → solo atleti con strava_public_profile = true;
  //  · membri di una crew privata → anche gli atleti che condividono col feed
  //    (strava_share_activities = true).
  let activities = null
  if (members && members.length > 0) {
    const memberIds = members.map((m) => m.user_id)
    const { data } = await supabase
      .from('strava_activities')
      .select('*, user:profiles!user_id(id, full_name, avatar_url)')
      .in('user_id', memberIds)
      // Finestra 30gg (limit ampio) per alimentare feed unificato + insight
      .gte('start_date', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order('start_date', { ascending: false })
      .limit(40)
    activities = data
  }

  // Corse pubbliche future (a tutti) + corse effettuate + bacheca + statistiche
  const today = todayItaly()
  const [{ data: publicRuns }, { data: pastRuns }, { data: posts }, { data: statsRows }, { data: impactRows }] = await Promise.all([
    supabase
      .from('runs')
      .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
      .eq('crew_id', crew.id)
      .eq('run_visibility', 'public')
      .eq('status', 'aperta')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(6),
    // Corse effettuate. NB: la SELECT policy su runs è `using (true)` → le
    // corse crew_only NON sono nascoste dalla RLS, quindi filtriamo qui:
    // le riservate compaiono solo ai membri.
    supabase
      .from('runs')
      .select('id, title, date, time, city, distance_km, run_visibility')
      .eq('crew_id', crew.id)
      .neq('status', 'annullata')
      .lt('date', today)
      .in('run_visibility', isMember ? ['public', 'crew_only', 'invite_only'] : ['public'])
      .order('date', { ascending: false })
      .limit(6),
    // Bacheca del coach: RLS filtra per visibilità (pubblica a tutti / privata ai membri)
    supabase
      .from('crew_posts')
      .select('*, author:profiles!author_id(id, full_name, avatar_url)')
      .eq('crew_id', crew.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('crew_stats', { p_crew_id: crew.id }),
    // Impatto sociale del gruppo (persone coinvolte / tornate / prime uscite) —
    // segnali verificati, calcolati al volo. Vedi docs/GAMIFICATION.md §7.
    supabase.rpc('crew_impact_stats', { p_crew_id: crew.id }),
  ])
  const stats = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as
    { total_runs: number; total_km: number; member_count: number } | null
  const impact = (Array.isArray(impactRows) ? impactRows[0] : impactRows) as
    { distinct_people: number; returning_people: number; activated_newcomers: number } | null

  const typeInfo = CREW_TYPE_LABELS[crew.crew_type]
  const currentMember = members?.find((m) => m.user_id === user?.id)
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  // ───── Prossima uscita in evidenza ─────
  // La più imminente tra le corse pubbliche e (per i membri) quelle riservate.
  const nextCandidates: NextOutingRun[] = [
    ...((publicRuns ?? []) as unknown as Run[]).map((r) => ({
      id: r.id, title: r.title, date: r.date, time: r.time,
      city: r.city, location: (r as Run & { location?: string | null }).location ?? null,
      distance_km: r.distance_km ?? null,
      run_visibility: (r as Run & { run_visibility?: string }).run_visibility ?? 'public',
    })),
    ...((crewRuns ?? []) as { id: string; title: string; date: string; time: string; city: string | null; distance_km: number | null }[]).map((r) => ({
      id: r.id, title: r.title, date: r.date, time: r.time,
      city: r.city, location: null, distance_km: r.distance_km ?? null,
      run_visibility: 'crew_only',
    })),
  ]
  const nextRun = nextCandidates
    .sort((a, b) => parseRunDateTime(a.date, a.time).getTime() - parseRunDateTime(b.date, b.time).getTime())[0] ?? null

  let nextParticipants: NextOutingParticipant[] = []
  let nextApprovedCount = 0
  let iAmGoing = false
  if (nextRun) {
    // Roster dei confermati via RPC SECURITY DEFINER: la RLS su participations
    // nasconderebbe le partecipazioni altrui a un membro qualsiasi.
    const { data: roster } = await supabase.rpc('run_going_roster', { p_run_id: nextRun.id })
    const people = (Array.isArray(roster) ? roster : []) as NextOutingParticipant[]
    nextApprovedCount = people.length
    nextParticipants = people.slice(0, 6)
    iAmGoing = !!user && people.some((p) => p.id === user.id)
  }

  // Griglie "Corse programmate" senza la corsa già mostrata in evidenza (no duplicati)
  const restPublicRuns = ((publicRuns ?? []) as unknown as Run[]).filter((r) => r.id !== nextRun?.id)
  const restCrewRuns = ((crewRuns ?? []) as { id: string; title: string; date: string; time: string; city: string | null; distance_km: number | null }[]).filter((r) => r.id !== nextRun?.id)

  // Colonna principale "vuota": nessuna uscita in evidenza, programmata o effettuata.
  // Mostra un empty-state curato invece di lasciare la colonna spoglia.
  const noRuns = !nextRun && restPublicRuns.length === 0 && restCrewRuns.length === 0 && (pastRuns?.length ?? 0) === 0

  // Feed unificato: attività Strava + nuovi membri + insight (assemblato lato TS)
  const feed = buildCrewFeed({
    activities: (activities ?? []) as unknown as FeedActivity[],
    members: (members ?? []) as unknown as FeedMember[],
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-10">
        <PageContainer width="content" className="space-y-6">

          {/* Immagine di testata (se presente) — a tutta larghezza sopra le due colonne */}
          {crew.cover_url && (
            <div className="rounded-2xl overflow-hidden shadow-sm aspect-[16/6] bg-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={crew.cover_url} alt={crew.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/*
            Desktop: due colonne. La sidebar (identità/navigazione) sta a destra,
            la colonna principale (attività) a sinistra. In DOM la sidebar viene
            prima, così su mobile — dove il grid collassa a una colonna — l'header
            della crew resta in cima; su lg si scambia l'ordine con `order`.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ───────── SIDEBAR — identità e navigazione (a destra su desktop) ───────── */}
          <aside className="space-y-6 lg:order-2 lg:sticky lg:top-24 self-start">

          {/* Header crew */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {typeInfo.name}
                  </span>
                  {crew.visibility === 'private' && (
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      Privata
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{crew.name}</h1>
                {crew.description && (
                  <p className="text-gray-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{crew.description}</p>
                )}
              </div>
              {canManage && (
                <Link
                  href={`/crew/${crew.id}/gestisci`}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">settings</span>
                  Gestisci
                </Link>
              )}
            </div>

            {/* Owner */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <Avatar name={crew.owner.full_name} src={crew.owner.avatar_url} size="sm" />
              <span className="text-sm text-gray-600">
                <span className="font-medium text-[var(--color-primary)]">{typeInfo.ownerLabel}</span>
                {' '}&mdash; {crew.owner.full_name}
              </span>
            </div>

            {/* Statistiche collettive del gruppo */}
            {stats && (stats.total_runs > 0 || stats.member_count > 0) && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { value: stats.member_count ?? 0, label: (stats.member_count ?? 0) === 1 ? typeInfo.memberLabel : typeInfo.memberLabelPlural, icon: 'group' },
                  { value: stats.total_runs ?? 0, label: (stats.total_runs ?? 0) === 1 ? 'corsa insieme' : 'corse insieme', icon: 'directions_run' },
                  { value: Math.round(stats.total_km ?? 0), label: 'km di gruppo', icon: 'footprint' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-2xl py-3 px-2 text-center">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">{s.icon}</span>
                    <span className="text-lg font-extrabold text-gray-900 leading-none">{s.value}</span>
                    <span className="text-[11px] text-gray-400 leading-tight">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat privata della crew — riservata ai membri */}
          {isMember && (
            <Link
              href={`/crew/${crew.slug ?? crew.id}/chat`}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[var(--color-primary)]">forum</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Bacheca della crew</p>
                <p className="text-xs text-gray-400">Scrivi e leggi i post di tutti i membri</p>
              </div>
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </Link>
          )}

          {/* Azione: entra / stato */}
          {user && !isMember && (
            <JoinCrewButton crewId={crew.id} />
          )}
          {!user && (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-3">
                <Link href="/login" className="text-[var(--color-primary)] font-semibold">Accedi</Link> per entrare in questa crew
              </p>
            </div>
          )}
          {currentMember?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span>
              Richiesta di ingresso inviata — in attesa di approvazione.
            </div>
          )}

          {/* Membri — collasso "+altri N" per le crew numerose */}
          <CrewMemberList members={(members ?? []) as never} typeInfo={typeInfo} />

          </aside>

          {/* ───────── COLONNA PRINCIPALE — attività (a sinistra su desktop) ───────── */}
          <div className="space-y-6 min-w-0 lg:order-1">

          {/* Empty-state: crew senza corse (evita la colonna principale spoglia) */}
          {noRuns && <CrewEmptyState canManage={!!canManage} isMember={!!isMember} />}

          {/* Prossima uscita in evidenza — il driver del ritorno quotidiano */}
          {nextRun && (
            <NextOutingCard
              run={nextRun}
              participants={nextParticipants}
              approvedCount={nextApprovedCount}
              action={isMember && user ? (
                <AttendanceButton runId={nextRun.id} userId={user.id} initialGoing={iAmGoing} />
              ) : undefined}
            />
          )}

          {/* Bacheca del coach — riservata ai membri */}
          {isMember && (
            <CrewBoard
              crewId={crew.id}
              posts={(posts ?? []) as never}
              canManage={!!canManage}
              coachLabel={typeInfo.ownerLabel}
            />
          )}

          {/* Corse programmate (esclusa la prossima uscita già in evidenza) */}
          {(restPublicRuns.length > 0 || restCrewRuns.length > 0) && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-base">calendar_month</span>
                Corse programmate
              </h2>

              {restPublicRuns.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {restPublicRuns.map(run => <RunCard key={run.id} run={run} />)}
                </div>
              )}

              {isMember && restCrewRuns.length > 0 && (
                <div className={restPublicRuns.length > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-gray-400 text-base">lock</span>
                    Riservate ai membri
                  </h3>
                  <div className="space-y-2">
                    {restCrewRuns.map((run) => (
                      <Link
                        key={run.id}
                        href={`/corse/${run.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-sm text-gray-900">{run.title}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(run.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}
                            {run.time?.slice(0, 5)}
                            {run.distance_km ? ` · ${run.distance_km} km` : ''}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 text-base">chevron_right</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Impatto della crew — persone coinvolte / tornate / prime uscite (verificate) */}
          {impact && (
            <ImpactCard
              title="L'impatto della crew"
              subtitle="Non quanti km, ma quante persone fate correre insieme"
              stats={[
                { value: impact.distinct_people ?? 0, label: 'persona coinvolta', labelPlural: 'persone diverse coinvolte', icon: 'diversity_3' },
                { value: impact.returning_people ?? 0, label: 'tornata a correre', labelPlural: 'tornate a correre', icon: 'replay' },
                { value: impact.activated_newcomers ?? 0, label: 'alla prima corsa', labelPlural: 'alla loro prima corsa', icon: 'celebration' },
              ]}
            />
          )}

          {/* Corse effettuate */}
          {pastRuns && pastRuns.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-base">history</span>
                Corse effettuate
              </h2>
              <div className="space-y-2">
                {pastRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/corse/${run.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{run.title}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(run.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {run.city ? ` · ${run.city}` : ''}
                        {run.distance_km ? ` · ${run.distance_km} km` : ''}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 text-base shrink-0">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Feed unificato: attività Strava, nuovi membri, insight di gruppo.
              Se la crew è vuota l'empty-state sopra basta: evita il doppio riquadro. */}
          {(feed.length > 0 || (isMember && !noRuns)) && (
            <CrewFeed items={feed} isMember={!!isMember} />
          )}

          </div>
          {/* /COLONNA PRINCIPALE */}

          </div>
          {/* /grid due colonne */}

        </PageContainer>
      </main>
      <Footer />
    </>
  )
}
