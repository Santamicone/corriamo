'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { CrewType } from '@/lib/types'

const CREW_TYPE_ICONS: Record<CrewType, string> = {
  training_group: 'fitness_center',
  running_club: 'groups',
  friends: 'favorite',
}

export default function NuovaCrewPage() {
  const router = useRouter()
  const [step, setStep] = useState<'tipo' | 'form'>('tipo')
  const [crewType, setCrewType] = useState<CrewType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    whatsapp_group_link: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!crewType) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/crew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, crew_type: crewType }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante la creazione')
      setLoading(false)
      return
    }

    router.push(`/crew/${data.id}/gestisci`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-10 pb-20 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Crea la tua crew</h1>
          <p className="text-gray-500 mb-8 text-sm">
            Una crew è il tuo gruppo permanente di runner — per corse riservate e coordinamento facile.
          </p>

          {step === 'tipo' && (
            <div className="space-y-3">
              {(Object.keys(CREW_TYPE_LABELS) as CrewType[]).map((type) => {
                const info = CREW_TYPE_LABELS[type]
                return (
                  <button
                    key={type}
                    onClick={() => { setCrewType(type); setStep('form') }}
                    className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-[var(--color-brand)] transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-[var(--color-brand)] mt-0.5">
                        {CREW_TYPE_ICONS[type]}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">{info.name}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{info.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Ruolo principale: <span className="font-medium">{info.ownerLabel}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {step === 'form' && crewType && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <button
                type="button"
                onClick={() => setStep('tipo')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Cambia tipo
              </button>

              <div className="bg-[var(--color-brand)]/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--color-brand)]">
                  {CREW_TYPE_ICONS[crewType]}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[var(--color-brand)]">
                    {CREW_TYPE_LABELS[crewType].name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Sarai il {CREW_TYPE_LABELS[crewType].ownerLabel}
                  </div>
                </div>
              </div>

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
                  placeholder="es. Milano Trail Crew"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] resize-none"
                />
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
                      className={`border rounded-xl px-4 py-3 text-sm text-left transition-colors ${
                        form.visibility === v
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5 font-medium'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <div className="font-semibold mb-0.5">
                        {v === 'public' ? 'Pubblica' : 'Privata'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {v === 'public'
                          ? 'Visibile a tutti, chiunque può chiedere di entrare'
                          : 'Solo tramite link invito'}
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
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
                disabled={loading}
                className="w-full bg-[var(--color-brand)] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creazione...' : 'Crea crew'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
