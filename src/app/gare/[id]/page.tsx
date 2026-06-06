import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Run } from '@/lib/types'
import { ContactButton } from '@/app/corse/[id]/ContactButton'
import { CancelRunButton } from '@/app/corse/[id]/CancelRunButton'
import type { Metadata } from 'next'

const SITE_URL = 'https://www.vieniacorrere.it'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('runs')
    .select('title, race_name, race_distance, city, date, looking_for')
    .eq('id', id)
    .eq('type', 'gara')
    .single()

  if (!data) return { title: 'Cerca compagni di gara' }

  const dist = data.race_distance ? RACE_DISTANCE_LABELS[data.race_distance] : null
  const desc = [
    dist,
    data.race_name,
    data.city,
    data.looking_for?.length ? `Cerca: ${(data.looking_for as string[]).join(', ')}` : null,
  ].filter(Boolean).join(' · ')

  return {
    title: data.title,
    description: desc || `Runner cerca compagni per ${data.race_name ?? 'una gara'} a ${data.city}.`,
    alternates: { canonical: `${SITE_URL}/gare/${id}` },
    openGraph: {
      title: `${data.title} — Vieni a correre?`,
      description: desc,
      url: `${SITE_URL}/gare/${id}`,
    },
  }
}

const RACE_DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza maratona (21K)', '42k': 'Maratona (42K)',
}

const LOOKING_FOR_LABELS: Record<string, { label: string; icon: string }> = {
  pacer:     { label: 'Pacer',           icon: 'speed' },
  compagno:  { label: 'Compagno di gara', icon: 'group' },
  supporter: { label: 'Supporter',        icon: 'volunteer_activism' },
}

export default async function GaraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: run } = await supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(*)')
    .eq('id', id)
    .eq('type', 'gara')
    .single()

  if (!run) notFound()
  const typedRun = run as unknown as Run

  const isOrganizer = user?.id === typedRun.organizer_id
  const isPast = new Date(`${typedRun.date}T${typedRun.time}`) < new Date()
  const lf = typedRun.looking_for ?? []

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Link href="/bacheca?tab=gare" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors group">
              <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              Torna alle gare
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              {typedRun.race_distance && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">emoji_events</span>
                  {RACE_DISTANCE_LABELS[typedRun.race_distance] ?? typedRun.race_distance}
                </span>
              )}
              {typedRun.race_registered && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                  <span className="material-symbols-filled text-sm">check_circle</span>
                  Già iscritto
                </span>
              )}
              {isPast && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                  Gara passata
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {typedRun.title}
            </h1>
            {typedRun.race_name && (
              <p className="mt-2 text-base text-gray-500">{typedRun.race_name}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

            {/* Main */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Dettagli */}
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Dettagli della gara</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: 'calendar_today', label: 'Data',    value: formatDate(typedRun.date) },
                    { icon: 'schedule',       label: 'Orario',  value: typedRun.time.slice(0, 5) },
                    { icon: 'place',          label: 'Città',   value: typedRun.city },
                    { icon: 'timer',          label: 'Obiettivo', value: typedRun.race_target_time || 'Non indicato' },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-indigo-500 text-xl">{item.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                        <p className="text-sm font-bold text-gray-800 leading-tight mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Cosa cerca */}
              {lf.length > 0 && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Cosa sta cercando</h2>
                  <div className="flex flex-wrap gap-3">
                    {lf.map(key => {
                      const meta = LOOKING_FOR_LABELS[key]
                      if (!meta) return null
                      return (
                        <div key={key} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
                          <span className="material-symbols-outlined text-indigo-500 text-xl">{meta.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-indigo-800">{meta.label}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Descrizione */}
              {typedRun.description && (
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Note</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{typedRun.description}</p>
                </section>
              )}

              {/* Info box */}
              {!isPast && (
                <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5">
                  <span className="material-symbols-outlined text-indigo-400 text-xl shrink-0">info</span>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    Questa non è una corsa organizzata: è un post di un runner che cerca compagni per una gara già esistente.
                    Scrivi direttamente all&apos;autore per metterti in contatto.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-5">

              {/* Contatta */}
              {!isOrganizer && (
                <ContactButton
                  runId={id}
                  organizerId={typedRun.organizer_id}
                  userId={user?.id ?? null}
                  organizerName={typedRun.organizer.full_name}
                />
              )}

              {/* Autore */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Autore del post</h3>
                <Link href={`/profilo/${typedRun.organizer_id}`} className="flex items-center gap-3 group">
                  <Avatar name={typedRun.organizer.full_name} src={typedRun.organizer.avatar_url} size="md" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {typedRun.organizer.full_name}
                    </p>
                    {typedRun.organizer.city && (
                      <p className="text-xs text-gray-400">{typedRun.organizer.city}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-200 group-hover:text-indigo-500 ml-auto transition-colors">
                    chevron_right
                  </span>
                </Link>
              </div>

              {isOrganizer && (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                    <span className="material-symbols-filled text-indigo-500 text-xl shrink-0">verified</span>
                    <div>
                      <p className="text-sm font-bold text-indigo-800">Sei l&apos;autore</p>
                      <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
                        Chi è interessato ti contatterà direttamente.
                      </p>
                    </div>
                  </div>
                  {!isPast && typedRun.status === 'aperta' && (
                    <CancelRunButton runId={id} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
