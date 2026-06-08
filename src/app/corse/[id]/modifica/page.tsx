import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { parseRunDateTime } from '@/lib/utils'
import { EditRunForm } from './EditRunForm'
import type { Run } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Modifica corsa — Vieni a correre?',
  robots: { index: false },
}

export default async function EditRunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Non autenticato → login
  if (!user) redirect(`/login?next=/corse/${id}/modifica`)

  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', id)
    .single()

  if (!run) notFound()

  // Solo l'organizzatore può modificare
  if (run.organizer_id !== user.id) redirect(`/corse/${id}`)

  // Corsa annullata → non modificabile
  if (run.status === 'annullata') redirect(`/corse/${id}`)

  // Corsa passata → non modificabile
  const runDateTime = parseRunDateTime(run.date, run.time)
  if (runDateTime < new Date()) redirect(`/corse/${id}`)

  // Blocco <2h dall'orario
  const diffMin = (runDateTime.getTime() - Date.now()) / (1000 * 60)
  const isLocked = diffMin < 120

  // Conta partecipanti approvati (per vincolo max_participants e notifiche)
  const { count: approvedCount } = await supabase
    .from('participations')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', id)
    .eq('status', 'approvata')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link href={`/corse/${id}`}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors group">
              <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              Torna alla corsa
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900">Modifica corsa</h1>
            <p className="text-sm text-gray-400 mt-1">{run.title}</p>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Blocco <2h */}
          {isLocked ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-amber-500 text-5xl">schedule</span>
              <div>
                <p className="text-base font-extrabold text-amber-900">Modifica non disponibile</p>
                <p className="text-sm text-amber-700 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  La corsa inizia tra meno di 2 ore. Non è più possibile modificarla per rispettare i partecipanti.
                </p>
              </div>
              <Link href={`/corse/${id}`}
                className="inline-flex items-center gap-2 bg-white border border-amber-200 text-amber-700 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-amber-50 transition-colors">
                Torna alla corsa
              </Link>
            </div>
          ) : (
            <EditRunForm
              run={run as unknown as Run & { lat?: number; lng?: number; tags?: string[]; location_public?: boolean }}
              approvedCount={approvedCount ?? 0}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
