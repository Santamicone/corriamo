'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { MessageInput } from './MessageInput'
import type { RunChatMessage } from '@/lib/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'

interface Props {
  runId:           string
  userId:          string
  runTitle:        string
  runDetailHref:   string
  initialMessages: RunChatMessage[]
  groupSize:       number
}

function formatSep(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d))     return 'Oggi'
  if (isYesterday(d)) return 'Ieri'
  return format(d, 'EEEE d MMMM', { locale: it })
}

function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

function dayOf(iso: string) { return iso.slice(0, 10) }

export function ChatWindow({ runId, userId, runTitle, runDetailHref, initialMessages, groupSize }: Props) {
  const [messages, setMessages] = useState<RunChatMessage[]>(initialMessages)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  // Scroll istantaneo al mount
  useEffect(() => { scrollToBottom('instant') }, []) // eslint-disable-line

  // Scroll smooth su nuovi messaggi, solo se già vicino al fondo
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const isNearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 150
    if (isNearBottom) scrollToBottom('smooth')
  }, [messages, scrollToBottom])

  /* ── Supabase Realtime: solo messaggi degli ALTRI utenti ── */
  useEffect(() => {
    const supabase = createClient()

    const ch = supabase
      .channel(`run-chat-${runId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'run_chat',
        filter: `run_id=eq.${runId}`,
      }, async (payload) => {
        const newMsg = payload.new as { id: string; author_id: string }

        // Skip: i propri messaggi sono già stati aggiunti localmente (insert ottimistico)
        if (newMsg.author_id === userId) return

        const { data } = await supabase
          .from('run_chat')
          .select('*, author:profiles!run_chat_author_id_fkey(*)')
          .eq('id', newMsg.id)
          .single()

        if (data) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev
            return [...prev, data as RunChatMessage]
          })
        }
      })
      .on('postgres_changes', {
        event:  'DELETE',
        schema: 'public',
        table:  'run_chat',
        filter: `run_id=eq.${runId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [runId, userId])

  /* ── Invia messaggio — insert + aggiunta immediata locale ── */
  const handleSend = useCallback(async (body: string) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('run_chat')
      .insert({ run_id: runId, author_id: userId, body })
      .select('*, author:profiles!run_chat_author_id_fkey(*)')
      .single()

    if (error) throw error

    if (data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data as RunChatMessage]
      })
    }
  }, [runId, userId])

  /* ── Cancella messaggio ── */
  const handleDelete = async (id: string) => {
    // Rimozione ottimistica locale
    setMessages(prev => prev.filter(m => m.id !== id))
    const supabase = createClient()
    await supabase.from('run_chat').delete().eq('id', id)
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Sub-header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href={runDetailHref}
          className="p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700 shrink-0"
          aria-label="Torna alla corsa">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">chat_bubble</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{runTitle}</p>
            <p className="text-xs text-gray-400">{groupSize} runner nel gruppo</p>
          </div>
        </div>
      </div>

      {/* Messaggi */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 min-h-0">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary/40">chat_bubble</span>
            </div>
            <p className="text-sm font-semibold text-gray-500">Nessun messaggio ancora</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Sii il primo a scrivere! Coordinarsi, condividere il percorso o motivarsi — questa chat è vostra.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe             = msg.author_id === userId
          const prev             = messages[i - 1]
          const next             = messages[i + 1]
          const sameAuthorPrev   = prev && prev.author_id === msg.author_id && dayOf(prev.created_at) === dayOf(msg.created_at)
          const sameAuthorNext   = next && next.author_id === msg.author_id && dayOf(next.created_at) === dayOf(msg.created_at)
          const showDay          = !prev || dayOf(prev.created_at) !== dayOf(msg.created_at)
          const showAvatar       = !isMe && !sameAuthorNext
          const showName         = !isMe && !sameAuthorPrev

          return (
            <div key={msg.id}>
              {/* Separatore data */}
              {showDay && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] font-semibold text-gray-400 capitalize">
                    {formatSep(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              {/* Riga messaggio */}
              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${sameAuthorPrev ? 'mt-0.5' : 'mt-3'}`}>

                {/* Avatar — solo utenti altrui, solo all'ultimo del gruppo */}
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar && msg.author && (
                      <Link href={`/profilo/${msg.author_id}`}>
                        <Avatar name={msg.author.full_name} src={msg.author.avatar_url} size="sm" />
                      </Link>
                    )}
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>

                  {/* Nome — solo primo del gruppo, utenti altrui */}
                  {showName && msg.author && (
                    <Link href={`/profilo/${msg.author_id}`}
                      className="text-[11px] font-semibold text-gray-500 hover:text-primary transition-colors ml-1">
                      {msg.author.full_name}
                    </Link>
                  )}

                  {/* Bolla + orario + delete */}
                  <div className={`group relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-md'
                    }`}>
                      {msg.body}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                      {isMe && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          aria-label="Elimina messaggio"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  )
}
