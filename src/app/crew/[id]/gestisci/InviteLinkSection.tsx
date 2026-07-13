'use client'

import { useState } from 'react'

export function InviteLinkSection({ crewId }: { crewId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateLink() {
    setLoading(true)
    const res = await fetch(`/api/crew/${crewId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) setLink(data.link)
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-1">Link di invito</h2>
      <p className="text-sm text-gray-500 mb-4">
        Condividi questo link — chi lo apre entra direttamente nella crew.
      </p>

      {!link ? (
        <button
          onClick={generateLink}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] border border-[var(--color-primary)] rounded-xl px-4 py-2 hover:bg-[var(--color-primary)]/5 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">link</span>
          {loading ? 'Generazione...' : 'Genera link'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 bg-gray-50 truncate"
          />
          <button
            onClick={copy}
            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-xl px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copiato' : 'Copia'}
          </button>
        </div>
      )}
    </div>
  )
}
