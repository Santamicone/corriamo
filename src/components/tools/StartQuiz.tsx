'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_STEPS, computeOutcome, type Answers, type QuizStep } from '@/lib/running/quiz'

/** True se lo step ha le risposte necessarie per proseguire. */
function isStepComplete(step: QuizStep, answers: Answers): boolean {
  if (step.kind === 'form') {
    return (step.fields ?? []).every((f) => {
      if (f.optional) return true
      const v = answers[f.id]
      return typeof v === 'string' && v.trim() !== ''
    })
  }
  if (step.kind === 'multi') {
    // Si può proseguire anche senza selezioni ("non mi riconosco in nessuno").
    return true
  }
  return true
}

export function StartQuiz() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [done, setDone] = useState(false)
  const [isLogged, setIsLogged] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLogged(!!data.user))
  }, [])

  const step = QUIZ_STEPS[stepIndex]
  const total = QUIZ_STEPS.length
  const kind = step.kind ?? 'single'

  const advance = () => {
    if (stepIndex < total - 1) setStepIndex(stepIndex + 1)
    else setDone(true)
  }

  // single: il tap sceglie e avanza
  const choose = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }))
    advance()
  }

  // multi: il tap aggiunge/toglie, si avanza con "Continua"
  const toggle = (value: string) => {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[step.id]) ? (prev[step.id] as string[]) : []
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...prev, [step.id]: next }
    })
  }

  // form: aggiorna il singolo campo
  const setField = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
  }

  const back = () => {
    if (done) { setDone(false); return }
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  const restart = () => {
    setAnswers({})
    setStepIndex(0)
    setDone(false)
  }

  // ── Esito ──
  if (done) {
    const outcome = computeOutcome(answers)
    return (
      <div>
        {outcome.medicalWarning && (
          <div className="flex items-start gap-3 bg-error-container border border-error/20 rounded-2xl p-4 mb-6">
            <span className="material-symbols-outlined text-error">medical_services</span>
            <p className="text-sm text-on-error-container leading-relaxed">
              Hai indicato dolori frequenti: prima di iniziare o intensificare, fatti valutare da un
              medico o un fisioterapista. Correre col dolore peggiora le cose.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Il tuo percorso</p>
          <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{outcome.title}</h2>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">{outcome.summary}</p>

          {outcome.profileNote && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-orange-50/70 border border-orange-100 p-3.5">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">person</span>
              <p className="text-sm text-gray-600 leading-relaxed">{outcome.profileNote}</p>
            </div>
          )}

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Il piano</p>
          <ul className="grid gap-2.5">
            {outcome.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-orange-50 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primi piccoli obiettivi */}
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">flag</span>
            <p className="text-sm font-extrabold text-gray-900">Datti piccoli obiettivi</p>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Un traguardo enorme spaventa e fa mollare. Spezzalo in tappe piccole e raggiungibili: ogni
            crocetta è una vittoria.
          </p>
          <ul className="grid gap-2.5">
            {outcome.microGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-300 text-xl shrink-0">check_box_outline_blank</span>
                <span className="text-sm text-gray-700 leading-relaxed">{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Come superare i blocchi */}
        {outcome.blockTips.length > 0 && (
          <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-xl">psychology</span>
              <p className="text-sm font-extrabold text-gray-900">Superare quello che ti frena</p>
            </div>
            <div className="grid gap-4">
              {outcome.blockTips.map((b, i) => (
                <div key={i}>
                  <p className="text-sm font-bold text-gray-800 mb-1">{b.label}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{b.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modi per non mollare */}
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl">bolt</span>
            <p className="text-sm font-extrabold text-gray-900">Come non mollare</p>
          </div>
          <ul className="grid gap-2.5">
            {outcome.keepGoing.map((k, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary/70 text-xl shrink-0">favorite</span>
                <span className="text-sm text-gray-700 leading-relaxed">{k}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Letture consigliate */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Da leggere</p>
          <div className="grid gap-2">
            {outcome.readings.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-primary/30 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400">menu_book</span>
                <span className="text-sm font-semibold text-gray-700">{r.label}</span>
                <span className="material-symbols-outlined text-gray-300 ml-auto text-lg">arrow_forward</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA principale: corse nell'app */}
        <Link
          href="/bacheca"
          className="mt-6 flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200"
        >
          <span className="material-symbols-outlined text-xl">directions_run</span>
          Trova corse adatte a te vicino a casa
        </Link>

        {/* Invito programma Da zero a 5K */}
        {outcome.showZeroTo5k && (
          <div className="mt-4 bg-tertiary-container border border-tertiary/20 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-on-tertiary-container">Programma "Da zero a 5K"</p>
            <p className="text-xs text-on-tertiary-container/80 mt-1 mb-3">
              Un percorso guidato di 8 settimane per arrivare alla prima 5K. In arrivo.
            </p>
            <Link
              href={isLogged ? '/area-personale' : '/registrati'}
              className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              {isLogged ? 'Avvisami quando è pronto' : 'Registrati per essere avvisato'}
            </Link>
          </div>
        )}

        <button
          onClick={restart}
          className="mt-6 mx-auto flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">restart_alt</span>
          Rifai il test
        </button>
      </div>
    )
  }

  // ── Step ──
  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {QUIZ_STEPS.map((s, i) => (
          <div
            key={s.id}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= stepIndex ? 'bg-primary' : 'bg-gray-200',
            ].join(' ')}
          />
        ))}
      </div>

      <p className="text-xs font-semibold text-gray-400 mb-2">
        Passo {stepIndex + 1} di {total}
      </p>
      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{step.question}</h2>
      {step.help && <p className="text-sm text-gray-500 mt-1">{step.help}</p>}

      {/* Scheda con più campi (form) */}
      {kind === 'form' && (
        <div className="grid gap-5 mt-6">
          {(step.fields ?? []).map((f) => {
            const value = typeof answers[f.id] === 'string' ? (answers[f.id] as string) : ''
            if (f.type === 'select') {
              return (
                <div key={f.id}>
                  <p className="text-sm font-semibold text-gray-800 mb-2">{f.label}</p>
                  <div className="grid gap-2">
                    {(f.options ?? []).map((opt) => {
                      const selected = value === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setField(f.id, opt.value)}
                          className={[
                            'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all bg-white',
                            selected
                              ? 'border-primary bg-orange-50'
                              : 'border-gray-100 hover:border-primary/30',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'material-symbols-outlined text-lg',
                              selected ? 'text-primary' : 'text-gray-300',
                            ].join(' ')}
                          >
                            {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }
            // number
            return (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-sm font-semibold text-gray-800 mb-2">
                  {f.label}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 focus-within:border-primary/40">
                  <input
                    id={f.id}
                    type="number"
                    inputMode="numeric"
                    min={f.min}
                    max={f.max}
                    placeholder={f.placeholder}
                    value={value}
                    onChange={(e) => setField(f.id, e.target.value)}
                    className="w-full bg-transparent text-base font-semibold text-gray-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {f.suffix && <span className="text-sm font-semibold text-gray-400 shrink-0">{f.suffix}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Risposta singola (default) */}
      {kind === 'single' && (
        <div className="grid gap-2.5 mt-6">
          {(step.options ?? []).map((opt) => {
            const selected = answers[step.id] === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                className={[
                  'flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all bg-white',
                  selected
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-100 hover:border-primary/30 hover:shadow-sm',
                ].join(' ')}
              >
                <span className={['material-symbols-outlined', selected ? 'text-primary' : 'text-gray-400'].join(' ')}>
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                <span className="material-symbols-outlined text-gray-300 ml-auto text-lg">chevron_right</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Risposta multipla (multi) */}
      {kind === 'multi' && (
        <div className="grid gap-2.5 mt-6">
          {(step.options ?? []).map((opt) => {
            const cur = Array.isArray(answers[step.id]) ? (answers[step.id] as string[]) : []
            const selected = cur.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={[
                  'flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all bg-white',
                  selected
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-100 hover:border-primary/30 hover:shadow-sm',
                ].join(' ')}
              >
                <span className={['material-symbols-outlined', selected ? 'text-primary' : 'text-gray-400'].join(' ')}>
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                <span
                  className={[
                    'material-symbols-outlined ml-auto text-lg',
                    selected ? 'text-primary' : 'text-gray-300',
                  ].join(' ')}
                >
                  {selected ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Continua per form e multi (single avanza da solo) */}
      {kind !== 'single' && (
        <button
          onClick={advance}
          disabled={!isStepComplete(step, answers)}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3.5 rounded-full hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {stepIndex < total - 1 ? 'Continua' : 'Vedi il tuo percorso'}
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      )}

      {stepIndex > 0 && (
        <button
          onClick={back}
          className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Indietro
        </button>
      )}
    </div>
  )
}
