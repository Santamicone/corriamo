import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { Crew } from '@/lib/types'

export default async function AccettaInvitoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Recupera l'invito e la crew collegata
  const { data: invite } = await supabase
    .from('crew_invites')
    .select('id, crew_id, expires_at, max_uses, use_count')
    .eq('token', token)
    .single()

  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date()
  const isExhausted = invite?.max_uses !== null && (invite?.use_count ?? 0) >= (invite?.max_uses ?? 0)
  const isValid = invite && !isExpired && !isExhausted

  let crew: Crew | null = null
  if (isValid) {
    const { data } = await supabase
      .from('crews')
      .select('*')
      .eq('id', invite.crew_id)
      .single()
    crew = data
  }

  // Se l'utente è loggato, accetta subito via server action
  if (user && isValid && crew) {
    const { data: existing } = await supabase
      .from('crew_members')
      .select('status')
      .eq('crew_id', crew.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      await supabase
        .from('crew_members')
        .insert({ crew_id: crew.id, user_id: user.id, role: 'member', status: 'active' })
      await supabase
        .from('crew_invites')
        .update({ use_count: (invite.use_count ?? 0) + 1 })
        .eq('id', invite.id)
    }

    redirect(`/crew/${crew.id}`)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vieniacorrere.it'

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-20 px-4 flex items-start justify-center">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          {!isValid ? (
            <>
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">link_off</span>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link non valido</h1>
              <p className="text-sm text-gray-500">
                {isExpired ? 'Questo link di invito è scaduto.' : isExhausted ? 'Questo link ha raggiunto il numero massimo di utilizzi.' : 'Il link non esiste o è stato rimosso.'}
              </p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-5xl text-[var(--color-brand)] mb-4 block">group_add</span>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Sei stato invitato</h1>
              {crew && (
                <p className="text-sm text-gray-500 mb-6">
                  Unisciti a <strong>{crew.name}</strong>
                  {' '}({CREW_TYPE_LABELS[crew.crew_type].name})
                </p>
              )}
              <Link
                href={`/login?redirect=/crew/invite/${token}`}
                className="block w-full bg-[var(--color-brand)] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity"
              >
                Accedi per entrare
              </Link>
              <Link
                href={`/registrati?redirect=/crew/invite/${token}`}
                className="block w-full mt-3 border border-gray-200 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
