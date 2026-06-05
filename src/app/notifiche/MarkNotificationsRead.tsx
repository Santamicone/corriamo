'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MarkNotificationsRead({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return
    const supabase = createClient()
    supabase.from('notifications').update({ read: true }).in('id', ids).then(() => {})
  }, [ids.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
