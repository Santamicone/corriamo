'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithAuth } from '@/lib/supabase/realtime'
import { Avatar } from '@/components/ui/Avatar'
import { ReportButton } from '@/components/ReportButton'
import { ComposeForm } from './ComposeForm'
import { messageError } from './errors'

export interface Person {
  id: string
  name: string
  avatarUrl: string | null
  isManager: boolean
}

interface DirectMessage {
  id: string
  crew_id: string
  batch_id: string
  sender_id: string
  recipient_id: string
  body: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_type: string | null
  created_at: string
  read_at: string | null
  deleted_at: string | null
}

interface Props {
  crewId: string
  crewName: string
  crewHref: string
  userId: string
  isManager: boolean
  people: Person[]
  initialWith: string | null
}

const UNKNOWN: Person = { id: '', name: 'Ex membro', avatarUrl: null, isManager: false }

export function MessagesClient({ crewId, crewName, crewHref, userId, isManager, people, initialWith }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<string | null>(initialWith)
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const person = useCallback((id: string): Person => personById.get(id) ?? { ...UNKNOWN, id }, [personById])
  const otherOf = useCallback((m: DirectMessage) => (m.sender_id === userId ? m.recipient_id : m.sender_id), [userId])

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('crew_direct_messages')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: true })
      .limit(1000)
    if (err) setError('Non riesco a caricare i messaggi.')
    else setMessages((data ?? []) as DirectMessage[])
    setLoaded(true)
  }, [supabase, crewId])

  useEffect(() => { load() }, [load])

  // Tempo reale: messaggi in arrivo o modificati (letto, eliminato)
  useEffect(() => {
    const upsert = (row: DirectMessage) => {
      if (row.crew_id !== crewId) return
      setMessages((prev) => {
        const i = prev.findIndex((m) => m.id === row.id)
        if (i === -1) return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at))
        const next = [...prev]
        next[i] = row
        return next
      })
    }
    return subscribeWithAuth(supabase, () =>
      supabase
        .channel(`crew-dm-${crewId}-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_direct_messages', filter: `recipient_id=eq.${userId}` },
          (p) => { if (p.eventType !== 'DELETE') upsert(p.new as DirectMessage) })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_direct_messages', filter: `sender_id=eq.${userId}` },
          (p) => { if (p.eventType !== 'DELETE') upsert(p.new as DirectMessage) }),
    )
  }, [supabase, crewId, userId])

  // Conversazioni: una per persona, la più recente in alto
  const threads = useMemo(() => {
    const map = new Map<string, DirectMessage[]>()
    for (const m of messages) {
      const k = otherOf(m)
      map.set(k, [...(map.get(k) ?? []), m])
    }
    return [...map.entries()]
      .map(([otherId, list]) => ({
        otherId,
        list,
        last: list[list.length - 1],
        unread: list.filter((m) => m.recipient_id === userId && !m.read_at && !m.deleted_at).length,
      }))
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at))
  }, [messages, otherOf, userId])

  // Un membro con una sola conversazione la vede subito
  useEffect(() => {
    if (!active && !isManager && threads.length === 1) setActive(threads[0].otherId)
  }, [active, isManager, threads])

  const activeThread = threads.find((t) => t.otherId === active) ?? null
  const activeUnread = activeThread?.unread ?? 0

  // Segna come letti i messaggi della conversazione aperta
  useEffect(() => {
    if (!active || activeUnread === 0) return
    supabase.rpc('mark_crew_messages_read', { p_crew_id: crewId, p_other_id: active }).then(({ error: err }) => {
      if (!err) {
        const now = new Date().toISOString()
        setMessages((prev) => prev.map((m) =>
          m.sender_id === active && m.recipient_id === userId && !m.read_at ? { ...m, read_at: now } : m))
      }
    })
  }, [supabase, crewId, userId, active, activeUnread])

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [activeThread?.list.length, active])

  const remove = async (m: DirectMessage) => {
    if (!window.confirm('Eliminare questo messaggio? Resterà la dicitura "Messaggio eliminato".')) return
    const { error: err } = await supabase.rpc('delete_crew_direct_message', { p_message_id: m.id })
    if (err) return setError(messageError(err))
    setMessages((prev) => prev.map((x) => x.id === m.id
      ? { ...x, body: 'Messaggio eliminato', deleted_at: new Date().toISOString(), attachment_path: null, attachment_name: null, attachment_type: null }
      : x))
  }

  const openAttachment = async (m: DirectMessage) => {
    if (!m.attachment_path) return
    const { data, error: err } = await supabase.storage.from('crew-attachments').createSignedUrl(m.attachment_path, 120)
    if (err || !data) return setError('Non riesco ad aprire l’allegato.')
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const recipients = people.filter((p) => p.id !== userId)
  const showList = !active && !composing
  const activePerson = active ? person(active) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <Link href={crewHref} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1">
          <span className="material-symbols-outlined text-base">arrow_back</span>{crewName}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            {isManager ? 'Messaggi ai membri' : 'Messaggi dal gestore'}
          </h1>
          {isManager && !composing && (
            <button onClick={() => { setComposing(true); setActive(null) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary-hover">
              <span className="material-symbols-outlined text-base">edit</span>Nuovo messaggio
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">
          {error} <button className="underline ml-1" onClick={() => setError('')}>Chiudi</button>
        </p>
      )}

      {composing && (
        <ComposeForm crewId={crewId} recipients={recipients}
          onSent={() => { setComposing(false); load() }} onCancel={() => setComposing(false)} />
      )}

      {showList && (
        loaded && threads.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">mail</span>
            <p className="text-sm font-semibold text-gray-700">Nessun messaggio</p>
            <p className="text-xs text-gray-400 mt-1">
              {isManager ? 'Scrivi ai membri con “Nuovo messaggio”.' : 'Qui compariranno i messaggi privati di chi gestisce la crew.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden">
            {threads.map((t) => {
              const p = person(t.otherId)
              return (
                <button key={t.otherId} onClick={() => setActive(t.otherId)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                  <Avatar name={p.name} src={p.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className={`text-xs truncate ${t.unread ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                      {t.last.sender_id === userId ? 'Tu: ' : ''}
                      {t.last.body || (t.last.attachment_name ? `📎 ${t.last.attachment_name}` : '')}
                    </p>
                  </div>
                  {t.unread > 0 && (
                    <span className="bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{t.unread}</span>
                  )}
                </button>
              )
            })}
          </div>
        )
      )}

      {active && activePerson && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {(isManager || threads.length > 1) && (
              <button onClick={() => setActive(null)} aria-label="Tutte le conversazioni"
                className="material-symbols-outlined text-gray-500 hover:text-gray-800">arrow_back</button>
            )}
            <Avatar name={activePerson.name} src={activePerson.avatarUrl} size="sm" />
            <p className="font-semibold text-gray-900">{activePerson.name}</p>
          </div>

          <div className="space-y-2">
            {(activeThread?.list ?? []).map((m) => {
              const mine = m.sender_id === userId
              const deleted = !!m.deleted_at
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-primary text-white' : 'bg-white border border-gray-100 text-gray-900'}`}>
                    {deleted ? (
                      <p className="text-sm italic opacity-70">Messaggio eliminato</p>
                    ) : (
                      <>
                        {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                        {m.attachment_path && (
                          <button onClick={() => openAttachment(m)}
                            className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold underline ${mine ? 'text-white' : 'text-primary'}`}>
                            <span className="material-symbols-outlined text-sm">
                              {m.attachment_type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                            </span>
                            {m.attachment_name ?? 'Allegato'}
                          </button>
                        )}
                      </>
                    )}
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                      <span>{format(parseISO(m.created_at), 'd MMM, HH:mm', { locale: it })}</span>
                      {mine && !deleted && (
                        <>
                          {m.read_at && <span>Letto</span>}
                          <button onClick={() => remove(m)} className="hover:underline">Elimina</button>
                        </>
                      )}
                      {!mine && !deleted && (
                        <ReportButton entityTable="crew_direct_messages" entityId={m.id} reportedUserId={m.sender_id}
                          context={m.body || m.attachment_name || undefined} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <ComposeForm crewId={crewId} recipients={[]} fixedRecipient={activePerson}
            reply={!isManager} onSent={load} />
        </div>
      )}
    </div>
  )
}
