'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Marca i messaggi come letti non appena la pagina viene montata */
export function MarkReadTrigger({ messageIds }: { messageIds: string[] }) {
  useEffect(() => {
    if (messageIds.length === 0) return
    const supabase = createClient()
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds)
      .then(() => {})
  }, [messageIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
