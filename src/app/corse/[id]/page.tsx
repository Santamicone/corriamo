import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, LEVEL_LABELS, formatPaceTarget } from '@/lib/utils'
import { TagBadge } from '@/components/ui/TagBadge'
import type { Run, Participation, Review, Momento } from '@/lib/types'
import { JoinButton } from './JoinButton'
import { ParticipantsList } from './ParticipantsList'
import { ContactButton } from './ContactButton'
import { ReviewForm } from './ReviewForm'
import { CancelRunButton } from './CancelRunButton'
import { MomentoSection } from './MomentoSection'
import { MomentoCard } from '@/components/MomentoCard'

const LEVEL_COLORS: Record<string, string> = {
  tutti:        'bg-gray-100 text-gray-600',
  principiante: 'bg-green-100 text-green-700',
  intermedio:   'bg-blue-100 text-blue-700',
  avanzato:     'bg-orange-100 text-orange-700',
}

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
    .from('participations').select('*, user:profiles(*)')
    .eq('run_id', id).order('created_at')

  const approved = participations?.filter(p => p.status === 'approvata') ?? []
  const pending  = participations?.filter(p => p.status === 'in_attesa') ?? []

  const myParticipation = user
    ? participations?.find(p => p.user_id === user.id) ?? null
    : null

  const isOrganizer = user?.id === typedRun.organizer_id
  const isPast = new Date(`${typedRun.date}T${typedRun.time}`) < new Date()
  const levelColor = LEVEL_COLORS[typedRun.level] ?? LEVEL_COLORS.tutti

  // Momenti — solo per corse passate
  const momenti: Momento[] = isPast ? await supabase
    .from('momenti')
    .select('*, author:profiles!momenti_author_id_fkey(*)')
    .eq('run_id', id)
    .order('created_at', { ascending: false })
    .then(r => (r.data ?? []) as unknown as Momento[]) : []

  const myMomento = user ? momenti.find(m => m.author_id === user.id) ?? null : null
  const canPostMomento = isPast && !!user && (isOrganizer || myParticipation?.status === 'approvata')

  // Recupera recensione esistente dell'utente loggato per questa corsa
  const myReview = (user && isPast && !isOrganizer && myParticipation?.status === 'approvata')
    ? await supabase
        .from('reviews')
        .select('*')
        .eq('run_id', id)
        .eq('reviewer_id', user.id)
        .maybeSingle()
        .then(r => r.data as Review | null)
    : null

  // Mostra form recensione solo se: corsa passata + partecipante approvato + non organizzatore
  const canReview = !!(
    user &&
    isPast &&
    !isOrganizer &&
    myParticipation?.status === 'approvata'
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* Hero header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link href="/bacheca" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors group">
              <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              Torna alla bacheca
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${levelColor}`}>
                {LEVEL_LABELS[typedRun.level]}
              </span>
              {typedRun.is_no_drop && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <span className="material-symbols-filled text-sm">favorite</span>No drop
                </span>
              )}
              {typedRun.series_id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  <span className="material-symbols-outlined text-sm">event_repeat</span>Serie ricorrente
                </span>
              )}
              {isPast && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                  Corsa passata
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {typedRun.title}
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

            {/* ── Main column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Dettagli appuntamento */}
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Dettagli dell&apos;appuntamento</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Data */}
                  {[
                    { icon: 'calendar_today', label: 'Data',     value: formatDate(typedRun.date) },
                    { icon: 'schedule',       label: 'Orario',   value: typedRun.time.slice(0, 5) },
                    { icon: 'route',          label: 'Distanza', value: typedRun.distance_km ? `${typedRun.distance_km} km` : 'Libera' },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                        <p className="text-sm font-bold text-gray-800 leading-tight mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}

                  {/* Luogo — card speciale con link Google Maps */}
                  {(() => {
                    const run = typedRun as Run & { lat?: number; lng?: number }
                    const mapsUrl = run.lat && run.lng
                      ? `https://www.google.com/maps?q=${run.lat},${run.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${typedRun.location}, ${typedRun.city}`)}`
                    return (
                      <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                        <span className="material-symbols-outlined text-primary text-xl">place</span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Luogo</p>
                          <p className="text-sm font-bold text-gray-800 leading-tight mt-0.5">{typedRun.location}</p>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Apri su Google Maps
                          </a>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                {typedRun.pace_target && (
                  <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                    <span className="material-symbols-outlined text-primary text-xl">speed</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Ritmo target</p>
                      <p className="text-sm font-bold text-orange-800">{formatPaceTarget(typedRun.pace_target)}</p>
                    </div>
                  </div>
                )}
                {/* Tag caratteristiche */}
                {(typedRun as Run & { tags?: string[] }).tags?.length ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Caratteristiche</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedRun as Run & { tags?: string[] }).tags!.map(id => (
                        <TagBadge key={id} tagId={id} size="md" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              {/* Descrizione */}
              {typedRun.description && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Com&apos;è la corsa</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{typedRun.description}</p>
                </section>
              )}

              {/* Nota rassicurante — solo corse future */}
              {!isPast && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
                  <span className="material-symbols-outlined text-blue-400 text-xl shrink-0">info</span>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Presentati qualche minuto prima della partenza. Se hai dubbi sul ritmo, scrivi all&apos;organizzatore prima di iscriverti.
                  </p>
                </div>
              )}

              {/* Chi corre */}
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Chi corre</h2>
                  {typedRun.max_participants && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                      {approved.length}/{typedRun.max_participants} posti
                    </span>
                  )}
                </div>
                {approved.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {approved.map(p => (
                      <ParticipantRow key={p.id} participation={p as unknown as Participation} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-3xl text-gray-200">group</span>
                    <p className="text-sm text-gray-400 mt-2">
                      {isPast ? 'Nessun partecipante registrato.' : 'Ancora nessun partecipante.'}
                    </p>
                    {!isPast && <p className="text-sm text-gray-400">Sii il primo a unirti.</p>}
                  </div>
                )}
              </section>

              {/* ── Momenti (corse passate) ── */}
              {isPast && (
                <MomentoSection
                  runId={id}
                  userId={user?.id ?? null}
                  canPost={canPostMomento}
                  existingMomento={myMomento}
                  momenti={momenti}
                />
              )}

              {/* Richieste in attesa — solo organizzatore */}
              {isOrganizer && pending.length > 0 && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Richieste in attesa
                    <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
                  </h2>
                  <ParticipantsList runId={id} participations={pending as unknown as Participation[]} />
                </section>
              )}

              {/* ── Recensione (solo partecipanti approvati, corsa passata) ── */}
              {canReview && (
                <ReviewForm
                  runId={id}
                  reviewedId={typedRun.organizer_id}
                  reviewedName={typedRun.organizer.full_name}
                  reviewedAvatar={typedRun.organizer.avatar_url}
                  reviewerId={user!.id}
                  existingReview={myReview}
                />
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="flex flex-col gap-5">

              {/* CTA iscrizione */}
              {!isPast && !isOrganizer && (
                <JoinButton
                  runId={id}
                  userId={user?.id ?? null}
                  myParticipation={myParticipation as Participation | null}
                  isFull={typedRun.max_participants !== null && approved.length >= typedRun.max_participants}
                />
              )}

              {/* Contatta organizzatore */}
              {!isOrganizer && (
                <ContactButton
                  runId={id}
                  organizerId={typedRun.organizer_id}
                  userId={user?.id ?? null}
                  organizerName={typedRun.organizer.full_name}
                />
              )}

              {/* Organizzatore */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Organizzatore</h3>
                <Link href={`/profilo/${typedRun.organizer_id}`} className="flex items-center gap-3 group">
                  <Avatar name={typedRun.organizer.full_name} src={typedRun.organizer.avatar_url} size="md" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                      {typedRun.organizer.full_name}
                    </p>
                    {typedRun.organizer.city && (
                      <p className="text-xs text-gray-400">{typedRun.organizer.city}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-200 group-hover:text-primary ml-auto transition-colors">
                    chevron_right
                  </span>
                </Link>
              </div>

              {isOrganizer && (
                <>
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
                    <span className="material-symbols-filled text-green-600 text-xl shrink-0">verified</span>
                    <div>
                      <p className="text-sm font-bold text-green-800">Sei l&apos;organizzatore</p>
                      <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
                        Approva o rifiuta le richieste dal pannello qui sotto.
                      </p>
                    </div>
                  </div>
                  {!isPast && typedRun.status === 'aperta' && (
                    <CancelRunButton runId={id} />
                  )}
                </>
              )}

              {typedRun.series && (
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Parte della serie</p>
                  <Link href={`/serie/${typedRun.series_id}`}
                    className="flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors">
                    <span className="material-symbols-outlined text-base">event_repeat</span>
                    {typedRun.series.title}
                    <span className="material-symbols-outlined text-sm ml-auto">arrow_forward</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function ParticipantRow({ participation }: { participation: Participation }) {
  if (!participation.user) return null
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
      <Avatar name={participation.user.full_name} src={participation.user.avatar_url} size="sm" />
      <div>
        <Link href={`/profilo/${participation.user_id}`}
          className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors">
          {participation.user.full_name}
        </Link>
        {participation.user.city && <p className="text-xs text-gray-400">{participation.user.city}</p>}
      </div>
    </div>
  )
}
