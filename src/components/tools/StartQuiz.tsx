'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_STEPS, computeOutcome, type Answers } from '@/lib/running/quiz'

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

  const choose = (value: string) => {
    const next = { ...answers, [step.id]: value }
    setAnswers(next)
    if (stepIndex < total - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setDone(true)
    }
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

          <ul className="mt-5 grid gap-2.5">
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

        {/* Letture consigliate */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Da leggere</p>
          <div className="grid gap-2">
            {outcome.readings.map((r, i) => (
              <Link
                key={i}
                href={r.href}
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
        Domanda {stepIndex + 1} di {total}
      </p>
      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">{step.question}</h2>
      {step.help && <p className="text-sm text-gray-500 mt-1">{step.help}</p>}

      <div className="grid gap-2.5 mt-6">
        {step.options.map(opt => {
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
