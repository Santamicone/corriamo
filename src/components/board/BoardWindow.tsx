'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithAuth } from '@/lib/supabase/realtime'
import { Avatar } from '@/components/ui/Avatar'
import { BoardComposer } from './BoardComposer'
import type { Profile } from '@/lib/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'

/** Forma comune di run_chat e crew_chat (strutturalmente identiche). */
export interface BoardMessage {
  id: string
  author_id: string
  author?: Profile | null
  body: string
  created_at: string
  /** SQL #54: messaggio eliminato (il database ha già sostituito il testo originale). */
  deleted_at?: string | null
}

export interface BoardConfig {
  /** Tabella Supabase: 'run_chat' | 'crew_chat'. */
  table: string
  /** RPC di eliminazione (SQL #54): la riga resta e diventa "Messaggio eliminato". */
  deleteRpc: 'delete_run_chat_message' | 'delete_crew_chat_message'
  /** Colonna di scope: 'run_id' | 'crew_id'. */
  scopeColumn: string
  /** Select con join autore, es. '*, author:profiles!run_chat_author_id_fkey(*)'. */
  authorSelect: string
  /** Prefisso del canale Realtime. */
  channelPrefix: string
}

interface Props {
  scopeId:         string
  userId:          string
  title:           string
  subtitle:        string
  backHref:        string
  backLabel:       string
  headerIcon:      string
  emptyText:       string
  placeholder?:    string
  initialMessages: BoardMessage[]
  canModerate:     boolean
  config:          BoardConfig
  /** Se presente, salva in localStorage l'ultimo messaggio letto (segnale "nuovi messaggi"). */
  seenStorageKey?: string
}

/** Data + ora esplicite: "oggi alle 14:32", "ieri alle 09:10", "12 lug alle 18:00". */
function formatWhen(iso: string): string {
  const d = parseISO(iso)
  const time = format(d, 'HH:mm')
  if (isToday(d))     return `oggi alle ${time}`
  if (isYesterday(d)) return `ieri alle ${time}`
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const day = format(d, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: it })
  return `${day} alle ${time}`
}

/** Stato locale di un messaggio eliminato (il database fa lo stesso). */
function markDeleted(msg: BoardMessage): BoardMessage {
  return { ...msg, body: 'Messaggio eliminato', deleted_at: msg.deleted_at ?? new Date().toISOString() }
}

const URL_RE = /(https?:\/\/[^\s]+)/g

/** Trasforma le URL http/https del testo in link cliccabili (client-side, nessun DB). */
function linkify(text: string): React.ReactNode[] {
  return text.split(URL_RE).map((part, i) => {
    if (!/^https?:\/\//.test(part)) return part
    // Separa eventuale punteggiatura finale dalla URL
    const m = part.match(/^(.*?)([.,;:!?)\]]*)$/)
    const url  = m ? m[1] : part
    const tail = m ? m[2] : ''
    return (
      <span key={i}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="font-medium text-primary underline break-all">
          {url}
        </a>
        {tail}
      </span>
    )
  })
}

