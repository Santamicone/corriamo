import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/crew/[id]/members — aggiunge un membro direttamente (owner/admin)
// oppure crea una richiesta pending (utente qualsiasi)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: crewId } = await params
  const body = await request.json()
  const targetUserId: string = body.user_id ?? user.id

  // Verifica se chi chiama è owner/admin
  const { data: callerMember } = await supabase
    .from('crew_members')
    .select('role')
    .eq('crew_id', crewId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isAdmin = callerMember?.role === 'owner' || callerMember?.role === 'admin'

  // Un utente normale può inserire solo se stesso
  if (!isAdmin && targetUserId !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const status = isAdmin ? 'active' : 'pending'

  const { error } = await supabase
    .from('crew_members')
    .insert({ crew_id: crewId, user_id: targetUserId, role: 'member', status })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Già membro o richiesta già inviata' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status }, { status: 201 })
}

// PATCH /api/crew/[id]/members — approva/rifiuta richiesta o cambia ruolo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: crewId } = await params
  const body = await request.json()
  const { user_id, status, role } = body

  // Solo owner/admin possono modificare
  const { data: callerMember } = await supabase
    .from('crew_members')
    .select('role')
    .eq('crew_id', crewId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // L'owner non può essere declassato
  if (role && user_id) {
    const { data: target } = await supabase
      .from('crew_members')
      .select('role')
      .eq('crew_id', crewId)
      .eq('user_id', user_id)
      .single()
    if (target?.role === 'owner') {
      return NextResponse.json({ error: "Non puoi modificare il ruolo dell'owner" }, { status: 403 })
    }
  }

  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (role) updates.role = role

  const { error } = await supabase
    .from('crew_members')
    .update(updates)
    .eq('crew_id', crewId)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/crew/[id]/members — abbandona la crew o rimuove un membro (owner)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: crewId } = await params
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get('user_id') ?? user.id

  if (targetUserId !== user.id) {
    // Solo l'owner può rimuovere altri
    const { data: crew } = await supabase
      .from('crews')
      .select('owner_id')
      .eq('id', crewId)
      .single()
    if (crew?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
    // Non si può rimuovere l'owner
    if (targetUserId === crew.owner_id) {
      return NextResponse.json({ error: "Non puoi rimuovere l'owner" }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('crew_id', crewId)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
