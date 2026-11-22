'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CSV_TEMPLATE, LIMITS, type AnalyzedRow } from '@/lib/crews/import'

type Point = { lat: number; lng: number } | null
type Item = AnalyzedRow & {
  /** undefined = posizione non ancora cercata; null = cercata e non trovata */
  point?: Point
  selected: boolean
}
type Created = { id: string; slug: string | null; name: string }
type Rejected = { index: number; name: string; errors: string[] }

const TYPE_LABELS: Record<string, string> = { running_club: 'Club', training_group: 'Gruppo', friends: 'Amici' }
const GEO_CHUNK = 15

/** Una cella CSV (separatore ";"): virgolette se contiene ; " o a capo. */
const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

const EMPTY_FORM = {
  nome: '', citta: '', zona: '', tipo: 'club', ritrovo: '', orari: '', sito: '', instagram: '',
  descrizione: '', email: '', logo: '',
}

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400'

/**
 * Aggiunta e import di crew dall'area admin (docs/MAPPA-CREW.md §9.1).
 * Flusso: testo/modulo → analisi (nessuna scrittura) → ricerca delle posizioni a blocchi → revisione
 * → salvataggio come schede informative (senza proprietario).
 */
export function CrewImportWorkspace({ mode }: { mode: 'single' | 'batch' }) {
  const [text, setText] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [items, setItems] = useState<Item[] | null>(null)
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([])
  const [publish, setPublish] = useState(true)
  const [busy, setBusy] = useState<'analyze' | 'geo' | 'save' | null>(null)
  const [geoProgress, setGeoProgress] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Created[] | null>(null)
  const [rejected, setRejected] = useState<Rejected[]>([])

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const formAsCsv = () =>
    'nome;città;zona;tipo;ritrovo;giorni e orari;sito;instagram;descrizione;email;logo\n' +
    [form.nome, form.citta, form.zona, form.tipo, form.ritrovo, form.orari, form.sito, form.instagram,
      form.descrizione, form.email, form.logo].map(csvCell).join(';')

  /** Aggiorna le posizioni a blocchi (Nominatim: ~1 richiesta/secondo). */
  const locate = async (list: Item[]) => {
    const todo = list.filter(i => i.row && i.point === undefined)
    if (todo.length === 0) return list
    setBusy('geo')
    let current = list
    for (let start = 0; start < todo.length; start += GEO_CHUNK) {
      const chunk = todo.slice(start, start + GEO_CHUNK)
      setGeoProgress(`Cerco le posizioni… ${Math.min(start + GEO_CHUNK, todo.length)} di ${todo.length}`)
      const res = await fetch('/api/admin/crew/importa/geocodifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: chunk.map(i => ({
            key: String(i.line), city: i.row!.city, meeting_point: i.row!.meeting_point, precision: i.pin_precision,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Ricerca delle posizioni non riuscita')
      const results = data.results as Record<string, Point>
      current = current.map(i => (String(i.line) in results ? { ...i, point: results[String(i.line)] } : i))
      setItems(current)
    }
    setGeoProgress('')
    return current
  }

  const analizza = async () => {
    setError(''); setCreated(null); setRejected([]); setItems(null); setBusy('analyze')
    try {
      const source = mode === 'single' ? formAsCsv() : text
      if (mode === 'batch' && !source.trim()) throw new Error('Incolla un CSV o una tabella, oppure carica un file.')
      const res = await fetch('/api/admin/crew/importa/analizza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: source }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Analisi non riuscita')
      setUnknownHeaders(data.unknownHeaders ?? [])

      const analyzed: Item[] = (data.rows as AnalyzedRow[]).map(r => ({
        ...r,
        // Selezionate di default: valide e senza possibili doppioni
        selected: !!r.row && r.duplicates.length === 0,
      }))
      setItems(analyzed)
      await locate(analyzed)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null); setGeoProgress('')
    }
  }

  const toggle = (line: number) =>
    setItems(list => list?.map(i => (i.line === line && i.row ? { ...i, selected: !i.selected } : i)) ?? null)

  const selected = (items ?? []).filter(i => i.selected && i.row)

  const salva = async () => {
    setError(''); setBusy('save')
    try {
      const res = await fetch('/api/admin/crew/importa/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publish,
          rows: selected.map(i => ({
            row: i.row,
            lat: i.point?.lat ?? null,
            lng: i.point?.lng ?? null,
            pin_precision: i.pin_precision,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Salvataggio non riuscito')
      setCreated(data.created as Created[])
      setRejected((data.rejected ?? []) as Rejected[])
      setItems(null)
      setText('')
      setForm(EMPTY_FORM)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    setText(await file.text())
  }

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modello-import-crew.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  /* ───────────────────────── risultato ───────────────────────── */
  if (created) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-green-700">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="font-bold">
            {created.length === 1 ? '1 crew salvata' : `${created.length} crew salvate`}
            {publish ? ' e online.' : ' in attesa di pubblicazione.'}
          </p>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {created.map(c => (
            <li key={c.id}>
              <Link href={`/crew/${c.slug ?? c.id}`} className="text-indigo-600 hover:underline">{c.name}</Link>
            </li>
          ))}
        </ul>
        {rejected.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
            <p className="font-semibold">Non salvate ({rejected.length}):</p>
            <ul className="list-disc pl-5">
              {rejected.map(r => <li key={r.index}>{r.name || `riga ${r.index + 1}`}: {r.errors.join('; ')}</li>)}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setCreated(null)}
            className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            {mode === 'single' ? 'Aggiungi un’altra crew' : 'Importa altre crew'}
          </button>
          <Link href="/admin/crew" className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Torna all’elenco
          </Link>
        </div>
      </div>
    )
  }

  /* ───────────────────────── input ───────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {items === null && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
          {mode === 'single' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm font-medium text-gray-700">Nome *
                  <input className={inputCls} value={form.nome} onChange={set('nome')} maxLength={LIMITS.name} /></label>
                <label className="text-sm font-medium text-gray-700">Città *
                  <input className={inputCls} value={form.citta} onChange={set('citta')} maxLength={LIMITS.city} /></label>
                <label className="text-sm font-medium text-gray-700">Zona o provincia
                  <input className={inputCls} value={form.zona} onChange={set('zona')} maxLength={LIMITS.zone} placeholder="es. PG" /></label>
                <label className="text-sm font-medium text-gray-700">Tipo
                  <select className={inputCls} value={form.tipo} onChange={set('tipo')}>
                    <option value="club">Club</option><option value="gruppo">Gruppo di allenamento</option><option value="amici">Gruppo di amici</option>
                  </select></label>
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">Ritrovo
                  <input className={inputCls} value={form.ritrovo} onChange={set('ritrovo')} maxLength={LIMITS.meeting_point} /></label>
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">Giorni e orari
                  <input className={inputCls} value={form.orari} onChange={set('orari')} maxLength={LIMITS.schedule_text} placeholder="es. Martedì e giovedì 19:30" /></label>
                <label className="text-sm font-medium text-gray-700">Sito web
                  <input className={inputCls} value={form.sito} onChange={set('sito')} placeholder="www.esempio.it" /></label>
                <label className="text-sm font-medium text-gray-700">Instagram
                  <input className={inputCls} value={form.instagram} onChange={set('instagram')} placeholder="@nomecrew" /></label>
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">Descrizione
                  <textarea className={inputCls} rows={3} value={form.descrizione} onChange={set('descrizione')} maxLength={LIMITS.description} /></label>
                <label className="text-sm font-medium text-gray-700">Email pubblica di contatto
                  <input className={inputCls} type="email" value={form.email} onChange={set('email')} /></label>
                <label className="text-sm font-medium text-gray-700">Link del logo
                  <input className={inputCls} value={form.logo} onChange={set('logo')} placeholder="https://…/logo.png" /></label>
              </div>
              <p className="text-xs text-gray-400">
                Serve almeno un link pubblico (sito o Instagram). Niente numeri di telefono né dati di persone.
                L’email non si mostra: resta privata e serve a verificare chi rivendica la crew.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-600">
                  Incolla un <strong>CSV</strong> o una tabella copiata da Excel (la prima riga è l’intestazione), oppure carica un file.
                </p>
                <button type="button" onClick={downloadTemplate}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
                  <span className="material-symbols-outlined text-base">download</span> Scarica il modello
                </button>
              </div>
              <textarea
                value={text} onChange={e => setText(e.target.value)} rows={10}
                placeholder={'nome;città;zona;tipo;ritrovo;giorni e orari;sito;instagram;descrizione;email;logo'}
                className={`${inputCls} font-mono text-xs`}
              />
              <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e => loadFile(e.target.files?.[0])} className="text-sm" />
              <p className="text-xs text-gray-400">
                Colonne: <strong>nome</strong> e <strong>città</strong> obbligatorie; tipo (club, gruppo, amici), zona, ritrovo, giorni e orari,
                sito, instagram, descrizione, email, logo (link). Serve almeno un link pubblico per riga. Massimo {LIMITS.rows} righe.
              </p>
            </>
          )}

          <div>
            <button onClick={analizza} disabled={busy !== null}
              className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {busy === 'analyze' ? 'Analizzo…' : 'Controlla'}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      {geoProgress && <p className="text-sm text-gray-500">{geoProgress}</p>}

      {/* ───────────────────────── anteprima ───────────────────────── */}
      {items && (
        <div className="flex flex-col gap-4">
          {unknownHeaders.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              Colonne ignorate perché non riconosciute: {unknownHeaders.join(', ')}.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {items.map(i => {
              const ok = !!i.row
              const geo = i.point
              return (
                <div key={i.line}
                  className={`bg-white rounded-2xl border p-4 flex gap-3 ${ok ? 'border-gray-100' : 'border-red-200 bg-red-50/40'}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={i.selected} disabled={!ok}
                    onChange={() => toggle(i.line)} aria-label={`Importa riga ${i.line}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 leading-snug">
                      {i.row?.name ?? <span className="text-red-700">Riga {i.line}</span>}
                      {i.row && <span className="ml-2 text-xs font-semibold text-gray-400">{TYPE_LABELS[i.row.crew_type]}</span>}
                    </p>
                    {i.row && (
                      <>
                        <p className="text-sm text-gray-500">
                          {i.row.city}{i.row.zone ? ` (${i.row.zone})` : ''}
                          {i.row.meeting_point ? ` · ${i.row.meeting_point}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 break-all">
                          {[i.row.website_url, i.row.instagram_url].filter(Boolean).join(' · ')}
                        </p>
                        {i.row.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.row.avatar_url} alt="Logo" referrerPolicy="no-referrer"
                            className="mt-2 h-10 w-10 rounded-lg object-cover border border-gray-100" />
                        )}
                        <p className="text-xs mt-1.5">
                          {geo === undefined ? <span className="text-gray-400">Posizione: da cercare…</span>
                            : geo ? <span className="text-green-700">Posizione trovata (pin {i.pin_precision === 'area' ? 'di zona' : 'di città'})</span>
                            : <span className="text-amber-700">Posizione non trovata: la scheda non comparirà sulla mappa</span>}
                        </p>
                      </>
                    )}
                    {i.errors.map((e, k) => <p key={k} className="text-xs text-red-700 mt-1">⛔ {e}</p>)}
                    {i.warnings.map((w, k) => <p key={k} className="text-xs text-amber-700 mt-1">⚠️ {w}</p>)}
                    {i.duplicates.length > 0 && (
                      <div className="mt-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-800">
                        <p className="font-semibold">Possibile doppione, già presente:</p>
                        <ul className="list-disc pl-4">
                          {i.duplicates.map(d => (
                            <li key={d.id}>
                              <Link href={`/crew/${d.slug ?? d.id}`} target="_blank" className="underline">{d.name}</Link>
                              {d.city ? `, ${d.city}` : ''} · {Math.round(d.name_sim * 100)}% simile
                              {d.moderation_status !== 'published' ? ` · ${d.moderation_status}` : ''}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1">Per importarla comunque, spunta la riga.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-3 shadow-sm">
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="font-semibold text-gray-800">{selected.length} da salvare su {items.length}</p>
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="h-4 w-4" />
                Pubblica subito (altrimenti restano in attesa)
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setItems(null); setError('') }} disabled={busy !== null}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                Indietro
              </button>
              <button onClick={salva} disabled={busy !== null || selected.length === 0}
                className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {busy === 'save' ? 'Salvo…' : busy === 'geo' ? 'Attendi le posizioni…' : `Salva ${selected.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
