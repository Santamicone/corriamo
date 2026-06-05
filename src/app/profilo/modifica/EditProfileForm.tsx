'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar, PRESET_OPTIONS } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const MAX_SIZE_MB = 5
const ACCEPTED    = 'image/jpeg,image/png,image/webp,image/gif'

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router    = useRouter()
  const fileRef   = useRef<HTMLInputElement>(null)

  /* ── Form campi testo ── */
  const [form, setForm] = useState({
    full_name:     profile.full_name,
    city:          profile.city           ?? '',
    level:         profile.level          ?? 'tutti',
    pace_min:      profile.pace_min?.toString() ?? '',
    pace_max:      profile.pace_max?.toString() ?? '',
    bio:           profile.bio            ?? '',
    strava_url:    profile.strava_url     ?? '',
    garmin_url:    profile.garmin_url     ?? '',
    instagram_url: profile.instagram_url  ?? '',
  })

  /* ── Avatar ── */
  // avatarChoice: 'keep' | 'preset:1' | 'preset:2' | 'preset:3' | 'file'
  const [avatarChoice, setAvatarChoice] = useState<string>('keep')
  const [filePreview,  setFilePreview]  = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError,    setFileError]    = useState('')

  /* ── UI state ── */
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const update = (f: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }))

  /* Anteprima dell'avatar attuale in base alla scelta */
  const previewSrc = (): string | null => {
    if (avatarChoice === 'keep') return profile.avatar_url
    if (avatarChoice === 'file') return filePreview
    return avatarChoice // 'preset:x'
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
    let avatar_url = profile.avatar_url   // default: mantieni l'esistente

    /* ── Upload foto ── */
    if (avatarChoice === 'file' && selectedFile) {
      const ext  = selectedFile.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, selectedFile, {
          upsert: true,
          contentType: selectedFile.type,
        })

      if (uploadErr) {
        setError('Errore nel caricamento della foto: ' + uploadErr.message)
        setLoading(false)
        return
      }

      // Aggiungi cache-busting per forzare il refresh del browser
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      avatar_url = `${publicUrl}?t=${Date.now()}`

    } else if (avatarChoice.startsWith('preset:')) {
      avatar_url = avatarChoice
    }
    // Se avatarChoice === 'keep', avatar_url rimane invariato

    /* ── Salva profilo ── */
    const { error: profileErr } = await supabase.from('profiles').update({
      full_name:     form.full_name,
      city:          form.city          || null,
      level:         form.level,
      pace_min:      form.pace_min      ? parseFloat(form.pace_min)  : null,
      pace_max:      form.pace_max      ? parseFloat(form.pace_max)  : null,
      bio:           form.bio           || null,
      strava_url:    form.strava_url    || null,
      garmin_url:    form.garmin_url    || null,
      instagram_url: form.instagram_url || null,
      avatar_url,
    }).eq('id', profile.id)

    if (profileErr) {
      setError('Errore nel salvataggio: ' + profileErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(true)
    setTimeout(() => { router.push(`/profilo/${profile.id}`); router.refresh() }, 900)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">

      {/* ── Sezione avatar ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Foto profilo</p>

        {/* Anteprima corrente */}
        <div className="flex items-center gap-5">
          <Avatar
            name={form.full_name || profile.full_name}
            src={previewSrc()}
            size="xl"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gray-900">
              {avatarChoice === 'keep'
                ? profile.avatar_url ? 'Foto attuale' : 'Iniziali (default)'
                : avatarChoice === 'file' ? 'Foto caricata'
                : `Icona ${PRESET_OPTIONS.find(p => p.id === avatarChoice)?.label ?? ''}`}
            </p>
            <p className="text-xs text-gray-400">
              Scegli un&apos;icona qui sotto oppure carica una foto.
            </p>
            {avatarChoice !== 'keep' && (
              <button
                type="button"
                onClick={() => { setAvatarChoice('keep'); setFilePreview(null); setSelectedFile(null) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors text-left mt-1"
              >
                ↩ Ripristina originale
              </button>
            )}
          </div>
        </div>

        {/* 3 icone preset */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Scegli un&apos;icona:</p>
          <div className="flex gap-3">
            {PRESET_OPTIONS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAvatarChoice(preset.id)}
                className={cn(
                  'relative rounded-full transition-all duration-150 focus:outline-none',
                  avatarChoice === preset.id
                    ? 'ring-2 ring-offset-2 ring-primary scale-110'
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                )}
                title={preset.label}
                aria-label={`Icona ${preset.label}`}
              >
                <Avatar name={form.full_name} src={preset.id} size="lg" />
                {avatarChoice === preset.id && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                    <span className="material-symbols-filled text-white text-xs">check</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Upload foto */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Oppure carica una foto:</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Carica foto profilo"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
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
          <p className="text-xs text-gray-400 mt-2">
            Formati accettati: JPG, PNG, WebP, GIF · Max {MAX_SIZE_MB} MB
          </p>
          {fileError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mt-2">{fileError}</p>
          )}
        </div>
      </div>

      {/* ── Informazioni runner ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Informazioni runner</p>
        <Input label="Nome e cognome" value={form.full_name} onChange={update('full_name')} required />
        <Input label="Città" value={form.city} onChange={update('city')} placeholder="Milano" />
        <Select label="Livello" value={form.level} onChange={update('level')}>
          <option value="tutti">Tutti i livelli</option>
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzato">Avanzato</option>
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Ritmo min (min/km)" type="number" step="0.1" value={form.pace_min} onChange={update('pace_min')} placeholder="es. 5.5" />
          <Input label="Ritmo max (min/km)" type="number" step="0.1" value={form.pace_max} onChange={update('pace_max')} placeholder="es. 6.5" />
        </div>
        <Textarea label="Bio" value={form.bio} onChange={update('bio')} placeholder="Racconta qualcosa di te..." rows={3} />
      </div>

      {/* ── Link social ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Link (opzionali)</p>
        <Input label="Profilo Strava" type="url" value={form.strava_url} onChange={update('strava_url')} placeholder="https://www.strava.com/athletes/..." />
        <Input label="Profilo Garmin" type="url" value={form.garmin_url} onChange={update('garmin_url')} placeholder="https://connect.garmin.com/..." />
        <Input label="Instagram" type="url" value={form.instagram_url} onChange={update('instagram_url')} placeholder="https://www.instagram.com/..." />
      </div>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-3 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-filled text-green-600">check_circle</span>
          Profilo aggiornato!
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{error}</p>
      )}

      <Button type="submit" loading={loading} size="lg">
        Salva modifiche
      </Button>
    </form>
  )
}
