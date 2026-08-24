import type { SupabaseClient } from '@supabase/supabase-js'
import type { CrewType } from '@/lib/types'

export interface MyCrewMembership {
  crew_id: string
  role: string
  crew: { id: string; name: string; crew_type: CrewType; city: string | null; zone: string | null } | null
}

/** Crew di cui l'utente è membro attivo — usata in Area personale e nell'hub /crew (tab "Le mie"). */
export async function fetchMyCrewMemberships(supabase: SupabaseClient, userId: string): Promise<MyCrewMembership[]> {
  const { data } = await supabase
    .from('crew_members')
    .select('crew_id, role, crew:crews!crew_id(id, name, crew_type, city, zone)')
    .eq('user_id', userId)
    .eq('status', 'active')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((m: any) => ({
    crew_id: m.crew_id as string,
    role: m.role as string,
    crew: (Array.isArray(m.crew) ? m.crew[0] : m.crew) as MyCrewMembership['crew'],
  })).filter(m => m.crew)
}

export interface CrewActivity {
  activeIds: Set<string>
  nextEventByCrewId: Map<string, { date: string; title: string }>
}

/**
 * "Attiva" = corsa/serie futura collegata alla crew OPPURE un post negli ultimi 90gg.
 * Usata dalla discovery pubblica in /crew per il badge "Attiva" e il prossimo appuntamento.
 */
export async function fetchCrewActivity(supabase: SupabaseClient, crewIds: string[]): Promise<CrewActivity> {
  if (crewIds.length === 0) return { activeIds: new Set(), nextEventByCrewId: new Map() }

  const today = new Date().toISOString().slice(0, 10)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: upcomingRuns }, { data: upcomingSeries }, { data: recentPosts }] = await Promise.all([
    supabase.from('runs').select('crew_id, date, title').in('crew_id', crewIds).gte('date', today).order('date', { ascending: true }),
    supabase.from('series').select('crew_id').in('crew_id', crewIds).eq('status', 'attiva'),
    supabase.from('crew_posts').select('crew_id').in('crew_id', crewIds).gte('created_at', ninetyDaysAgo),
  ])

  const nextEventByCrewId = new Map<string, { date: string; title: string }>()
  upcomingRuns?.forEach(r => {
    if (r.crew_id && !nextEventByCrewId.has(r.crew_id)) nextEventByCrewId.set(r.crew_id, { date: r.date, title: r.title })
  })
  const activeIds = new Set<string>([
    ...(upcomingRuns ?? []).map(r => r.crew_id).filter(Boolean),
    ...(upcomingSeries ?? []).map(s => s.crew_id).filter(Boolean),
    ...(recentPosts ?? []).map(p => p.crew_id).filter(Boolean),
  ])

  return { activeIds, nextEventByCrewId }
}
