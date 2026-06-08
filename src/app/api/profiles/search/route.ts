import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profiles/search?q=...&crew_id=...
// Cerca runner per nome o email. Esclude chi è già membro della crew (active o pending).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const crewId = searchParams.get('crew_id') ?? ''

  if (q.length < 2) return NextResponse.json([])

  // Recupera ID già presenti nella crew (active o pending)
  const { data: existing } = await supabase
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crewId)
    .in('status', ['active', 'pending'])

  const excludeIds = [user.id, ...(existing?.map((m) => m.user_id) ?? [])]

  let profilesQuery = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, city')
    .ilike('full_name', `%${q}%`)
    .limit(8)

  if (excludeIds.length > 0) {
    profilesQuery = profilesQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: profiles, error } = await profilesQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(profiles ?? [])
}
