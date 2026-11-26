import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { ProposalImage } from '@/components/ProposalImage'
import { LEVEL_LABELS } from '@/lib/utils'
import {
  PROPOSAL_KINDS, fetchProposal, formatDistanceRange, formatProposalDay, formatProposalPace, formatWindow,
} from '@/lib/proposals'
import { ProposalInterestButton } from './ProposalInterestButton'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const p = await fetchProposal(supabase, id)
  if (!p) return { title: 'Proposta non trovata' }
  return {
    title: `${p.title} a ${p.city} · cerca organizzatore`,
    description: `Proposta di corsa a ${p.city}, ${formatProposalDay(p.target_date)} ${formatWindow(p)}. Organizzala tu o di' che ti interessa.`,
    // Solo le proposte aperte sono utili ai motori di ricerca (decisione Q2: pubbliche in sola lettura)
    robots: p.status === 'aperta' ? undefined : { index: false, follow: true },
  }
}

export default async function PropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: { user } }, p] = await Promise.all([supabase.auth.getUser(), fetchProposal(supabase, id)])
  if (!p) notFound()

  const kind = PROPOSAL_KINDS[p.kind]
  const distance = formatDistanceRange(p)
  const pace = formatProposalPace(p.pace_target)
  const open = p.status === 'aperta'
  const adoptHref = `/nuova-corsa?proposta=${p.id}`

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="form" className="py-10">
            <Link href="/bacheca" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
              <span className="material-symbols-outlined text-base">arrow_back</span> Bacheca
            </Link>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProposalImage kind={p.kind} url={p.image_url}
                className="aspect-[4/3] w-full rounded-3xl object-top sm:order-2 sm:aspect-square sm:w-56 sm:shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">person_search</span>
                    Proposta di Vieni a correre · cerca organizzatore
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                    <span className="material-symbols-outlined text-sm">{kind?.icon ?? 'directions_run'}</span>
                    {kind?.label}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">{p.title}</h1>
                <p className="mt-2 text-lg text-gray-600 first-letter:uppercase">
                  {formatProposalDay(p.target_date)}, tra le {formatWindow(p).replace('–', ' e le ')}
                </p>
                <p className="text-gray-500">{p.city}{p.zone ? ` · zona ${p.zone}` : ''}</p>
              </div>
            </div>
          </PageContainer>
        </div>

        <PageContainer width="form" className="py-8 flex flex-col gap-5">
          {/* Stato non aperto */}
          {p.status === 'adottata' && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
              <span className="material-symbols-outlined text-green-600">celebration</span>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {p.adopted_by_name ? `L’ha organizzata ${p.adopted_by_name}` : 'Qualcuno l’ha organizzata'}
                </p>
                {p.adopted_run_id && (
                  <Link href={`/corse/${p.adopted_run_id}`} className="text-sm font-semibold text-green-700 hover:underline">
                    Vai alla corsa e iscriviti →
                  </Link>
                )}
              </div>
            </div>
          )}
          {(p.status === 'scaduta' || p.status === 'ritirata') && (
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
              <span className="material-symbols-outlined text-gray-400">event_busy</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Questa proposta non è più disponibile</p>
                <Link href={`/nuova-corsa?city=${encodeURIComponent(p.city)}`} className="text-sm font-semibold text-primary hover:underline">
                  Proponi tu una corsa a {p.city} →
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Info icon="straighten" label="Distanza" value={distance ?? 'Da decidere'} />
              <Info icon="speed" label="Ritmo" value={pace ?? 'Variabile'} />
              <Info icon="signal_cellular_alt" label="Livello" value={LEVEL_LABELS[p.level] ?? p.level} />
            </div>
            {p.description && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{p.description}</p>}
            <p className="text-xs text-gray-400 leading-relaxed">
              È un’idea di uscita proposta da Vieni a correre, non ancora organizzata da nessuno.
              Il punto di ritrovo esatto lo sceglie chi la organizza.
            </p>
          </div>

          {open && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900">La organizzi tu?</h2>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Trovi il modulo già compilato: scegli il punto di ritrovo e l’orario, e la corsa è tua.
                  Puoi spostarla al massimo di due giorni. Chi è interessato riceve subito una notifica.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <Link href={user ? adoptHref : `/login?next=${encodeURIComponent(adoptHref)}`}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                  <span className="material-symbols-outlined text-base">flag</span>
                  La organizzo io
                </Link>
                <ProposalInterestButton
                  proposalId={p.id}
                  userId={user?.id ?? null}
                  initialInterested={p.i_am_interested}
                  initialCount={p.interest_count}
                />
              </div>
            </div>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}

function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
