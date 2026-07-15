'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** Messaggi d'errore parlanti mappati sui RAISE EXCEPTION della RPC. */
const ERR: Record<string, string> = {
  run_full: 'La corsa è al completo.',
  not_a_member: 'Solo i membri della crew possono confermare.',
  run_not_open: 'La corsa non è più aperta.',
  not_a_crew_run: 'Questa corsa non appartiene a una crew.',
  default: 'Non è stato possibile confermare. Riprova.',
}

/**
 * Bottone "Ci sono" — conferma immediata della presenza a una corsa della crew,
 * riservato ai membri. Va nello slot `action` di NextOutingCard. Aggiornamento
 * ottimistico + refresh del server component per allineare roster e conteggio.
 */
export function AttendanceButton({
  runId,
  userId,
  initialGoing,
}: {
  runId: string
  userId: string
  initialGoing: boolean
}) {
  const router = useRouter()
  const [going, setGoing] = useState(initialGoing)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const confirm = async () => {
    setLoading(true)
    setErr(null)
    setGoing(true) // ottimistico
    const supabase = createClient()
    const { error } = await supabase.rpc('crew_confirm_attendance', { p_run_id: runId })
    if (error) {
      setGoing(false)
      setLoading(false)
      setErr(ERR[error.message] ?? ERR.default)
      return
    }
    setLoading(false)
    router.refresh()
  }

  const cancel = async () => {
    setLoading(true)
    setErr(null)
    setGoing(false) // ottimistico
    const supabase = createClient()
    // La RLS consente all'utente di cancellare la propria partecipazione.
    const { error } = await supabase
      .from('participations')
      .delete()
      .eq('run_id', runId)
      .eq('user_id', userId)
    if (error) {
      setGoing(true)
      setLoading(false)
      setErr(ERR.default)
      return
    }
    setLoading(false)
    router.refresh()
  }

  if (going) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button
          onClick={cancel}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-filled text-base">check_circle</span>
          {loading ? '…' : 'Ci sarai'}
        </button>
        <span className="text-[11px] text-gray-400">tocca per annullare</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={confirm}
        disabled={loading}
        className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-base">check</span>
        {loading ? '…' : 'Ci sono'}
      </button>
      {err && <span className="text-[11px] text-red-500 max-w-[160px] text-right">{err}</span>}
    </div>
  )
}
