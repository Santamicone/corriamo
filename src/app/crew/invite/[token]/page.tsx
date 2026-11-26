import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CREW_TYPE_LABELS, type CrewType } from '@/lib/types'
import { InviteRequestButton } from './InviteRequestButton'

type InviteInfo = {
  crew_id: string
  crew_name: string
  crew_type: string
  crew_slug: string | null
  is_expired: boolean
  is_exhausted: boolean
}

/**
 * Il link di invito non fa entrare: porta alla scheda della crew, dove si chiede di entrare.
 * Una crew privata non è leggibile da chi non è membro, quindi per lei questa pagina fa da
 * scheda ridotta (nome e tipo). Aprire la pagina non scrive nulla: la richiesta parte dal bottone.
 */
export default async function InvitoCrewPage({ params }: { params: Promise<{ token: string }> }) {
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

  let isPending = false
  if (user && invite) {
    const { data: mine } = await supabase
      .from('crew_members')
      .select('status')
      .eq('crew_id', invite.crew_id)
      .eq('user_id', user.id)
      .maybeSingle()
    isPending = mine?.status === 'pending'
  }

  // Se la scheda è leggibile (crew pubblica, o ne faccio già parte) si va lì
  if (isValid && invite) {
    const { data: readable } = await supabase.from('crews').select('id').eq('id', invite.crew_id).maybeSingle()
    if (readable) redirect(`/crew/${invite.crew_slug ?? invite.crew_id}`)
  }

  const typeLabel = invite && CREW_TYPE_LABELS[invite.crew_type as CrewType]?.name

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-20 px-4 flex items-start justify-center">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          {invite && isPending ? (
            <>
              <span className="material-symbols-outlined text-5xl text-[var(--color-primary)] mb-4 block">schedule</span>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Richiesta inviata</h1>
              <p className="text-sm text-gray-500">
                La tua richiesta di ingresso in <strong>{invite.crew_name}</strong> è in attesa di approvazione.
                Ti avvisiamo con una notifica.
              </p>
            </>
          ) : !invite || !isValid ? (
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
              <h1 className="text-xl font-bold text-gray-900 mb-1">{invite.crew_name}</h1>
              {typeLabel && <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">{typeLabel}</p>}
              <p className="text-sm text-gray-500 mb-6">
                Hai ricevuto un invito. Chiedi di entrare: la richiesta deve essere approvata da chi gestisce la crew.
              </p>
              {user ? (
                <InviteRequestButton token={token} />
              ) : (
                <>
                  <Link
                    href={`/login?next=/crew/invite/${token}`}
                    className="block w-full bg-[var(--color-primary)] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity"
                  >
                    Accedi per chiedere di entrare
                  </Link>
                  <Link
                    href={`/registrati?next=/crew/invite/${token}`}
                    className="block w-full mt-3 border border-gray-200 text-gray-700 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
                  >
                    Registrati
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
