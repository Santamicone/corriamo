'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ModeraActions({ raceId }: { raceId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = async (status: 'published' | 'rejected') => {
    setBusy(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.from('races').update({ status }).eq('id', raceId)
    if (error) { setError(error.message); setBusy(false); return }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button onClick={() => update('rejected')} disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined text-sm">close</span>
          Rifiuta
        </button>
        <button onClick={() => update('published')} disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined text-sm">check</span>
          Pubblica
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
