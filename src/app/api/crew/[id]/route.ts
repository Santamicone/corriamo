import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/crew/[id] — elimina la crew (solo owner)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params

  const { data: crew } = await supabase
    .from('crews')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!crew) return NextResponse.json({ error: 'Crew non trovata' }, { status: 404 })
  if (crew.owner_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { error } = await supabase.from('crews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
