'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import Link from 'next/link'
import type { Crew, CrewPinPrecision } from '@/lib/types'
import { slugify } from '@/lib/utils'
import { geocodeAddress, geocodeCity } from '@/lib/geocoding'

/** Come si presenta il pin: spiegazione per il proprietario (docs/MAPPA-CREW.md §4.2) */
const PIN_OPTIONS: { value: CrewPinPrecision; label: string; hint: string }[] = [
  { value: 'area',  label: 'Zona',   hint: 'Un punto entro circa 1 km dal ritrovo (consigliato)' },
  { value: 'city',  label: 'Città',  hint: 'Solo il centro della città' },
  { value: 'exact', label: 'Esatto', hint: 'Il punto di ritrovo' },
]

/** Link scritti a mano: aggiunge https:// e accetta @nome per Instagram. */
function normalizeUrl(raw: string, kind: 'web' | 'instagram'): string | null {
  const v = raw.trim()
  if (!v) return null
  if (kind === 'instagram' && v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

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
    // Mappa delle crew (SQL #49)
    show_on_map: false,
    city: '',
    zone: '',
    meeting_point: '',
    website_url: '',
    instagram_url: '',
    pin_precision: 'area' as CrewPinPrecision,
  })
  // Valori all'apertura della pagina: servono a capire se il pin va ricalcolato
  // false finché lo SQL #49 non è applicato: la sezione "Sulla mappa" resta nascosta e non si
  // scrive nessuna colonna nuova (altrimenti salvare la crew fallirebbe)
  const [mapSupported, setMapSupported] = useState(false)
  const initialMap = useRef<{ key: string; hasCoords: boolean } | null>(null)
  const mapKey = (f: { city: string; meeting_point: string; pin_precision: string }) =>
    `${f.city.trim().toLowerCase()}|${f.meeting_point.trim().toLowerCase()}|${f.pin_precision}`

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

      const loaded = {
        name: crew.name,
        slug: crew.slug ?? '',
        description: crew.description ?? '',
        visibility: crew.visibility,
        whatsapp_group_link: crew.whatsapp_group_link ?? '',
        cover_url: crew.cover_url ?? null,
        show_on_map: crew.show_on_map ?? false,
        city: crew.city ?? '',
        zone: crew.zone ?? '',
        meeting_point: crew.meeting_point ?? '',
        website_url: crew.website_url ?? '',
        instagram_url: crew.instagram_url ?? '',
        pin_precision: (crew.pin_precision ?? 'area') as CrewPinPrecision,
      }
      setForm(loaded)
      setMapSupported(crew.show_on_map !== undefined)
      initialMap.current = { key: mapKey(loaded), hasCoords: crew.lat != null && crew.lng != null }
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

    // ── Mappa: la crew compare solo se pubblica e con una posizione trovata ──
    const mapFields: Record<string, unknown> = {}
    if (mapSupported) {
      const city = form.city.trim()
      const showOnMap = form.show_on_map && form.visibility === 'public'

      if (showOnMap && !city) {
        setError('Per comparire sulla mappa serve la città.')
        setSaving(false)
        return
      }

      Object.assign(mapFields, {
        show_on_map: showOnMap,
        city: city || null,
        zone: form.zone.trim() || null,
        meeting_point: form.meeting_point.trim() || null,
        website_url: normalizeUrl(form.website_url, 'web'),
        instagram_url: normalizeUrl(form.instagram_url, 'instagram'),
        pin_precision: form.pin_precision,
      })

      // Si ricalcola il punto solo se serve: crew sulla mappa e dati cambiati (o mai calcolato)
      const changed = !initialMap.current || mapKey(form) !== initialMap.current.key || !initialMap.current.hasCoords
      if (showOnMap && changed) {
        const meeting = form.meeting_point.trim()
        const geo = form.pin_precision === 'city' || !meeting
          ? await geocodeCity(city)
          : await geocodeAddress(meeting, city)
        if (!geo) {
          setError('Non riesco a trovare la posizione: controlla la città e il ritrovo e riprova.')
          setSaving(false)
          return
        }
        // Il database arrotonda comunque in base alla precisione scelta: il punto esatto non viene salvato
        mapFields.lat = geo.lat
        mapFields.lng = geo.lng
      }
    }

    const { error: err } = await supabase
      .from('crews')
      .update({
        name: form.name,
        slug: cleanSlug,
        description: form.description || null,
        visibility: form.visibility,
        whatsapp_group_link: form.whatsapp_group_link || null,
        cover_url: form.cover_url || null,
        ...mapFields,
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
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[var(--color-primary)] animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-10 pb-20">
        <PageContainer width="form">
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
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL personalizzato
              </label>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
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
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:opacity-80 shrink-0"
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
                    style={form.visibility === v ? { borderColor: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' } : {}}
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

            {mapSupported && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Sulla mappa delle crew</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fai comparire la crew nella <Link href="/crew/mappa" className="text-primary hover:underline">mappa pubblica</Link>,
                    così chi cerca un gruppo vicino a sé ti trova. È una tua scelta e puoi toglierla quando vuoi.
                  </p>
                </div>

                <label className={`flex items-start gap-3 ${form.visibility === 'private' ? 'opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.show_on_map && form.visibility === 'public'}
                    disabled={form.visibility === 'private'}
                    onChange={(e) => setForm({ ...form, show_on_map: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">Mostra la crew sulla mappa</span>
                    <span className="block text-xs text-gray-500">
                      {form.visibility === 'private'
                        ? 'Disponibile solo per le crew pubbliche.'
                        : 'Compaiono il nome, il tipo, la città e il punto che scegli qui sotto.'}
                    </span>
                  </span>
                </label>

                {form.show_on_map && form.visibility === 'public' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Città <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="es. Perugia"
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Zona o provincia <span className="text-gray-400 font-normal">(opzionale)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={form.zone}
                          onChange={(e) => setForm({ ...form, zone: e.target.value })}
                          placeholder="es. PG"
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ritrovo <span className="text-gray-400 font-normal">(opzionale)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={form.meeting_point}
                        onChange={(e) => setForm({ ...form, meeting_point: e.target.value })}
                        placeholder="es. Parco Santa Margherita, ingresso principale"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-1">Precisione del punto</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PIN_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setForm({ ...form, pin_precision: o.value })}
                            style={form.pin_precision === o.value ? { borderColor: 'var(--color-primary)', backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' } : {}}
                            className={`border rounded-xl px-3 py-2.5 text-left transition-colors ${
                              form.pin_precision === o.value ? 'border-2' : 'border-gray-200 text-gray-600'
                            }`}
                          >
                            <span className="block text-sm font-semibold">{o.label}</span>
                            <span className="block text-[11px] text-gray-500 leading-snug">{o.hint}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        L’indirizzo esatto non viene mai salvato in modo più preciso di quello che scegli: con
                        “Zona” o “Città” il punto è sempre approssimato.
                      </p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sito web <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={form.website_url}
                      onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                      placeholder="www.lamiacrew.it"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={form.instagram_url}
                      onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                      placeholder="@lamiacrew"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Sito e Instagram compaiono sulla scheda della crew. Non pubblicare numeri di telefono o dati di altre persone.
                </p>
              </section>
            )}

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
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}
