'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'

type MemberRow = {
  id: string
  user_id: string
  role: string
  user: { id: string; full_name: string; avatar_url: string | null; city: string | null }
}

type TypeLabels = {
  ownerLabel: string
  adminLabel: string
  memberLabel: string
  memberLabelPlural: string
}

/** Oltre questa soglia la lista si collassa a "+altri N". */
const COLLAPSE_THRESHOLD = 8

/**
 * Lista membri della crew con collasso per i gruppi numerosi: mostra i primi
 * `COLLAPSE_THRESHOLD` e nasconde il resto dietro un toggle "+altri N", così la
 * sidebar resta compatta anche con decine di iscritti. Gli owner/admin, ordinati
 * per `joined_at`, tendono a stare in cima ed emergono sempre.
 */
export function CrewMemberList({
  members,
  typeInfo,
}: {
  members: MemberRow[]
  typeInfo: TypeLabels
}) {
  const [expanded, setExpanded] = useState(false)
  const total = members.length
  const collapsible = total > COLLAPSE_THRESHOLD
  const visible = collapsible && !expanded ? members.slice(0, COLLAPSE_THRESHOLD) : members
  const hidden = total - visible.length

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-4">
        {total} {total !== 1 ? typeInfo.memberLabelPlural : typeInfo.memberLabel}
      </h2>
      <div className="space-y-3">
        {visible.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar name={m.user.full_name} src={m.user.avatar_url} size="md" />
            <div className="flex-1 min-w-0">
              <Link
                href={`/profilo/${m.user_id}`}
                className="font-medium text-sm text-gray-900 hover:text-[var(--color-primary)]"
              >
                {m.user.full_name}
              </Link>
              {m.user.city && <div className="text-xs text-gray-400">{m.user.city}</div>}
            </div>
            {(m.role === 'owner' || m.role === 'admin') && (
              <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full px-2 py-0.5">
                {m.role === 'owner' ? typeInfo.ownerLabel : typeInfo.adminLabel}
              </span>
            )}
          </div>
        ))}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full flex items-center justify-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
        >
          {expanded ? 'Mostra meno' : `Mostra tutti · +altri ${hidden}`}
          <span className="material-symbols-outlined text-base">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      )}
    </div>
  )
}
