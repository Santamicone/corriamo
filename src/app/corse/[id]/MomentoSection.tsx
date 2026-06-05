'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MomentoCard } from '@/components/MomentoCard'
import type { Momento } from '@/lib/types'

interface Props {
  runId: string
  userId: string | null
  canPost: boolean          // partecipante approvato o organizzatore, corsa passata
  existingMomento: Momento | null
  momenti: Momento[]
}

export function MomentoSection({ runId, userId, canPost, existingMomento, momenti }: Props) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showForm,   setShowForm]   = useState(!existingMomento && canPost && momenti.length === 0)
  const [body,       setBody]       = useState(existingMomento?.body ?? '')
  const [file,       setFile]       = useState<File | null>(null)
  const [preview,    setPreview]    = useState<string | null>(existingMomento?.photo_url ?? null)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState('')
  const [editing,    setEditing]    = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('Max 10 MB.'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    if (!body.trim() && !file && !preview) { setError('Aggiungi almeno una foto o un testo.'); return }
    if (!userId) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    let photoUrl = existingMomento?.photo_url ?? null

    if (file) {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${runId}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('momenti').upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) { setError('Errore upload foto: ' + uploadErr.message); setSaving(false); return }
      const { data: { publicUrl } } = supabase.storage.from('momenti').getPublicUrl(path)
      photoUrl = `${publicUrl}?t=${Date.now()}`
    }

    if (existingMomento) {
      await supabase.from('momenti').update({
        body: body.trim() || null,
        photo_url: photoUrl,
      }).eq('id', existingMomento.id)
    } else {
      await supabase.from('momenti').insert({
        run_id: runId, author_id: userId,
        body: body.trim() || null,
        photo_url: photoUrl,
      })
    }

    setSaving(false)
    setEditing(false)
    setShowForm(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!existingMomento) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('momenti').delete().eq('id', existingMomento.id)
    setDeleting(false)
    setEditing(false)
    setBody('')
    setFile(null)
    setPreview(null)
    router.refresh()
  }

  const isEditing = showForm || editing

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <span className="material-symbols-filled text-primary text-base">photo_camera</span>
          Momenti
          {momenti.length > 0 && (
            <span className="text-gray-300 font-normal">({momenti.length})</span>
          )}
        </h2>
        {canPost && !isEditing && !existingMomento && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
            Aggiungi il tuo Momento
          </button>
        )}
        {canPost && existingMomento && !isEditing && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">edit</span>
            Modifica
          </button>
        )}
      </div>

      {/* Form */}
      {isEditing && (
        <div className="flex flex-col gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
          <p className="text-sm font-bold text-gray-900">
            {existingMomento ? 'Modifica il tuo Momento' : 'Aggiungi un Momento'}
          </p>

          {/* Preview foto */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
                <span className="material-symbols-outlined text-sm text-gray-700">close</span>
              </button>
            </div>
          )}

          {/* Upload */}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 border border-orange-200 bg-white text-orange-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-colors self-start">
            <span className="material-symbols-outlined text-base">add_photo_alternate</span>
            {preview ? 'Cambia foto' : 'Aggiungi foto'}
          </button>

          {/* Testo */}
          <div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Raccontate com'è andata. Una riga basta."
              className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {body.length > 200 && (
              <p className="text-xs text-gray-400 text-right mt-1">{body.length}/300</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setShowForm(false); setError('') }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
              Annulla
            </button>
            {existingMomento && (
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2.5 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors bg-white disabled:opacity-60">
                {deleting ? '…' : 'Elimina'}
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60">
              {saving ? 'Salvataggio…' : existingMomento ? 'Salva' : 'Pubblica Momento'}
            </button>
          </div>
        </div>
      )}

      {/* Lista momenti */}
      {momenti.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {momenti.map(m => <MomentoCard key={m.id} momento={m} />)}
        </div>
      ) : !isEditing ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-gray-200 block mb-2">photo_camera</span>
          <p className="text-sm text-gray-400">
            {canPost ? 'Aggiungi il primo Momento di questa corsa.' : 'Nessun Momento ancora.'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
