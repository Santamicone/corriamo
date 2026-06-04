import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, LEVEL_LABELS, formatPace } from '@/lib/utils'
import type { Run, Participation } from '@/lib/types'
import { JoinButton } from './JoinButton'
import { ParticipantsList } from './ParticipantsList'

export default async function CorsaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: run } = await supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(*), series:series(*)')
    .eq('id', id)
    .single()

  if (!run) notFound()

  const typedRun = run as unknown as Run

  const { data: participations } = await supabase
    .from('participations')
    .select('*, user:profiles(*)')
    .eq('run_id', id)
    .order('created_at')

  const approved = participations?.filter(p => p.status === 'approvata') ?? []
  const pending = participations?.filter(p => p.status === 'in_attesa') ?? []

  const myParticipation = user
    ? participations?.find(p => p.user_id === user.id) ?? null
    : null

  const isOrganizer = user?.id === typedRun.organizer_id
  const isPast = new Date(`${typedRun.date}T${typedRun.time}`) < new Date()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-12 py-8">
        <Link href="/bacheca" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Bacheca
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Title card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-primary" />
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={typedRun.level === 'tutti' ? 'default' : typedRun.level === 'principiante' ? 'green' : 'orange'}>
                    {LEVEL_LABELS[typedRun.level]}
                  </Badge>
                  {typedRun.is_no_drop && <Badge variant="green">No Drop</Badge>}
                  {typedRun.series_id && <Badge variant="muted">Serie: {typedRun.series?.title}</Badge>}
                  {isPast && <Badge variant="muted">Passata</Badge>}
                </div>
                <h1 className="text-2xl font-extrabold text-on-surface">{typedRun.title}</h1>
                {typedRun.description && (
                  <p className="text-sm text-on-surface-variant leading-relaxed">{typedRun.description}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    { icon: 'calendar_today', label: 'Data', value: formatDate(typedRun.date) },
                    { icon: 'schedule', label: 'Orario', value: typedRun.time.slice(0, 5) },
                    { icon: 'place', label: 'Luogo', value: typedRun.location },
                    { icon: 'route', label: 'Distanza', value: typedRun.distance_km ? `${typedRun.distance_km} km` : 'Libera' },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-container p-3 rounded-xl flex flex-col gap-1">
                      <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{item.label}</span>
                      <span className="text-sm font-semibold text-on-surface leading-tight">{item.value}</span>
                    </div>
                  ))}
                </div>

                {typedRun.pace_target && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                    <span className="material-symbols-outlined text-primary text-lg">speed</span>
                    <span className="text-sm font-medium text-on-surface">Ritmo target: <strong>{typedRun.pace_target}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Partecipanti */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-on-surface">
                  Partecipanti approvati
                  {typedRun.max_participants && (
                    <span className="text-on-surface-variant font-normal ml-1">
                      ({approved.length}/{typedRun.max_participants})
                    </span>
                  )}
                </h2>
              </div>
              {approved.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {approved.map(p => (
                    <ParticipantRow key={p.id} participation={p as unknown as Participation} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Nessun partecipante ancora.</p>
              )}
            </div>

            {/* Richieste in attesa (solo organizzatore) */}
            {isOrganizer && pending.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
                <h2 className="text-base font-bold text-on-surface mb-4">
                  Richieste in attesa ({pending.length})
                </h2>
                <ParticipantsList runId={id} participations={pending as unknown as Participation[]} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            {/* Organizzatore */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Organizzatore</p>
              <Link href={`/profilo/${typedRun.organizer_id}`} className="flex items-center gap-3 group">
                <Avatar name={typedRun.organizer.full_name} src={typedRun.organizer.avatar_url} size="md" />
                <div>
                  <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                    {typedRun.organizer.full_name}
                  </p>
                  {typedRun.organizer.city && (
                    <p className="text-xs text-on-surface-variant">{typedRun.organizer.city}</p>
                  )}
                </div>
              </Link>
            </div>

            {/* CTA iscrizione */}
            {!isPast && !isOrganizer && (
              <JoinButton
                runId={id}
                userId={user?.id ?? null}
                myParticipation={myParticipation as Participation | null}
                isFull={typedRun.max_participants !== null && approved.length >= typedRun.max_participants}
              />
            )}

            {isOrganizer && (
              <div className="bg-tertiary/10 border border-tertiary/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-filled text-tertiary text-lg">verified</span>
                  <span className="text-sm font-bold text-tertiary">Sei l&apos;organizzatore</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Puoi approvare o rifiutare le richieste di partecipazione dal pannello qui a sinistra.
                </p>
              </div>
            )}

            {typedRun.series && (
              <div className="bg-surface-container border border-outline-variant rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Parte della serie</p>
                <Link href={`/serie/${typedRun.series_id}`} className="text-sm font-semibold text-primary hover:underline">
                  {typedRun.series.title} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ParticipantRow({ participation }: { participation: Participation }) {
  if (!participation.user) return null
  return (
    <div className="flex items-center gap-3">
      <Avatar name={participation.user.full_name} src={participation.user.avatar_url} size="sm" />
      <div>
        <Link href={`/profilo/${participation.user_id}`} className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">
          {participation.user.full_name}
        </Link>
        {participation.user.city && (
          <p className="text-xs text-on-surface-variant">{participation.user.city}</p>
        )}
      </div>
    </div>
  )
}
