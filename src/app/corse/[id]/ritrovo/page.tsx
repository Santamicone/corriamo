import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { runRitrovoColor, parseRunDateTime } from '@/lib/utils'
import { RitrovoScreen } from './RitrovoScreen'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function RitrovoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/corse/${id}/ritrovo`)

  /* ── Corsa ── */
  const { data: run } = await supabase
    .from('runs')
    .select('id, title, date, time, organizer_id, status')
    .eq('id', id)
    .single()

  if (!run) notFound()

  /* ── Verifica finestra temporale ── */
  const runDateTime  = parseRunDateTime(run.date, run.time)
  const diffMin      = (runDateTime.getTime() - Date.now()) / (1000 * 60)
  const isInWindow   = diffMin <= 60 && diffMin >= -30 // 60 min prima → 30 min dopo

  /* ── Verifica accesso ── */
  const isOrganizer = user.id === run.organizer_id
  const { data: myPart } = await supabase
    .from('participations')
    .select('status')
    .eq('run_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isApproved  = myPart?.status === 'approvata'
  const hasAccess   = isOrganizer || isApproved

  /* ── Pagina accesso negato ── */
  if (!hasAccess || !isInWindow) {
    const color = runRitrovoColor(id)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-5 text-center"
           style={{ backgroundColor: color.bg, color: color.text }}>
        <span className="material-symbols-outlined text-6xl opacity-60">
          {!isInWindow ? 'schedule' : 'lock'}
        </span>
        <div>
          <p className="text-xl font-extrabold">
            {!isInWindow ? 'Non è ancora il momento' : 'Accesso non disponibile'}
          </p>
          <p className="mt-2 text-sm opacity-75 max-w-xs leading-relaxed">
            {!isInWindow
              ? `Il ritrovo si attiva fino a 60 minuti prima e resta disponibile 30 minuti dopo l'orario di inizio.`
              : 'Solo i partecipanti approvati possono accedere al ritrovo.'}
          </p>
        </div>
        <a href={`/corse/${id}`}
           style={{ color: color.text }}
           className="inline-flex items-center gap-2 border-2 border-current px-6 py-2.5 rounded-full text-sm font-semibold opacity-80 hover:opacity-100 transition-opacity">
          ← Torna alla corsa
        </a>
      </div>
    )
  }

  /* ── Dati ritrovo ── */
  const [{ count: checkInsCount }, myCheckIn, { count: approvedCount }] = await Promise.all([
    supabase.from('check_ins').select('id', { count: 'exact', head: true }).eq('run_id', id),
    supabase.from('check_ins').select('id').eq('run_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('participations').select('id', { count: 'exact', head: true })
      .eq('run_id', id).eq('status', 'approvata'),
  ])

  const color             = runRitrovoColor(id)
  const totalParticipants = (approvedCount ?? 0) + 1 // approvati + organizzatore

  return (
    <RitrovoScreen
      runId={id}
      userId={user.id}
      runTitle={run.title}
      runDate={run.date}
      runTime={run.time}
      color={color.bg}
      textColor={color.text}
      colorName={color.name}
      totalParticipants={totalParticipants}
      initialCheckInsCount={checkInsCount ?? 0}
      initialIsActive={!!myCheckIn.data}
      existingCheckInId={myCheckIn.data?.id ?? null}
      runDetailHref={`/corse/${id}`}
    />
  )
}
