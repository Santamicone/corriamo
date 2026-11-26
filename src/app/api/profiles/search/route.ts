import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profiles/search?q=...
// Cerca runner per nome (usata per scegliere i co-organizzatori). Esclude chi cerca.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json([])

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, city')
    .ilike('full_name', `%${q}%`)
    .neq('id', user.id)
    .limit(8)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(profiles ?? [])
}
