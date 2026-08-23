'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CoOrganizerPicker } from '@/components/CoOrganizerPicker'

interface PickedProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Props {
  seriesId: string
  initialCoOrganizer: PickedProfile | null
}

export function SeriesCoOrganizerManager({ seriesId, initialCoOrganizer }: Props) {
  const router = useRouter()
  const [coOrganizer, setCoOrganizer] = useState(initialCoOrganizer)
  const [saving, setSaving] = useState(false)

  const handleChange = async (profile: PickedProfile | null) => {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('series')
      .update({ co_organizer_id: profile?.id ?? null })
      .eq('id', seriesId)
    setCoOrganizer(profile)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Co-organizzatore</p>
      <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
        Può gestire la serie insieme a te (pausa/ripresa).
      </p>
      <div className={saving ? 'opacity-60 pointer-events-none' : ''}>
        <CoOrganizerPicker value={coOrganizer} onChange={handleChange} />
      </div>
    </div>
  )
}
