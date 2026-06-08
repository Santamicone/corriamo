import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { Crew, CrewMember } from '@/lib/types'
import { JoinCrewButton } from './JoinCrewButton'
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('crews').select('name, description').eq('id', id).single()
  if (!data) return { title: 'Crew — Vieni a correre?' }
  return {
    title: `${data.name} — Vieni a correre?`,
    description: data.description ?? undefined,
  }
}

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: crew } = await supabase
    .from('crews')
    .select('*, owner:profiles!owner_id(id, full_name, avatar_url, city)')
    .eq('id', id)
    .single() as { data: (Crew & { owner: { id: string; full_name: string; avatar_url: string | null; city: string | null } }) | null }

  if (!crew) notFound()

  const { data: members } = await supabase
    .from('crew_members')
    .select('*, user:profiles!user_id(id, full_name, avatar_url, city)')
    .eq('crew_id', id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true }) as { data: (CrewMember & { user: { id: string; full_name: string; avatar_url: string | null; city: string | null } })[] | null }

  // Corse crew-only (visibili solo ai membri)
  let crewRuns = null
  const isMember = user && members?.some((m) => m.user_id === user.id)
  if (isMember) {
    const { data } = await supabase
      .from('runs')
      .select('id, title, date, time, city, distance_km')
      .eq('crew_id', id)
      .eq('run_visibility', 'crew_only')
      .eq('status', 'aperta')
      .order('date', { ascending: true })
      .limit(5)
    crewRuns = data
  }

  const typeInfo = CREW_TYPE_LABELS[crew.crew_type]
  const currentMember = members?.find((m) => m.user_id === user?.id)
  const isOwner = user?.id === crew.owner_id

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

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
                  <p className="text-gray-600 mt-2 text-sm leading-relaxed">{crew.description}</p>
                )}
              </div>
              {isOwner && (
                <Link
                  href={`/crew/${id}/gestisci`}
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
                <span className="font-medium text-[var(--color-brand)]">{typeInfo.ownerLabel}</span>
                {' '}&mdash; {crew.owner.full_name}
              </span>
            </div>
          </div>

          {/* Azione: entra / stato */}
          {user && !isMember && (
            <JoinCrewButton crewId={id} />
          )}
          {!user && (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-3">
                <Link href="/login" className="text-[var(--color-brand)] font-semibold">Accedi</Link> per entrare in questa crew
              </p>
            </div>
          )}
          {currentMember?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span>
              Richiesta di ingresso inviata — in attesa di approvazione.
            </div>
          )}

          {/* Membri */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">
              {members?.length ?? 0} {(members?.length ?? 0) !== 1 ? typeInfo.memberLabelPlural : typeInfo.memberLabel}
            </h2>
            <div className="space-y-3">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.user.full_name} src={m.user.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/profilo/${m.user_id}`} className="font-medium text-sm text-gray-900 hover:text-[var(--color-brand)]">
                      {m.user.full_name}
                    </Link>
                    {m.user.city && (
                      <div className="text-xs text-gray-400">{m.user.city}</div>
                    )}
                  </div>
                  {(m.role === 'owner' || m.role === 'admin') && (
                    <span className="text-xs bg-[var(--color-brand)]/10 text-[var(--color-brand)] rounded-full px-2 py-0.5">
                      {m.role === 'owner' ? typeInfo.ownerLabel : typeInfo.adminLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Corse riservate (solo per membri) */}
          {isMember && crewRuns && crewRuns.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-brand)] text-base">lock</span>
                Corse riservate
              </h2>
              <div className="space-y-3">
                {crewRuns.map((run) => (
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
      </main>
      <Footer />
    </>
  )
}
