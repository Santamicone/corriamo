'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SeriesStatus } from '@/lib/types'

interface Props {
  seriesId: string
  status: SeriesStatus
}

export function SeriesStatusToggle({ seriesId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isPaused = status === 'in_pausa'

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('series')
      .update({ status: isPaused ? 'attiva' : 'in_pausa' })
      .eq('id', seriesId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
        isPaused
          ? 'bg-primary text-white hover:bg-primary-hover'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span className="material-symbols-outlined text-lg">
        {loading ? 'hourglass_empty' : isPaused ? 'play_circle' : 'pause_circle'}
      </span>
      {isPaused ? 'Riprendi serie' : 'Metti in pausa'}
    </button>
  )
}
