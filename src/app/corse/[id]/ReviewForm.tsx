'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StarsInput, StarsDisplay } from '@/components/ui/Stars'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import type { Review } from '@/lib/types'

interface Props {
  runId: string
  reviewedId: string
  reviewedName: string
  reviewedAvatar: string | null
  reviewerId: string
  existingReview: Review | null
}

export function ReviewForm({
  runId, reviewedId, reviewedName, reviewedAvatar, reviewerId, existingReview
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(!existingReview)
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (rating === 0) { setError('Seleziona almeno una stella.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (existingReview && !editing) return

    const payload = {
      run_id: runId,
      reviewer_id: reviewerId,
      reviewed_id: reviewedId,
      rating,
      body: body.trim() || null,
    }

    if (existingReview) {
      await supabase.from('reviews').update({ rating, body: body.trim() || null }).eq('id', existingReview.id)
    } else {
      await supabase.from('reviews').insert(payload)
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!existingReview) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('reviews').delete().eq('id', existingReview.id)
    setSaving(false)
    setRating(0)
    setBody('')
    setEditing(true)
    router.refresh()
  }

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
      {/* Header sezione */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
          La tua recensione
        </h2>
        <div className="flex items-center gap-3 mt-3">
          <Avatar name={reviewedName} src={reviewedAvatar} size="sm" />
          <p className="text-sm font-semibold text-gray-900">
            Com&apos;è stato correre con <span className="text-primary">{reviewedName}</span>?
          </p>
        </div>
      </div>

      {/* Recensione esistente — vista */}
      {existingReview && !editing ? (
        <div className="flex flex-col gap-3">
          <StarsDisplay rating={existingReview.rating} size="lg" showLabel />
          {existingReview.body && (
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl px-4 py-3">
              &ldquo;{existingReview.body}&rdquo;
            </p>
          )}
          <p className="text-xs text-gray-400">
            Pubblicata il {formatDate(existingReview.created_at.split('T')[0])}
            {existingReview.updated_at !== existingReview.created_at && ' · modificata'}
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Modifica
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Elimina
            </button>
          </div>
        </div>
      ) : (
        /* Form di input */
        <div className="flex flex-col gap-4">
          <StarsInput value={rating} onChange={v => { setRating(v); setError('') }} />

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Puntuale, ritmo rispettato, percorso ben organizzato… (facoltativo)"
            maxLength={1000}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {body.length > 800 && (
            <p className="text-xs text-gray-400 -mt-2 text-right">{body.length}/1000</p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3">
            {existingReview && (
              <button
                onClick={() => { setEditing(false); setRating(existingReview.rating); setBody(existingReview.body ?? '') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || rating === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-base">star</span>
              }
              {existingReview ? 'Salva modifiche' : 'Pubblica recensione'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