export function BoardWindow({
  scopeId, userId, title, subtitle, backHref, backLabel, headerIcon,
  emptyText, placeholder, initialMessages, canModerate, config, seenStorageKey,
}: Props) {
  // Stato mantenuto con i più recenti in testa.
  const [messages, setMessages] = useState<BoardMessage[]>(initialMessages)
  const [deleteError, setDeleteError] = useState('')

  const prepend = useCallback((msg: BoardMessage) => {
    setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [msg, ...prev]))
  }, [])

  // Segna come "letto" fino all'ultimo messaggio noto (messages[0] = più recente),
  // così il pallino "nuovi messaggi" sul link della bacheca si spegne.
  useEffect(() => {
    if (!seenStorageKey || messages.length === 0) return
    try { localStorage.setItem(seenStorageKey, messages[0].created_at) } catch { /* storage non disponibile */ }
  }, [seenStorageKey, messages])

  /* ── Supabase Realtime: solo i post degli ALTRI utenti ── */
  useEffect(() => {
    const supabase = createClient()

    return subscribeWithAuth(supabase, () => supabase
      .channel(`${config.channelPrefix}-${scopeId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  config.table,
        filter: `${config.scopeColumn}=eq.${scopeId}`,
      }, async (payload) => {
        const newMsg = payload.new as { id: string; author_id: string }
        if (newMsg.author_id === userId) return // già aggiunto localmente

        const { data } = await supabase
          .from(config.table)
          .select(config.authorSelect)
          .eq('id', newMsg.id)
          .single()

        if (data) prepend(data as unknown as BoardMessage)
      })
      .on('postgres_changes', {
        event:  'DELETE',
        schema: 'public',
        table:  config.table,
        filter: `${config.scopeColumn}=eq.${scopeId}`,
      }, (payload) => {
        // DELETE fisico: lo fanno ancora le app 1.0.x/1.1.x
        setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id))
      })
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  config.table,
        filter: `${config.scopeColumn}=eq.${scopeId}`,
      }, (payload) => {
        const row = payload.new as { id: string; deleted_at?: string | null }
        if (!row.deleted_at) return
        setMessages(prev => prev.map(m => (m.id === row.id ? markDeleted({ ...m, deleted_at: row.deleted_at }) : m)))
      }))
  }, [scopeId, userId, config, prepend])

  /* ── Pubblica — insert + aggiunta immediata in cima ── */
  const handleSend = useCallback(async (body: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from(config.table)
      .insert({ [config.scopeColumn]: scopeId, author_id: userId, body })
      .select(config.authorSelect)
      .single()

    if (error) throw error
    if (data) prepend(data as unknown as BoardMessage)
  }, [scopeId, userId, config, prepend])

  /* ── Elimina post (autore o moderatore) ── */
  const handleDelete = async (msg: BoardMessage) => {
    if (!window.confirm('Eliminare il messaggio? Per tutti nella bacheca comparirà "Messaggio eliminato".')) return

    setDeleteError('')
    setMessages(prev => prev.map(m => (m.id === msg.id ? markDeleted(m) : m))) // aggiornamento ottimistico
    const supabase = createClient()
    const { error } = await supabase.rpc(config.deleteRpc, { p_message_id: msg.id })
    if (error) {
      console.error(error)
      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)))
      setDeleteError('Non è stato possibile eliminare il messaggio. Riprova.')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Sub-header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href={backHref}
          className="p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-700 shrink-0"
          aria-label={backLabel}>
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">{headerIcon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{title}</p>
            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Composer in alto */}
      <BoardComposer onSend={handleSend} placeholder={placeholder} />

      {deleteError && (
        <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-600">{deleteError}</p>
      )}

      {/* Post — più recenti in cima */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 bg-gray-50/50">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary/40">{headerIcon}</span>
            </div>
            <p className="text-sm font-semibold text-gray-500">Nessun messaggio ancora</p>
            <p className="text-xs text-gray-400 max-w-xs">{emptyText}</p>
          </div>
        )}

        {messages.map((msg) => {
          const isDeleted = !!msg.deleted_at
          const canDelete = !isDeleted && (msg.author_id === userId || canModerate)
          return (
            <article key={msg.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {msg.author ? (
                  <Link href={`/profilo/${msg.author_id}`} className="shrink-0">
                    <Avatar name={msg.author.full_name} src={msg.author.avatar_url} size="sm" />
                  </Link>
                ) : (
                  <Avatar name="?" src={null} size="sm" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {msg.author && (
                      <Link href={`/profilo/${msg.author_id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors">
                        {msg.author.full_name}
                      </Link>
                    )}
                    <span className="text-xs text-gray-400">· {formatWhen(msg.created_at)}</span>
                  </div>
                  {isDeleted ? (
                    <p className="flex items-center gap-1.5 text-sm italic text-gray-400 mt-1">
                      <span className="material-symbols-outlined text-base not-italic" aria-hidden="true">block</span>
                      {/* Testo neutro: non sappiamo chi l'ha eliminato (autore, organizzatore o gestore) */}
                      Messaggio eliminato
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                      {linkify(msg.body)}
                    </p>
                  )}
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(msg)}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Elimina messaggio"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
