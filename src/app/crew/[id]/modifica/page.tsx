'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Link from 'next/link'
import type { Crew } from '@/lib/types'
import { slugify } from '@/lib/utils'

export default function ModificaCrewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    whatsapp_group_link: '',
    cover_url: '' as string | null,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: crew, error: err } = await supabase
        .from('crews')
        .select('*')
        .eq('id', id)
        .single() as { data: Crew | null; error: unknown }

      if (err || !crew) { router.push(`/crew/${id}`); return }
      if (crew.owner_id !== user.id) { router.push(`/crew/${id}`); return }

      setForm({
        name: crew.name,
        slug: crew.slug ?? '',
        description: crew.description ?? '',
        visibility: crew.visibility,
        whatsapp_group_link: crew.whatsapp_group_link ?? '',
        cover_url: crew.cover_url ?? null,
      })
      setLoading(false)
    }
    load()
  }, [id])

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${id}/cover-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('crew-covers')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: pub } = supabase.storage.from('crew-covers').getPublicUrl(path)
    setForm((f) => ({ ...f, cover_url: pub.publicUrl }))
    setUploading(false)
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard non disponibile: ignora
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const cleanSlug = slugify(form.slug || form.name)
    if (!cleanSlug) { setError('URL non valido'); setSaving(false); return }

    const { error: err } = await supabase
      .from('crews')
      .update({
        name: form.name,
        slug: cleanSlug,
        description: form.description || null,
        visibility: form.visibility,
        whatsapp_group_link: form.whatsapp_group_link || null,
        cover_url: form.cover_url || null,
      })
      .eq('id', id)

    setSaving(false)
    if (err) {
      setError(
        err.code === '23505'
          ? 'Questo URL è già usato da un\'altra crew. Scegline un altro.'
          : err.message
      )
      return
    }
    router.push(`/crew/${id}/gestisci`)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[var(--color-brand)] animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-10 pb-20 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            href={`/crew/${id}/gestisci`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Gestisci crew
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-8">Modifica crew</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome della crew <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL personalizzato
              </label>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-brand)]">
                <span className="text-sm text-gray-400 pl-4 pr-1 py-2.5 select-none whitespace-nowrap">/crew/</span>
                <input
                  type="text"
                  maxLength={60}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug || f.name) }))}
                  placeholder="milano-trail-crew"
                  className="flex-1 min-w-0 px-1 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Solo lettere minuscole, numeri e trattini. Il vecchio indirizzo continuerà a funzionare.
              </p>

              {(() => {
                const finalSlug = slugify(form.slug || form.name)
                if (!finalSlug) return null
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                const fullUrl = `${origin}/crew/${finalSlug}`
                return (
                  <div className="flex items-center gap-2 mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-base text-gray-400">link</span>
                    <span className="flex-1 min-w-0 text-sm text-gray-600 truncate" title={fullUrl}>
                      {fullUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(fullUrl)}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:opacity-80 shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                      {copied ? 'Copiato' : 'Copia'}
                    </button>
                  </div>
                )
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Chi siete, dove correte, che ritmo tenete..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Immagine di testata
                <span className="text-gray-400 font-normal ml-1">(opzionale)</span>
              </label>
              {form.cover_url && (
                <div className="rounded-xl overflow-hidden aspect-[16/6] bg-gray-100 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover_url} alt="Anteprima testata" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <span className="material-symbols-outlined text-base">upload</span>
                  {uploading ? 'Caricamento…' : form.cover_url ? 'Cambia immagine' : 'Carica immagine'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {form.cover_url && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, cover_url: null })}
                    className="text-sm text-gray-400 hover:text-red-500"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Formato consigliato panoramico (16:6). JPG, PNG o WebP, max 5 MB.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibilità
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['public', 'private'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: v })}
                    style={form.visibility === v ? { borderColor: 'var(--color-brand)', backgroundColor: 'color-mix(in srgb, var(--color-brand) 5%, transparent)' } : {}}
                    className={`border rounded-xl px-4 py-3 text-sm text-left transition-colors ${
                      form.visibility === v ? 'border-2' : 'border border-gray-200 text-gray-600'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">{v === 'public' ? 'Pubblica' : 'Privata'}</div>
                    <div className="text-xs text-gray-500">
                      {v === 'public' ? 'Visibile a tutti, chiunque può chiedere di entrare' : 'Solo tramite link invito'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link gruppo WhatsApp
                <span className="text-gray-400 font-normal ml-1">(opzionale)</span>
              </label>
              <input
                type="url"
                value={form.whatsapp_group_link}
                onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ti permette di avvisare il gruppo con un tap quando crei una corsa riservata.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
