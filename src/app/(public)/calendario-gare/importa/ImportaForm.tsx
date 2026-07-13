'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Duplicate = { id: string; name: string; city: string; event_date: string; source: string; name_sim: number }
type Candidate = {
  slug: string
  name: string
  city: string
  region: string | null
  event_date: string
  distances: string[]
  race_type: string
  official_url: string | null
  confidence: 'alta' | 'media' | 'bassa'
  duplicates: Duplicate[]
}

type Tab = 'text' | 'files' | 'urls'

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}
const CONFIDENCE_STYLE: Record<string, string> = {
  alta: 'bg-green-100 text-green-700', media: 'bg-amber-100 text-amber-700', bassa: 'bg-red-100 text-red-700',
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImportaForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('text')
  const [text, setText] = useState('')
  const [urls, setUrls] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [savedCount, setSavedCount] = useState(0)

  const analizza = async () => {
    setBusy(true); setError(''); setCandidates(null); setSavedCount(0)
    try {
      let payload: unknown
      if (tab === 'text') {
        if (!text.trim()) throw new Error('Incolla del testo da analizzare.')
        payload = { type: 'text', text }
      } else if (tab === 'urls') {
        const list = urls.split('\n').map(u => u.trim()).filter(Boolean)
        if (!list.length) throw new Error('Inserisci almeno un URL.')
        payload = { type: 'urls', urls: list }
      } else {
        if (!files.length) throw new Error('Carica almeno un file.')
        const encoded = await Promise.all(
          files.map(async f => ({ name: f.name, mediaType: f.type || 'application/octet-stream', dataBase64: await readAsBase64(f) }))
        )
        payload = { type: 'files', files: encoded }
      }
      const res = await fetch('/api/calendario/importa/analizza', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analisi fallita')
      const found: Candidate[] = data.candidates ?? []
      setCandidates(found)
      // Preseleziona le gare senza doppioni evidenti
      setSelected(new Set(found.map((c, i) => (c.duplicates.length === 0 ? i : -1)).filter(i => i >= 0)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  const salva = async () => {
    if (!candidates) return
    const chosen = candidates.filter((_, i) => selected.has(i))
    if (!chosen.length) { setError('Seleziona almeno una gara.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/calendario/importa/salva', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidates: chosen }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Salvataggio fallito')
      setSavedCount(data.inserted)
      setCandidates(null); setSelected(new Set())
      setText(''); setUrls(''); setFiles([])
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'text', label: 'Testo', icon: 'notes' },
    { id: 'files', label: 'Volantini / xls-csv', icon: 'upload_file' },
    { id: 'urls', label: 'URL', icon: 'link' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Selettore fonte */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Input per fonte */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {tab === 'text' && (
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
            placeholder="Incolla qui il testo con una o più gare (comunicati, elenchi, note…)"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-400 focus:outline-none" />
        )}
        {tab === 'urls' && (
          <textarea value={urls} onChange={e => setUrls(e.target.value)} rows={6}
            placeholder="Un URL per riga (max 10)"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono focus:border-indigo-400 focus:outline-none" />
        )}
        {tab === 'files' && (
          <div>
            <input type="file" multiple accept="image/*,application/pdf,.csv,.xls,.xlsx"
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-100 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200" />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">{files.map(f => f.name).join(', ')}</p>
            )}
            <p className="mt-2 text-[11px] text-gray-400">
              Volantini (jpg/pdf) o fogli (csv/xls/xlsx). Dai volantini estraiamo i dati e generiamo una scheda nostra: l&apos;immagine non viene ripubblicata.
            </p>
          </div>
        )}
        <button onClick={analizza} disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined text-base">{busy ? 'hourglass_empty' : 'auto_awesome'}</span>
          {busy ? 'Analizzo…' : 'Analizza con AI'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedCount > 0 && (
        <p className="text-sm text-green-700 font-semibold">
          ✓ {savedCount} gare salvate come bozze. Pubblicale da «Gare da approvare».
        </p>
      )}

      {/* Risultati */}
      {candidates && (
        candidates.length === 0 ? (
          <p className="text-gray-500">Nessuna gara estratta dalla fonte.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">{candidates.length} gare estratte — seleziona quelle da salvare:</p>
            {candidates.map((c, i) => (
              <label key={i} className={`bg-white rounded-2xl border p-4 flex items-start gap-3 cursor-pointer ${
                selected.has(i) ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-100'
              }`}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_STYLE[c.confidence]}`}>
                      confidenza {c.confidence}
                    </span>
                    {c.distances.map(d => (
                      <span key={d} className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold">{DISTANCE_LABELS[d] ?? d}</span>
                    ))}
                  </div>
                  <h3 className="font-bold text-gray-900 leading-snug">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[c.city, c.region].filter(Boolean).join(', ')} · {c.event_date} · <span className="capitalize">{c.race_type.replace('_', ' ')}</span>
                  </p>
                  {c.official_url && <p className="text-xs text-indigo-600 mt-0.5 truncate">{c.official_url}</p>}
                  {c.duplicates.length > 0 && (
                    <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                      <span className="font-semibold">Possibile doppione:</span>{' '}
                      {c.duplicates.map(d => `${d.name} (${d.source}, ${Math.round(d.name_sim * 100)}%)`).join(' · ')}
                    </div>
                  )}
                </div>
              </label>
            ))}
            <div>
              <button onClick={salva} disabled={busy || selected.size === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-base">save</span>
                Salva {selected.size} gare come bozze
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
