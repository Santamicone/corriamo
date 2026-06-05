'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function CancelRunButton({ runId }: { runId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('runs').update({ status: 'annullata' }).eq('id', runId)
    // Il trigger notify_run_cancelled genera automaticamente le notifiche
    setLoading(false)
    router.refresh()
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-red-50 transition-colors"
      >
        <span className="material-symbols-outlined text-base">event_busy</span>
        Annulla questa corsa
      </button>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-sm font-bold text-red-800">Confermi l&apos;annullamento?</p>
      <p className="text-xs text-red-600 leading-relaxed">
        Tutti i partecipanti approvati riceveranno una notifica. Questa azione non è reversibile.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'Annullamento…' : 'Sì, annulla corsa'}
        </button>
      </div>
    </div>
  )
}
