'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Participation } from '@/lib/types'

interface Props {
  runId:           string
  userId:          string | null
  myParticipation: Participation | null
  myInterest:      { id: string } | null
  isFull:          boolean
}

export function JoinButton({ runId, userId, myParticipation, myInterest, isFull }: Props) {
  const router = useRouter()
  const loginHref = `/login?next=${encodeURIComponent(`/corse/${runId}`)}`
  const [loading,        setLoading]        = useState(false)
  const [showForm,       setShowForm]       = useState(false)
  const [message,        setMessage]        = useState('')
  const [hasInterest,    setHasInterest]    = useState(!!myInterest)
  const [interestId,     setInterestId]     = useState(myInterest?.id ?? null)
  const [interestToast,  setInterestToast]  = useState(false)   // toast conferma "Mi interessa"
  const [joinToast,      setJoinToast]      = useState(false)   // toast conferma richiesta di partecipazione
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)

  const formCardRef = useRef<HTMLDivElement>(null)

  // La barra fissa mobile resta visibile solo finché la CTA dentro la card
  // è fuori dal viewport: appena l'utente scrolla fin sopra la card, l'overlay
  // sparisce per non sovrapporsi al bottone "vero" (evita la doppia CTA).
  const [cardCtaVisible, setCardCtaVisible] = useState(false)
  useEffect(() => {
    const el = formCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setCardCtaVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -96px 0px' },   // ~altezza della barra fissa
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Apre il form di presentazione e lo porta in vista (la barra fissa
  // mobile è in fondo allo schermo, il form può essere fuori viewport)
  const openForm = () => {
    setShowForm(true)
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  /* ── Interesse ── */
  const handleAddInterest = async () => {
    if (!userId) { router.push(loginHref); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('interests')
      .insert({ run_id: runId, user_id: userId })
      .select('id')
      .single()
    if (error || !data) {
      showError('Non siamo riusciti a registrare il tuo interesse. Riprova tra un momento.')
    } else {
      setHasInterest(true)
      setInterestId(data.id)
      setInterestToast(true)
      setTimeout(() => setInterestToast(false), 3500)
    }
    setLoading(false)
    router.refresh()
  }

  const handleRemoveInterest = async () => {
    if (!interestId) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('interests').delete().eq('id', interestId)
    if (error) {
      showError('Non siamo riusciti a rimuovere il tuo interesse. Riprova tra un momento.')
    } else {
      setHasInterest(false)
      setInterestId(null)
    }
    setLoading(false)
    router.refresh()
  }

  /* ── Partecipazione ── */
  const handleJoin = async () => {
    if (!userId) { router.push(loginHref); return }
    setLoading(true)
    const supabase = createClient()
    // Rimuovi interesse se presente (partecipazione prende il posto)
    if (interestId) await supabase.from('interests').delete().eq('id', interestId)
    const { error } = await supabase.from('participations').insert({
      run_id: runId, user_id: userId,
      status: 'in_attesa', message: message || null,
    })
    setLoading(false)
    if (error) {
      showError('Invio della richiesta non riuscito. Riprova tra un momento.')
      return
    }
    setShowForm(false)
    setJoinToast(true)
    setTimeout(() => setJoinToast(false), 6000)
    router.refresh()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    const confirmMsg = myParticipation.status === 'approvata'
      ? 'Vuoi davvero annullare la partecipazione? Per tornare dovrai inviare una nuova richiesta.'
      : 'Vuoi davvero annullare la richiesta?'
    if (!window.confirm(confirmMsg)) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('participations').delete().eq('id', myParticipation.id)
    setLoading(false)
    if (error) {
      showError('Annullamento non riuscito. Riprova tra un momento.')
      return
    }
    router.refresh()
  }

  /* ─────────────────────────────────────────
     STATO: Ha già una partecipazione
  ───────────────────────────────────────── */
  if (myParticipation) {
    const s = {
      in_attesa: {
        icon: 'hourglass_empty', title: 'Richiesta inviata',
        subtitle: "L'organizzatore la esaminerà a breve.",
        color: 'bg-orange-50 border-orange-100', iconColor: 'text-orange-500', textColor: 'text-orange-800',
      },
      approvata: {
        icon: 'check_circle', title: 'Sei iscritto!',
        subtitle: 'Ci vediamo alla partenza.',
        color: 'bg-green-50 border-green-100', iconColor: 'text-green-600', textColor: 'text-green-800',
      },
      rifiutata: {
        icon: 'cancel', title: 'Richiesta rifiutata',
        subtitle: "Puoi provare un'altra corsa.",
        color: 'bg-red-50 border-red-100', iconColor: 'text-red-500', textColor: 'text-red-800',
      },
    }[myParticipation.status]

    return (
      <>
      {joinToast && <JoinToast />}
      {errorMsg && <ErrorToast message={errorMsg} />}
      <div className={`rounded-3xl border ${s.color} p-5 flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <span className={`material-symbols-filled text-2xl ${s.iconColor}`}>{s.icon}</span>
          <div>
            <p className={`text-sm font-bold ${s.textColor}`}>{s.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.subtitle}</p>
          </div>
        </div>
        {myParticipation.status !== 'rifiutata' && (
          <button onClick={handleCancel} disabled={loading}
            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors underline text-left">
            {loading
              ? 'Annullamento…'
              : myParticipation.status === 'approvata' ? 'Annulla partecipazione' : 'Annulla richiesta'}
          </button>
        )}
      </div>
      </>
    )
  }

  /* ─────────────────────────────────────────
     STATO: Utente non autenticato
     Niente CTA ambigue: invitiamo all'accesso preservando la destinazione.
  ───────────────────────────────────────── */
  if (!userId) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Vuoi partecipare?</p>
          <p className="text-xs text-gray-400 mt-0.5">Accedi per iscriverti e vedere il tuo stato.</p>
        </div>
        <button
          onClick={() => router.push(loginHref)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3.5 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
        >
          <span className="material-symbols-outlined text-lg">login</span>
          Accedi per partecipare
        </button>
        <p className="text-xs text-gray-400 text-center">
          Non hai un account?{' '}
          <a href="/registrati" className="font-semibold text-primary hover:underline">Registrati gratis</a>
        </p>
      </div>
    )
  }

  /* ─────────────────────────────────────────
     STATO: Corsa al completo
  ───────────────────────────────────────── */
  if (isFull) {
    return (
      <div className="flex flex-col gap-3">
        {errorMsg && <ErrorToast message={errorMsg} />}
        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-gray-300 block mb-2">group_off</span>
          <p className="text-sm font-bold text-gray-700">Corsa al completo</p>
          <p className="text-xs text-gray-400 mt-1">Tutti i posti sono stati assegnati.</p>
        </div>
        <InterestSection
          hasInterest={hasInterest} loading={loading}
          newlyAdded={interestToast}
          onAdd={handleAddInterest} onRemove={handleRemoveInterest}
          userId={userId}
        />
      </div>
    )
  }

  /* ─────────────────────────────────────────
     STATO: Libero — mostra entrambe le opzioni
  ───────────────────────────────────────── */
  return (
    <>
    {errorMsg && <ErrorToast message={errorMsg} />}
    {/* ── Barra fissa mobile: CTA sempre visibile — apre il form di presentazione,
           stesso flusso del desktop ── */}
    {!showForm && !cardCtaVisible && (
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 pt-3 transition-opacity duration-200"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={openForm}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3.5 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">directions_run</span>
          {loading ? 'Invio…' : 'Partecipa alla corsa'}
        </button>
      </div>
    )}

    <div className="flex flex-col gap-3">

      {/* ── Partecipa ── */}
      <div ref={formCardRef} className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 flex flex-col gap-4">
        {!showForm ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-900">Vuoi partecipare?</p>
              <p className="text-xs text-gray-400 mt-0.5">Invia una richiesta all&apos;organizzatore.</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3.5 rounded-2xl hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
            >
              <span className="material-symbols-outlined text-lg">directions_run</span>
              Partecipa alla corsa
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-bold text-gray-900">Presentati</p>
              <p className="text-xs text-gray-400 mt-0.5">Facoltativo, ma aiuta l&apos;organizzatore a conoscerti.</p>
            </div>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="es. Corro da 2 anni, ritmo 5:30/km circa..."
              rows={3}
              className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button onClick={handleJoin} disabled={loading}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60">
                {loading ? 'Invio…' : 'Invia richiesta'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Mi interessa ── */}
      <InterestSection
        hasInterest={hasInterest} loading={loading}
        newlyAdded={interestToast}
        onAdd={handleAddInterest} onRemove={handleRemoveInterest}
        onParticipate={openForm}
        userId={userId}
      />
    </div>
    </>
  )
}

/* ── Toast temporizzato di conferma richiesta inviata ── */
function JoinToast() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pt-3 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto max-w-md w-full bg-white border border-green-100 rounded-2xl shadow-lg shadow-green-100/50 p-4 flex items-start gap-3">
        <span className="material-symbols-filled text-2xl text-green-600 shrink-0">check_circle</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-green-800">Richiesta inviata!</p>
          <p className="text-xs text-gray-500 mt-0.5">
            L&apos;organizzatore riceverà una notifica e potrà accettarti.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Toast temporizzato di errore ── */
function ErrorToast({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pt-3 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto max-w-md w-full bg-white border border-red-100 rounded-2xl shadow-lg shadow-red-100/50 p-4 flex items-start gap-3">
        <span className="material-symbols-filled text-2xl text-red-500 shrink-0">error</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-800">Qualcosa è andato storto</p>
          <p className="text-xs text-gray-500 mt-0.5">{message}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Sezione "Mi interessa" riutilizzabile ── */
function InterestSection({
  hasInterest, loading, newlyAdded, onAdd, onRemove, onParticipate, userId,
}: {
  hasInterest: boolean
  loading: boolean
  newlyAdded?: boolean
  onAdd: () => void
  onRemove: () => void
  onParticipate?: () => void   // assente quando la corsa è al completo
  userId: string | null
}) {
  if (hasInterest) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <span className={`material-symbols-filled text-xl shrink-0 transition-colors ${newlyAdded ? 'text-green-500' : 'text-amber-500'}`}>
          {newlyAdded ? 'check_circle' : 'star'}
        </span>
        <div className="flex-1 min-w-0">
          {newlyAdded ? (
            <>
              <p className="text-sm font-bold text-green-800">Interesse registrato!</p>
              <p className="text-xs text-green-700 mt-0.5">
                L&apos;organizzatore vedrà che sei interessato. Riceverai un avviso se la corsa viene annullata.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-amber-800">Hai segnato interesse</p>
              <p className="text-xs text-amber-600 mt-0.5">Riceverai un avviso se la corsa viene annullata.</p>
            </>
          )}
          <div className="flex gap-3 mt-2.5">
            <button onClick={onRemove} disabled={loading}
              className="text-xs text-amber-600 hover:text-red-500 transition-colors font-semibold underline">
              Rimuovi interesse
            </button>
            {onParticipate && (
              <>
                <span className="text-amber-300">·</span>
                <button onClick={onParticipate}
                  className="text-xs text-primary hover:underline font-semibold">
                  Partecipa invece →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!userId) return null

  return (
    <button
      onClick={onAdd}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-2xl hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all disabled:opacity-50"
    >
      {loading
        ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
        : <span className="material-symbols-outlined text-base">star</span>
      }
      {loading ? 'Salvataggio…' : 'Mi interessa'}
    </button>
  )
}
