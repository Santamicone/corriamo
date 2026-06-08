'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteCrewButton({ crewId, crewName }: { crewId: string; crewName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/crew/${crewId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) router.push('/bacheca')
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 pt-2"
      >
        <span className="material-symbols-outlined text-base">delete</span>
        Elimina crew
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">
        Eliminare <span className="font-bold">{crewName}</span>? L&apos;operazione è irreversibile.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-semibold bg-red-600 text-white rounded-full px-4 py-1.5 hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Eliminazione…' : 'Sì, elimina'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-semibold text-gray-600 bg-gray-100 rounded-full px-4 py-1.5 hover:bg-gray-200"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}
