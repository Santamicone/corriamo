'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, messageError } from './errors'
import type { Person } from './MessagesClient'

const MAX_RECIPIENTS = 50
const MAX_BODY = 2000

interface Props {
  crewId: string
  /** Destinatari possibili (membri attivi, escluso chi scrive). */
  recipients: Person[]
  /** Se valorizzato, il destinatario è fisso (risposta dentro un thread). */
  fixedRecipient?: Person | null
  /** Risposta di un membro: solo testo, tramite reply_crew_message. */
  reply?: boolean
  onSent: () => void
  onCancel?: () => void
}

/** Scrive un messaggio a uno o più membri, con un allegato facoltativo (immagine o PDF). */
export function ComposeForm({ crewId, recipients, fixedRecipient, reply, onSent, onCancel }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const allSelected = recipients.length > 0 && selected.length === recipients.length
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const pickFile = (f: File | null) => {
    setError('')
    if (!f) return setFile(null)
    if (!ATTACHMENT_TYPES.includes(f.type)) return setError('Puoi allegare solo immagini (JPEG, PNG, WebP) o PDF.')
    if (f.size > ATTACHMENT_MAX_BYTES) return setError('Il file supera i 10 MB.')
    setFile(f)
  }

  const send = async () => {
    const ids = fixedRecipient ? [fixedRecipient.id] : selected
    if (busy) return
    if (ids.length === 0) return setError('Scegli almeno un destinatario.')
    if (ids.length > MAX_RECIPIENTS) return setError(`Puoi scrivere al massimo a ${MAX_RECIPIENTS} persone per volta.`)
    if (!body.trim() && !(file && !reply)) return setError('Scrivi un messaggio o allega un file.')

    setBusy(true); setError(''); setInfo('')
    const supabase = createClient()
    const batchId = crypto.randomUUID()
    let path: string | null = null

    try {
      if (reply && fixedRecipient) {
        const { error: repErr } = await supabase.rpc('reply_crew_message', {
          p_crew_id: crewId, p_recipient_id: fixedRecipient.id, p_body: body,
        })
        if (repErr) throw repErr
        setBody('')
        onSent()
        return
      }

      if (file) {
        path = `${crewId}/${batchId}/${crypto.randomUUID()}`
        const { error: upErr } = await supabase.storage
          .from('crew-attachments')
          .upload(path, file, { contentType: file.type })
        if (upErr) { path = null; throw upErr }
      }

      const { data, error: rpcErr } = await supabase.rpc('send_crew_message', {
        p_crew_id: crewId,
        p_recipient_ids: ids,
        p_body: body,
        p_attachment_path: path,
        p_attachment_name: file ? file.name.slice(0, 120) : null,
        p_attachment_type: file ? file.type : null,
        p_batch_id: batchId,
      })
      if (rpcErr) {
        // L'invio non è riuscito: il file appena caricato non serve più
        if (path) await supabase.storage.from('crew-attachments').remove([path])
        throw rpcErr
      }

      const res = Array.isArray(data) ? data[0] : data
      if (res && res.skipped > 0) {
        setInfo(`Inviato a ${res.sent} ${res.sent === 1 ? 'persona' : 'persone'}.`)
      }
      setBody(''); setFile(null); setSelected([])
      onSent()
    } catch (e) {
      setError(messageError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      {!fixedRecipient && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">
              A chi scrivi {selected.length > 0 && <span className="text-gray-400 font-normal">· {selected.length}</span>}
            </p>
            <button type="button" className="text-xs font-semibold text-primary"
              onClick={() => setSelected(allSelected ? [] : recipients.map((r) => r.id))}>
              {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {recipients.length === 0 && <p className="p-3 text-sm text-gray-400">Non ci sono altri membri.</p>}
            {recipients.map((r) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                <Avatar name={r.name} src={r.avatarUrl} size="sm" />
                <span className="text-sm text-gray-800">{r.name}</span>
              </label>
            ))}
          </div>
          {selected.length > MAX_RECIPIENTS && (
            <p className="text-xs text-red-600 mt-1">Massimo {MAX_RECIPIENTS} destinatari per invio.</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Ognuno riceve il messaggio solo per sé e può risponderti in privato: non è una chat di gruppo.
          </p>
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
        rows={fixedRecipient ? 2 : 4}
        placeholder={fixedRecipient ? 'Scrivi una risposta…' : 'Scrivi il messaggio…'}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="flex flex-wrap items-center gap-3">
        {!reply && <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
          <span className="material-symbols-outlined text-base">attach_file</span>
          {file ? 'Cambia allegato' : 'Allega'}
          <input type="file" hidden accept={ATTACHMENT_TYPES.join(',')}
            onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </label>}
        {file && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full pl-3 pr-1 py-1 max-w-[16rem]">
            <span className="truncate">{file.name}</span>
            <button type="button" aria-label="Rimuovi allegato" onClick={() => setFile(null)}
              className="material-symbols-outlined text-sm text-gray-500 hover:text-red-600">close</button>
          </span>
        )}
        <span className="flex-1" />
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-3 py-1.5 rounded-full text-sm text-gray-500 hover:bg-gray-100">Annulla</button>
        )}
        <button type="button" onClick={send} disabled={busy}
          className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50">
          {busy ? 'Invio…' : 'Invia'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {info && <p className="text-xs text-gray-500">{info}</p>}
    </div>
  )
}
