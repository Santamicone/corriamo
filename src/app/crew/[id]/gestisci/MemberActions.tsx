'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  crewId: string
  userId: string
  currentStatus: 'active' | 'pending'
  currentRole?: 'admin' | 'member'
  currentUserRole: 'owner' | 'admin'
}

export function MemberActions({ crewId, userId, currentStatus, currentRole, currentUserRole }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function patch(body: Record<string, string>) {
    setLoading(true)
    await fetch(`/api/crew/${crewId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...body }),
    })
    setLoading(false)
    router.refresh()
  }

  async function remove() {
    setLoading(true)
    await fetch(`/api/crew/${crewId}/members?user_id=${userId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => patch({ status: 'active' })}
          disabled={loading}
          className="text-xs bg-green-100 text-green-700 font-semibold rounded-full px-3 py-1 hover:bg-green-200 transition-colors disabled:opacity-50"
        >
          Approva
        </button>
        <button
          onClick={() => patch({ status: 'rejected' })}
          disabled={loading}
          className="text-xs bg-gray-100 text-gray-600 font-semibold rounded-full px-3 py-1 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Rifiuta
        </button>
      </div>
    )
  }

  return (
    <div className="relative group">
      <button
        disabled={loading}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>
      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 hidden group-focus-within:block min-w-[160px] py-1">
        {currentUserRole === 'owner' && currentRole === 'member' && (
          <button
            onClick={() => patch({ role: 'admin' })}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Promuovi ad Admin
          </button>
        )}
        {currentUserRole === 'owner' && currentRole === 'admin' && (
          <button
            onClick={() => patch({ role: 'member' })}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Rimuovi ruolo Admin
          </button>
        )}
        <button
          onClick={remove}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Rimuovi dalla crew
        </button>
      </div>
    </div>
  )
}
