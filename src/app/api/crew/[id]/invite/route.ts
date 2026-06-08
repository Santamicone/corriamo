import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/crew/[id]/invite — genera un link di invito
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: crewId } = await params
  const body = await request.json().catch(() => ({}))
  const { max_uses, expires_in_days } = body

  // Solo owner/admin possono creare inviti
  const { data: member } = await supabase
    .from('crew_members')
    .select('role')
    .eq('crew_id', crewId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('crew_invites')
    .insert({
      crew_id: crewId,
      invited_by: user.id,
      max_uses: max_uses ?? null,
      expires_at: expiresAt,
    })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.vieniacorrere.it'
  return NextResponse.json({ link: `${siteUrl}/crew/invite/${data.token}` }, { status: 201 })
}
