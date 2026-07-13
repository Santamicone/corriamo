'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Side = { id: string; name: string }

export function DuplicatiActions({ a, b }: { a: Side; b: Side }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const deleteRace = async (race: Side) => {
    if (!confirm(`Eliminare definitivamente «${race.name}»? L'operazione non è reversibile.`)) return
    setBusy(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.from('races').delete().eq('id', race.id)
    if (error) { setError(error.message); setBusy(false); return }
    router.refresh()
  }

  const notDuplicate = async () => {
    setBusy(true); setError('')
    // Ordine canonico: race_a < race_b (vincolo della tabella)
    const [race_a, race_b] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
    const supabase = createClient()
    const { error } = await supabase.from('race_not_duplicates').insert({ race_a, race_b })
    if (error) { setError(error.message); setBusy(false); return }
    router.refresh()
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
      <button onClick={() => deleteRace(a)} disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
        <span className="material-symbols-outlined text-sm">delete</span>
        Elimina la 1ª
      </button>
      <button onClick={() => deleteRace(b)} disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
        <span className="material-symbols-outlined text-sm">delete</span>
        Elimina la 2ª
      </button>
      <button onClick={notDuplicate} disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
        <span className="material-symbols-outlined text-sm">do_not_disturb_on</span>
        Non è un doppione
      </button>
      {error && <p className="w-full text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
