import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/crew/invite/[token] — accetta un invito tramite token
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Devi essere loggato per accettare l\'invito' }, { status: 401 })

  const { token } = await params

  const { data: invite, error: inviteError } = await supabase
    .from('crew_invites')
    .select('id, crew_id, max_uses, use_count, expires_at')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Link non valido o scaduto' }, { status: 404 })
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link scaduto' }, { status: 410 })
  }

  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: 'Link esaurito' }, { status: 410 })
  }

  // Controlla se già membro
  const { data: existing } = await supabase
    .from('crew_members')
    .select('status')
    .eq('crew_id', invite.crew_id)
    .eq('user_id', user.id)
    .single()

  if (existing?.status === 'active') {
    return NextResponse.json({ crew_id: invite.crew_id, already_member: true })
  }

  // Inserisci come membro attivo (il link invito bypassa l'approvazione)
  const { error: insertError } = await supabase
    .from('crew_members')
    .upsert({ crew_id: invite.crew_id, user_id: user.id, role: 'member', status: 'active' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Incrementa use_count
  await supabase
    .from('crew_invites')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id)

  return NextResponse.json({ crew_id: invite.crew_id })
}
