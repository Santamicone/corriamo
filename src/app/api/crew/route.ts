import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/crew — crea una nuova crew
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const { name, description, crew_type, visibility, whatsapp_group_link } = body

  if (!name || !crew_type) {
    return NextResponse.json({ error: 'Nome e tipo sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('crews')
    .insert({ name, description, crew_type, visibility: visibility ?? 'public', whatsapp_group_link, owner_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
