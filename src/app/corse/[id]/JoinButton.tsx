'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Participation } from '@/lib/types'

interface Props {
  runId: string
  userId: string | null
  myParticipation: Participation | null
  isFull: boolean
}

export function JoinButton({ runId, userId, myParticipation, isFull }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  const handleJoin = async () => {
    if (!userId) { router.push('/login'); return }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('participations').insert({
      run_id: runId, user_id: userId,
      status: 'in_attesa', message: message || null,
    })
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('participations').delete().eq('id', myParticipation.id)
    setLoading(false)
    router.refresh()
  }

  /* ── Status già presente ── */
  if (myParticipation) {
    const s = {
      in_attesa: { icon: 'hourglass_empty', title: 'Richiesta inviata',  subtitle: "L'organizzatore la esaminerà a breve.", color: 'bg-orange-50 border-orange-100', iconColor: 'text-orange-500', textColor: 'text-orange-800' },
      approvata: { icon: 'check_circle',    title: 'Sei iscritto!',       subtitle: 'Ci vediamo alla partenza.',            color: 'bg-green-50 border-green-100',  iconColor: 'text-green-600',  textColor: 'text-green-800' },
      rifiutata: { icon: 'cancel',          title: 'Richiesta rifiutata', subtitle: 'Puoi provare un\'altra corsa.',        color: 'bg-red-50 border-red-100',     iconColor: 'text-red-500',    textColor: 'text-red-800' },
    }[myParticipation.status]

    return (
      <div className={`rounded-3xl border ${s.color} p-5 flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <span className={`material-symbols-filled text-2xl ${s.iconColor}`}>{s.icon}</span>
          <div>
            <p className={`text-sm font-bold ${s.textColor}`}>{s.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.subtitle}</p>
          </div>
        </div>
        {myParticipation.status !== 'approvata' && (
          <button
            onClick={handleCancel} disabled={loading}
            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors underline text-left"
          >
            {loading ? 'Annullamento…' : 'Annulla richiesta'}
          </button>
        )}
      </div>
    )
  }

  /* ── Corsa al completo ── */
  if (isFull) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 text-center">
        <span className="material-symbols-outlined text-3xl text-gray-300 block mb-2">group_off</span>
        <p className="text-sm font-bold text-gray-700">Corsa al completo</p>
        <p className="text-xs text-gray-400 mt-1">Tutti i posti sono stati assegnati.</p>
      </div>
    )
  }

  /* ── Form iscrizione ── */
  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 flex flex-col gap-4">
      {!showForm ? (
        <>
          <div>
            <p className="text-sm font-bold text-gray-900">Vuoi partecipare?</p>
            <p className="text-xs text-gray-400 mt-0.5">Invia una richiesta all&apos;organizzatore.</p>
          </div>
          <button
            onClick={() => userId ? setShowForm(true) : router.push('/login')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3.5 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
          >
            <span className="material-symbols-outlined text-lg">directions_run</span>
            Partecipa alla corsa
          </button>
          {!userId && (
            <p className="text-xs text-gray-400 text-center">Devi effettuare il login per iscriverti.</p>
          )}
        </>
      ) : (
        <>
          <div>
            <p className="text-sm font-bold text-gray-900">Presentati</p>
            <p className="text-xs text-gray-400 mt-0.5">Facoltativo, ma aiuta l&apos;organizzatore a conoscerti.</p>
          </div>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="es. Corro da 2 anni, ritmo 5:30/km circa..."
            rows={3}
            className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Annulla
            </button>
            <button onClick={handleJoin} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60">
              {loading ? 'Invio…' : 'Invia richiesta'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
