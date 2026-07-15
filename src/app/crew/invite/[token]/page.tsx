import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS, type CrewType } from '@/lib/types'

type InviteInfo = {
  crew_id: string
  crew_name: string
  crew_type: string
  crew_slug: string | null
  is_expired: boolean
  is_exhausted: boolean
}

export default async function AccettaInvitoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Lettura invito via RPC SECURITY DEFINER: la RLS su crew_invites consente la
  // SELECT solo agli admin della crew, ma chi riceve il link non è ancora membro.
  // La funzione bypassa la RLS lavorando solo sul token fornito.
  const { data: rows } = await supabase.rpc('get_crew_invite', { p_token: token })
  const invite = (Array.isArray(rows) ? rows[0] : rows) as InviteInfo | null | undefined

  const isExpired = invite?.is_expired === true
  const isExhausted = invite?.is_exhausted === true
  const isValid = !!invite && !isExpired && !isExhausted

  // Se l'utente è loggato e il link è valido, accetta subito (RPC atomica) e
  // reindirizza alla crew.
  if (user && isValid && invite) {
    const { data: acceptRows } = await supabase.rpc('accept_crew_invite', { p_token: token })
    const outcome = (Array.isArray(acceptRows) ? acceptRows[0] : acceptRows) as
      { crew_id: string; result: string } | null | undefined
    if (outcome?.crew_id) {
      redirect(`/crew/${invite.crew_slug ?? outcome.crew_id}`)
    }
  }

  const typeLabel = invite && CREW_TYPE_LABELS[invite.crew_type as CrewType]?.name

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
                {isExpired
                  ? 'Questo link di invito è scaduto.'
                  : isExhausted
                    ? 'Questo link ha raggiunto il numero massimo di utilizzi.'
                    : 'Il link non esiste o è stato rimosso.'}
              </p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-5xl text-[var(--color-primary)] mb-4 block">group_add</span>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Sei stato invitato</h1>
              <p className="text-sm text-gray-500 mb-6">
                Unisciti a <strong>{invite.crew_name}</strong>
                {typeLabel ? ` (${typeLabel})` : ''}
              </p>
              <Link
                href={`/login?next=/crew/invite/${token}`}
                className="block w-full bg-[var(--color-primary)] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity"
              >
                Accedi per entrare
              </Link>
              <Link
                href={`/registrati?next=/crew/invite/${token}`}
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
