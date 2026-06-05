'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  runId: string | null
  recipientId: string
  senderId: string
}

export function ReplyForm({ runId, recipientId, senderId }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if (!body.trim()) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      run_id: runId,
      sender_id: senderId,
      recipient_id: recipientId,
      body: body.trim(),
    })
    setBody('')
    setSending(false)
    router.refresh()
    setTimeout(() => textRef.current?.focus(), 100)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textRef}
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Scrivi un messaggio… (Invio per inviare)"
        rows={1}
        className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all max-h-32 overflow-y-auto"
        style={{ lineHeight: '1.5' }}
      />
      <button
        onClick={handleSend}
        disabled={!body.trim() || sending}
        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-40 shrink-0"
        aria-label="Invia"
      >
        {sending
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <span className="material-symbols-outlined text-xl">send</span>
        }
      </button>
    </div>
  )
}
