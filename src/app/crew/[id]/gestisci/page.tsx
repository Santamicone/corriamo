import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { Crew, CrewMember } from '@/lib/types'
import { MemberActions } from './MemberActions'
import { InviteLinkSection } from './InviteLinkSection'

export default async function GestisciCrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: crew } = await supabase
    .from('crews')
    .select('*')
    .eq('id', id)
    .single() as { data: Crew | null }

  if (!crew) notFound()

  // Solo owner e admin accedono alla dashboard
  const { data: currentMember } = await supabase
    .from('crew_members')
    .select('role')
    .eq('crew_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
    redirect(`/crew/${id}`)
  }

  const { data: members } = await supabase
    .from('crew_members')
    .select('*, user:profiles!user_id(id, full_name, avatar_url, city)')
    .eq('crew_id', id)
    .in('status', ['active', 'pending'])
    .order('status', { ascending: false }) // pending prima
    .order('joined_at', { ascending: true }) as { data: (CrewMember & { user: { id: string; full_name: string; avatar_url: string | null; city: string | null } })[] | null }

  const typeInfo = CREW_TYPE_LABELS[crew.crew_type]
  const pending = members?.filter((m) => m.status === 'pending') ?? []
  const active = members?.filter((m) => m.status === 'active') ?? []

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/crew/${id}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {crew.name}
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Gestisci crew</h1>
            </div>
          </div>

          {/* Richieste pending */}
          {pending.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 text-base">person_add</span>
                Richieste di ingresso
                <span className="bg-orange-100 text-orange-600 text-xs font-bold rounded-full px-2 py-0.5">{pending.length}</span>
              </h2>
              <div className="space-y-3">
                {pending.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.user.full_name} src={m.user.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/profilo/${m.user_id}`} className="font-medium text-sm text-gray-900 hover:text-[var(--color-brand)]">
                        {m.user.full_name}
                      </Link>
                      {m.user.city && <div className="text-xs text-gray-400">{m.user.city}</div>}
                    </div>
                    <MemberActions
                      crewId={id}
                      userId={m.user_id}
                      currentStatus="pending"
                      currentUserRole={currentMember.role as 'owner' | 'admin'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link invito */}
          <InviteLinkSection crewId={id} />

          {/* Membri attivi */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">
              {active.length} {active.length !== 1 ? (typeInfo.memberLabelPlural ?? typeInfo.memberLabel) : typeInfo.memberLabel}
            </h2>
            <div className="space-y-3">
              {active.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.user.full_name} src={m.user.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/profilo/${m.user_id}`} className="font-medium text-sm text-gray-900 hover:text-[var(--color-brand)]">
                      {m.user.full_name}
                    </Link>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {m.user.city && <span>{m.user.city}</span>}
                      {(m.role === 'owner' || m.role === 'admin') && (
                        <span className="bg-[var(--color-brand)]/10 text-[var(--color-brand)] rounded-full px-1.5 py-0.5">
                          {m.role === 'owner' ? typeInfo.ownerLabel : typeInfo.adminLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.user_id !== user.id && m.role !== 'owner' && currentMember.role === 'owner' && (
                    <MemberActions
                      crewId={id}
                      userId={m.user_id}
                      currentStatus="active"
                      currentRole={m.role as 'admin' | 'member'}
                      currentUserRole="owner"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Impostazioni crew (solo owner) */}
          {currentMember.role === 'owner' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Impostazioni</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-medium">{typeInfo.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Visibilità</span>
                  <span className="font-medium">{crew.visibility === 'public' ? 'Pubblica' : 'Privata'}</span>
                </div>
                {crew.whatsapp_group_link && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Gruppo WhatsApp</span>
                    <a href={crew.whatsapp_group_link} target="_blank" rel="noopener noreferrer"
                      className="text-[var(--color-brand)] hover:underline">
                      Apri
                    </a>
                  </div>
                )}
                <Link
                  href={`/crew/${id}/modifica`}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 pt-2"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Modifica profilo crew
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
