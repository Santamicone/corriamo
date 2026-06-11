'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  runId: string
  organizerId: string
  userId: string | null
  organizerName: string
}

export function ContactButton({ runId, organizerId, userId, organizerName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!body.trim() || !userId) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      run_id: runId,
      sender_id: userId,
      recipient_id: organizerId,
      body: body.trim(),
    })
    setSending(false)
    setSent(true)
    setBody('')
    setTimeout(() => {
      setOpen(false)
      setSent(false)
      router.push(`/messaggi/${runId}/${organizerId}`)
    }, 1200)
  }

  if (!userId) {
    return (
      <button
        onClick={() => router.push(`/login?next=${encodeURIComponent(`/corse/${runId}`)}`)}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">mail</span>
        Contatta l&apos;organizzatore
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">mail</span>
          Contatta l&apos;organizzatore
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          {sent ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold py-1">
              <span className="material-symbols-filled text-green-600">check_circle</span>
              Messaggio inviato a {organizerName}!
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-gray-900">Scrivi a {organizerName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Fai una domanda prima di iscriverti, o presentati.</p>
              </div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="es. Corro a 5:30/km circa, posso unirmi?"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setOpen(false); setBody('') }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSend}
                  disabled={!body.trim() || sending}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {sending ? 'Invio…' : 'Invia'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
