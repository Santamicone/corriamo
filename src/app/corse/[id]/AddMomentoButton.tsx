'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Momento } from '@/lib/types'

const MAX_CHARS = 280
const MAX_MB    = 10

interface Props {
  runId:    string
  userId:   string
  existing: Momento | null
}

export function AddMomentoButton({ runId, userId, existing }: Props) {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [open,   setOpen]   = useState(false)
  const [body,   setBody]   = useState(existing?.body ?? '')
  const [file,   setFile]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(existing?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fileErr, setFileErr] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFileErr('')
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) { setFileErr(`Max ${MAX_MB} MB`); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const removePhoto = () => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }

  const handleSave = async () => {
    if (!body.trim() && !file && !preview) return
    setSaving(true)
    const supabase = createClient()
    let photo_url  = existing?.photo_url ?? null

    if (file) {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${runId}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('momenti').upload(path, file, { upsert: true, contentType: file.type })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('momenti').getPublicUrl(path)
        photo_url = `${publicUrl}?t=${Date.now()}`
      }
    } else if (!preview && existing?.photo_url) {
      // Photo removed by user
      photo_url = null
    }

    if (existing) {
      await supabase.from('momenti').update({ body: body.trim() || null, photo_url }).eq('id', existing.id)
    } else {
      await supabase.from('momenti').insert({ run_id: runId, author_id: userId, body: body.trim() || null, photo_url })
    }

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!existing) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('momenti').delete().eq('id', existing.id)
    setDeleting(false)
    setOpen(false)
    router.refresh()
  }

  /* ── Già pubblicato: mostra con opzione modifica ── */
  if (existing && !open) {
    return (
      <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-filled text-primary text-lg">photo_camera</span>
          <p className="text-sm font-semibold text-gray-800">Hai già pubblicato un momento</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">edit</span>
          Modifica
        </button>
      </div>
    )
  }

  /* ── Bottone iniziale ── */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-orange-200 text-primary font-semibold text-sm px-5 py-4 rounded-2xl hover:bg-orange-50 transition-colors"
      >
        <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
        Aggiungi il tuo momento
      </button>
    )
  }

  /* ── Form ── */
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-gray-900">
          {existing ? 'Modifica il tuo momento' : 'Il tuo momento'}
        </h3>
        <button onClick={() => { setOpen(false); setBody(existing?.body ?? ''); setPreview(existing?.photo_url ?? null); setFile(null) }}
          className="text-gray-400 hover:text-gray-600 transition-colors">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Foto */}
      <div>
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden bg-gray-100">
            <img src={preview} alt="Anteprima" className="w-full max-h-56 object-cover" />
            <button onClick={removePhoto}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-orange-50 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400">
            <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
            <span className="text-xs font-medium">Aggiungi foto (opzionale)</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile} className="hidden" />
        {fileErr && <p className="text-xs text-red-500 mt-1">{fileErr}</p>}
      </div>

      {/* Testo */}
      <div>
        <textarea
          value={body} onChange={e => setBody(e.target.value)}
          maxLength={MAX_CHARS} rows={3}
          placeholder="Racconta com'è andata, un pensiero, qualcosa di bello…"
          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <p className={`text-[11px] text-right mt-0.5 ${body.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
          {body.length}/{MAX_CHARS}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {existing && (
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
            {deleting ? 'Eliminazione…' : 'Elimina'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || (!body.trim() && !preview)}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-base">check</span>
          }
          {saving ? 'Salvataggio…' : existing ? 'Salva' : 'Pubblica momento'}
        </button>
      </div>
    </div>
  )
}
