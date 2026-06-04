'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { Participation } from '@/lib/types'

export function ParticipantsList({ runId, participations }: { runId: string; participations: Participation[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDecision = async (participationId: string, status: 'approvata' | 'rifiutata') => {
    setLoading(participationId)
    const supabase = createClient()
    await supabase.from('participations').update({ status }).eq('id', participationId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {participations.map(p => (
        <div key={p.id} className="flex items-start gap-3 p-3 bg-surface-container rounded-xl">
          <Avatar name={p.user?.full_name ?? '?'} src={p.user?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <Link href={`/profilo/${p.user_id}`} className="text-sm font-bold text-on-surface hover:text-primary transition-colors">
              {p.user?.full_name}
            </Link>
            {p.user?.city && <p className="text-xs text-on-surface-variant">{p.user.city}</p>}
            {p.message && <p className="text-xs text-on-surface-variant mt-1 italic">"{p.message}"</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-error hover:bg-error-container"
              loading={loading === p.id}
              onClick={() => handleDecision(p.id, 'rifiutata')}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </Button>
            <Button
              size="sm"
              className="bg-tertiary hover:bg-tertiary/90 shadow-none"
              loading={loading === p.id}
              onClick={() => handleDecision(p.id, 'approvata')}
            >
              <span className="material-symbols-outlined text-base">check</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
