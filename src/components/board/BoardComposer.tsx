'use client'
import { useState, useRef } from 'react'

interface Props {
  onSend: (body: string) => Promise<void>
  placeholder?: string
}

const MAX = 2000

/** Set curato di emoji d'uso comune per il running/social — inserimento al cursore. */
const EMOJIS = [
  '😀', '😄', '😅', '😂', '🙂', '😉', '😍', '😎',
  '🤔', '👍', '👎', '👏', '🙏', '💪', '🔥', '⭐',
  '❤️', '🎉', '🏃', '🥇', '⏱️', '📍', '☀️', '🌧️',
]

export function BoardComposer({ onSend, placeholder }: Props) {
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setError('')
    setSending(true)
    try {
      await onSend(trimmed)
      setBody('')
      setEmojiOpen(false)
    } catch (e) {
      setError('Errore nella pubblicazione. Riprova.')
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

  const insertEmoji = (emoji: string) => {
    const el = textRef.current
    if (!el) {
      setBody(b => (b + emoji).slice(0, MAX))
      return
    }
    const start = el.selectionStart ?? body.length
    const end   = el.selectionEnd ?? body.length
    const next  = (body.slice(0, start) + emoji + body.slice(end)).slice(0, MAX)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const remaining = MAX - body.length
  const nearLimit = remaining < 200

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0">
      {error && <p className="text-xs text-red-500 mb-1.5">{error}</p>}

      <textarea
        ref={textRef}
        value={body}
        onChange={e => setBody(e.target.value.slice(0, MAX))}
        onKeyDown={handleKey}
        placeholder={placeholder ?? 'Scrivi sulla bacheca… (Invio per pubblicare, Shift+Invio per andare a capo)'}
        rows={2}
        className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all max-h-40 overflow-y-auto"
        style={{ lineHeight: '1.5' }}
      />

      {nearLimit && (
        <p className={`text-[11px] text-right pr-1 mt-0.5 ${remaining <= 0 ? 'text-red-500' : 'text-amber-500'}`}>
          {remaining} caratteri rimanenti
        </p>
      )}

      {/* Mini-picker emoji */}
      {emojiOpen && (
        <div className="mt-2 grid grid-cols-8 gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-2">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => insertEmoji(e)}
              className="text-lg leading-none rounded-lg py-1 hover:bg-white transition-colors"
              aria-label={`Inserisci ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <button
          type="button"
          onClick={() => setEmojiOpen(o => !o)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            emojiOpen ? 'bg-orange-50 text-primary' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
          aria-label="Emoji"
          aria-expanded={emojiOpen}
        >
          <span className="material-symbols-outlined text-xl">mood</span>
        </button>

        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-lg">send</span>
          }
          {sending ? 'Pubblicazione…' : 'Pubblica'}
        </button>
      </div>
    </div>
  )
}
