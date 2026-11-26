import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/crew/invite/[token] — chiede di entrare nella crew tramite un link di invito
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Devi accedere per chiedere di entrare' }, { status: 401 })

  const { token } = await params

  // RPC SECURITY DEFINER (SQL #55): valida il token e crea la richiesta in attesa. Serve
  // perché chi riceve il link non può leggere crew_invites né le crew private.
  // Nonostante il nome, non fa entrare: i gestori devono approvare.
  const { data, error } = await supabase.rpc('accept_crew_invite', { p_token: token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const outcome = (Array.isArray(data) ? data[0] : data) as
    { crew_id: string | null; result: string } | null | undefined

  switch (outcome?.result) {
    case 'requested':
    case 'already_requested':
      return NextResponse.json({ crew_id: outcome.crew_id, status: 'pending' })
    case 'already_member':
      return NextResponse.json({ crew_id: outcome.crew_id, status: 'active' })
    case 'expired':
      return NextResponse.json({ error: 'Link scaduto' }, { status: 410 })
    case 'exhausted':
      return NextResponse.json({ error: 'Link esaurito' }, { status: 410 })
    case 'not_found':
      return NextResponse.json({ error: 'Link non valido o scaduto' }, { status: 404 })
    default:
      return NextResponse.json({ error: 'Richiesta non inviata. Riprova.' }, { status: 500 })
  }
}
