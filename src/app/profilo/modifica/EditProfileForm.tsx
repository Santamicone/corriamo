'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar, CHARACTER_PRESETS } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const MAX_SIZE_MB = 5
const ACCEPTED    = 'image/jpeg,image/png,image/webp,image/gif'

const inputCls = "h-11 w-full px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5"

function FormSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

const WHY_I_RUN_OPTIONS = [
  { value: 'forma',        label: 'Stare in forma',            icon: 'fitness_center' },
  { value: 'divertimento', label: 'Per divertimento',          icon: 'sentiment_very_satisfied' },
  { value: 'prestazioni',  label: 'Migliorare le prestazioni', icon: 'trending_up' },
  { value: 'amicizia',     label: 'Fare amicizia',             icon: 'group' },
  { value: 'benessere',    label: 'Benessere mentale',         icon: 'self_improvement' },
  { value: 'gare',         label: 'Partecipare a gare',        icon: 'emoji_events' },
  { value: 'sfida',        label: 'Sfidare me stesso/a',       icon: 'military_tech' },
]

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name:      profile.full_name,
    city:           profile.city           ?? '',
    level:          profile.level          ?? 'principiante',
    bio:            profile.bio            ?? '',
    strava_url:     profile.strava_url     ?? '',
    garmin_url:     profile.garmin_url     ?? '',
    instagram_url:  profile.instagram_url  ?? '',
    age:            profile.age?.toString() ?? '',
    pb_5k:          profile.pb_5k          ?? '',
    pb_10k:         profile.pb_10k         ?? '',
    pb_21k:         profile.pb_21k         ?? '',
    pb_42k:         profile.pb_42k         ?? '',
    filter_by_city: profile.filter_by_city ?? false,
  })
  const [whyIRun, setWhyIRun] = useState<string[]>(profile.why_i_run ?? [])

  /* ── Avatar ── */
  const [avatarChoice, setAvatarChoice] = useState<string>('keep')
  const [filePreview,  setFilePreview]  = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError,    setFileError]    = useState('')
  // Lightbox personaggio
  const [lightboxChar, setLightboxChar] = useState<typeof CHARACTER_PRESETS[0] | null>(null)

  /* ── UI ── */
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const update = (f: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }))

  const toggleWhy = (v: string) =>
    setWhyIRun(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const previewSrc = (): string | null => {
    if (avatarChoice === 'keep') return profile.avatar_url
    if (avatarChoice === 'file') return filePreview
    return avatarChoice
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileError('')
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`Il file supera il limite di ${MAX_SIZE_MB} MB.`)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
    setAvatarChoice('file')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    let avatar_url = profile.avatar_url

    if (avatarChoice === 'file' && selectedFile) {
      const ext  = selectedFile.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, selectedFile, { upsert: true, contentType: selectedFile.type })
      if (uploadErr) { setError('Errore caricamento foto: ' + uploadErr.message); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = `${publicUrl}?t=${Date.now()}`
    } else if (avatarChoice !== 'keep') {
      avatar_url = avatarChoice
    }

    const { error: profileErr } = await supabase.from('profiles').update({
      full_name:     form.full_name,
      city:          form.city          || null,
      level:         form.level,
      bio:           form.bio           || null,
      strava_url:    form.strava_url    || null,
      garmin_url:    form.garmin_url    || null,
      instagram_url: form.instagram_url || null,
      avatar_url,
      age:           form.age           ? parseInt(form.age)  : null,
      why_i_run:     whyIRun,
      pb_5k:         form.pb_5k         || null,
      pb_10k:        form.pb_10k        || null,
      pb_21k:        form.pb_21k        || null,
      pb_42k:        form.pb_42k        || null,
      filter_by_city: form.filter_by_city,
    }).eq('id', profile.id)

    if (profileErr) { setError('Errore nel salvataggio: ' + profileErr.message); setLoading(false); return }
    setLoading(false)
    setSuccess(true)
    setTimeout(() => { router.push(`/profilo/${profile.id}`); router.refresh() }, 900)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">

      {/* ── Foto profilo ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-5">
        <p className={labelCls}>Foto profilo</p>

        {/* Anteprima corrente */}
        <div className="flex items-center gap-5">
          <Avatar name={form.full_name || profile.full_name} src={previewSrc()} size="xl" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gray-900">
              {avatarChoice === 'keep'
                ? (profile.avatar_url ? 'Foto attuale' : 'Iniziali (default)')
                : avatarChoice === 'file' ? 'Foto caricata'
                : `Personaggio ${avatarChoice.split(':')[1]}`}
            </p>
            <p className="text-xs text-gray-400">Scegli un personaggio o carica una tua foto.</p>
            {avatarChoice !== 'keep' && (
              <button type="button"
                onClick={() => { setAvatarChoice('keep'); setFilePreview(null); setSelectedFile(null) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors text-left mt-1">
                ↩ Ripristina originale
              </button>
            )}
          </div>
        </div>

        {/* Personaggi illustrati — griglia con anteprima ingrandita */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Scegli un personaggio:</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {CHARACTER_PRESETS.map(preset => {
              const active = avatarChoice === preset.id
              return (
                <div key={preset.id} className="relative group aspect-square">
                  {/* Thumbnail — click per selezionare */}
                  <button
                    type="button"
                    onClick={() => setAvatarChoice(preset.id)}
                    className={cn(
                      'w-full h-full rounded-2xl overflow-hidden transition-all duration-150 focus:outline-none border-2',
                      active
                        ? 'border-primary ring-2 ring-primary ring-offset-1 scale-105'
                        : 'border-gray-100 hover:border-primary/40 opacity-80 hover:opacity-100'
                    )}
                    aria-label={`Seleziona ${preset.label}`}
                  >
                    <img src={preset.src} alt={preset.label} className="w-full h-full object-cover" />
                  </button>

                  {/* Spunta selezione */}
                  {active && (
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border border-white pointer-events-none">
                      <span className="material-symbols-filled text-white text-[11px]">check</span>
                    </span>
                  )}

                  {/* Pulsante zoom — appare sull'hover */}
                  <button
                    type="button"
                    onClick={() => setLightboxChar(preset)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                    aria-label={`Ingrandisci ${preset.label}`}
                    title="Vedi in grande"
                  >
                    <span className="material-symbols-outlined text-white text-sm">zoom_in</span>
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Clicca su un personaggio per selezionarlo · Passa sopra e clicca <span className="material-symbols-outlined text-[11px] align-middle">zoom_in</span> per vederlo in grande.
          </p>
        </div>

        {/* ── Lightbox personaggio ── */}
        {lightboxChar && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setLightboxChar(null)}
          >
            <div
              className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Immagine ingrandita */}
              <img
                src={lightboxChar.src}
                alt={lightboxChar.label}
                className="w-full object-cover"
              />

              {/* Azioni */}
              <div className="p-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setAvatarChoice(lightboxChar.id); setLightboxChar(null) }}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-colors',
                    avatarChoice === lightboxChar.id
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  )}
                >
                  <span className="material-symbols-outlined text-base">
                    {avatarChoice === lightboxChar.id ? 'check_circle' : 'person'}
                  </span>
                  {avatarChoice === lightboxChar.id ? 'Già selezionato' : 'Scegli questo personaggio'}
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxChar(null)}
                  className="w-full px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Chiudi
                </button>
              </div>

              {/* X in alto a destra */}
              <button
                type="button"
                onClick={() => setLightboxChar(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors"
                aria-label="Chiudi anteprima"
              >
                <span className="material-symbols-outlined text-white text-base">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload foto */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">O carica una tua foto:</p>
          <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFileChange} className="hidden" />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">upload</span>
              {selectedFile ? 'Cambia foto' : 'Scegli file'}
            </button>
            {selectedFile && (
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                {selectedFile.name}
                <span className="text-gray-400 text-xs">({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP, GIF · Max {MAX_SIZE_MB} MB</p>
          {fileError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mt-2">{fileError}</p>}
        </div>
      </div>

      {/* ── Informazioni base ── */}
      <FormSection title="Informazioni base">
        <Input label="Nome e cognome" value={form.full_name} onChange={update('full_name')} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Città" value={form.city} onChange={update('city')} placeholder="Milano" />
          <div>
            <label className={labelCls}>Età</label>
            <input className={inputCls} type="number" min="10" max="100"
              value={form.age} onChange={update('age')} placeholder="es. 35" />
          </div>
        </div>
        {/* Filtro bacheca per città */}
        <label className={cn(
          'flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all',
          form.filter_by_city ? 'bg-orange-50 border-orange-200' : 'border-gray-100 hover:bg-gray-50'
        )}>
          <input
            type="checkbox"
            checked={form.filter_by_city}
            disabled={!form.city}
            onChange={e => setForm(p => ({ ...p, filter_by_city: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
          />
          <div>
            <span className={cn('text-sm font-semibold', form.city ? 'text-gray-900' : 'text-gray-400')}>
              Mostra solo le corse della mia città in bacheca
            </span>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {!form.city
                ? 'Inserisci prima la tua città per abilitare questa opzione.'
                : form.filter_by_city
                  ? `In bacheca vedrai automaticamente solo le corse a ${form.city}. Potrai comunque rimuovere il filtro manualmente.`
                  : 'Vuoi visualizzare solo le corse nella tua città? Potrai comunque rimuovere il filtro manualmente dalla bacheca.'}
            </p>
          </div>
        </label>

        <Select label="Livello" value={form.level} onChange={update('level')}>
          <option value="principiante">Principiante — sto iniziando</option>
          <option value="intermedio">Intermedio — corro regolarmente</option>
          <option value="avanzato">Avanzato — corro forte</option>
          <option value="amatore_gare">Amatore, ma faccio gare</option>
          <option value="atleta">Atleta agonista</option>
        </Select>
        <Textarea label="Bio" value={form.bio} onChange={update('bio')}
          placeholder="Racconta qualcosa di te come runner: dove corri di solito, cosa ti piace, il tuo obiettivo..." rows={3} />
      </FormSection>

      {/* ── Perché corri ── */}
      <FormSection title="Perché corri?" desc="Seleziona tutto quello che ti rappresenta (opzionale).">
        <div className="flex flex-wrap gap-2">
          {WHY_I_RUN_OPTIONS.map(opt => {
            const active = whyIRun.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleWhy(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all',
                  active
                    ? 'bg-primary text-white border-primary shadow-sm shadow-orange-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                )}
              >
                <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                {opt.label}
              </button>
            )
          })}
        </div>
      </FormSection>

      {/* ── Personal Best ── */}
      <FormSection title="I tuoi Personal Best" desc="Tempi migliori di gara (opzionale — aiuta gli altri a capire il tuo livello).">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>5 km</label>
            <input className={inputCls} value={form.pb_5k} onChange={update('pb_5k')} placeholder="es. 23:45 o sub-25" />
          </div>
          <div>
            <label className={labelCls}>10 km</label>
            <input className={inputCls} value={form.pb_10k} onChange={update('pb_10k')} placeholder="es. 50:20 o sub-55" />
          </div>
          <div>
            <label className={labelCls}>Mezza maratona</label>
            <input className={inputCls} value={form.pb_21k} onChange={update('pb_21k')} placeholder="es. 1:52:00" />
          </div>
          <div>
            <label className={labelCls}>Maratona</label>
            <input className={inputCls} value={form.pb_42k} onChange={update('pb_42k')} placeholder="es. 4:05:30 o sub-4h" />
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-1">
          Scrivi liberamente: &quot;23:45&quot;, &quot;sub-25 min&quot;, &quot;non ancora partecipato&quot;…
        </p>
      </FormSection>

      {/* ── Link social ── */}
      <FormSection title="Link (opzionali)">
        <Input label="Profilo Strava" type="url" value={form.strava_url} onChange={update('strava_url')} placeholder="https://www.strava.com/athletes/..." />
        <Input label="Profilo Garmin" type="url" value={form.garmin_url} onChange={update('garmin_url')} placeholder="https://connect.garmin.com/..." />
        <Input label="Instagram" type="url" value={form.instagram_url} onChange={update('instagram_url')} placeholder="https://www.instagram.com/..." />
      </FormSection>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-3 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-filled text-green-600">check_circle</span>
          Profilo aggiornato!
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{error}</p>
      )}

      <Button type="submit" loading={loading} size="lg">Salva modifiche</Button>
    </form>
  )
}
