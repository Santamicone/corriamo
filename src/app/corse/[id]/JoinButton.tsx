'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
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
      run_id: runId,
      user_id: userId,
      status: 'in_attesa',
      message: message || null,
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

  if (myParticipation) {
    const statusMap = {
      in_attesa: { label: 'Richiesta inviata', color: 'bg-primary/10 text-primary border border-primary/20', icon: 'hourglass_empty' },
      approvata: { label: 'Sei iscritto', color: 'bg-tertiary/10 text-tertiary border border-tertiary/20', icon: 'check_circle' },
      rifiutata: { label: 'Richiesta rifiutata', color: 'bg-error-container text-error border border-error/20', icon: 'cancel' },
    }
    const s = statusMap[myParticipation.status]
    return (
      <div className={`rounded-2xl p-4 flex flex-col gap-3 ${s.color}`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">{s.icon}</span>
          <span className="text-sm font-bold">{s.label}</span>
        </div>
        {myParticipation.status !== 'approvata' && (
          <Button variant="secondary" size="sm" loading={loading} onClick={handleCancel}>
            Annulla richiesta
          </Button>
        )}
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-4 text-center">
        <span className="material-symbols-outlined text-on-surface-variant text-2xl mb-2 block">group_off</span>
        <p className="text-sm font-semibold text-on-surface-variant">Corsa al completo</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
      {!showForm ? (
        <>
          <p className="text-sm text-on-surface-variant">Vuoi partecipare a questa corsa?</p>
          <Button size="lg" className="w-full" onClick={() => userId ? setShowForm(true) : router.push('/login')}>
            <span className="material-symbols-outlined text-lg">directions_run</span>
            Richiedi iscrizione
          </Button>
        </>
      ) : (
        <>
          <Textarea
            label="Messaggio per l'organizzatore (opzionale)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Presentati o aggiungi una nota..."
            rows={3}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Annulla</Button>
            <Button loading={loading} onClick={handleJoin} className="flex-1">Invia richiesta</Button>
          </div>
        </>
      )}
    </div>
  )
}
