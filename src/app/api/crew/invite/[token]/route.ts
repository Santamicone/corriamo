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

  // Accettazione atomica via RPC SECURITY DEFINER: valida il token, inserisce la
  // membership e incrementa use_count. Bypassa la RLS (crew_invites è leggibile
  // solo dagli admin) in modo controllato, lavorando solo sul token fornito.
  const { data, error } = await supabase.rpc('accept_crew_invite', { p_token: token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const outcome = (Array.isArray(data) ? data[0] : data) as
    { crew_id: string | null; result: string } | null | undefined

  switch (outcome?.result) {
    case 'joined':
      return NextResponse.json({ crew_id: outcome.crew_id })
    case 'already_member':
      return NextResponse.json({ crew_id: outcome.crew_id, already_member: true })
    case 'expired':
      return NextResponse.json({ error: 'Link scaduto' }, { status: 410 })
    case 'exhausted':
      return NextResponse.json({ error: 'Link esaurito' }, { status: 410 })
    case 'not_found':
      return NextResponse.json({ error: 'Link non valido o scaduto' }, { status: 404 })
    default:
      return NextResponse.json({ error: 'Impossibile accettare l\'invito' }, { status: 500 })
  }
}
