'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ConfirmationPromptProps {
  runId: string
  runTitle: string
}

/**
 * Prompt post-run: "La corsa si è svolta?"
 * Appare a partecipanti approvati dopo 2h dalla corsa e per 7 giorni.
 * Risposta facoltativa — scomparisce dopo aver risposto.
 */
export function ConfirmationPrompt({ runId, runTitle }: ConfirmationPromptProps) {
  const [answered, setAnswered] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function respond(confirmed: boolean) {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('run_confirmations').upsert(
        { run_id: runId, confirmed },
        { onConflict: 'run_id,user_id' },
      )
      setAnswered(true)
    })
  }

  if (answered) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-semibold">
        <span className="material-symbols-filled text-green-600 text-base">check_circle</span>
        Grazie per il feedback!
      </div>
    )
  }

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-primary text-xl shrink-0">help</span>
        <div>
          <p className="text-sm font-bold text-gray-900">La corsa si è svolta?</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Ci sei andato/a? Il tuo feedback aiuta la comunità a capire se le corse si tengono davvero.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => respond(true)}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-filled text-sm">check</span>
          Sì, c&apos;ero
        </button>
        <button
          onClick={() => respond(false)}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">close</span>
          No, non si è svolta
        </button>
      </div>
    </div>
  )
}
