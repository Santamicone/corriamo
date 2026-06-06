'use client'
import { useState, useRef } from 'react'

interface Props {
  onSend: (body: string) => Promise<void>
}

const MAX = 2000

export function MessageInput({ onSend }: Props) {
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setError('')
    setSending(true)
    try {
      await onSend(trimmed)
      setBody('')
    } catch (e) {
      setError('Errore nell\'invio. Riprova.')
      console.error(e)
    } finally {
      setSending(false)
      setTimeout(() => textRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const remaining = MAX - body.length
  const nearLimit = remaining < 200

  return (
    <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0">
      {error && (
        <p className="text-xs text-red-500 mb-1.5">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <textarea
            ref={textRef}
            value={body}
            onChange={e => setBody(e.target.value.slice(0, MAX))}
            onKeyDown={handleKey}
            placeholder="Scrivi un messaggio… (Invio per inviare, Shift+Invio per andare a capo)"
            rows={1}
            className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
            autoFocus
          />
          {nearLimit && (
            <p className={`text-[11px] text-right pr-1 ${remaining <= 0 ? 'text-red-500' : 'text-amber-500'}`}>
              {remaining} caratteri rimanenti
            </p>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-40 shrink-0 mb-0.5"
          aria-label="Invia messaggio"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-xl">send</span>
          }
        </button>
      </div>
    </div>
  )
}
