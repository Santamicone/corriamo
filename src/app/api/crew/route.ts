import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

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

  // Slug auto-suggerito dal nome, univoco: se occupato appende un suffisso casuale
  const base = slugify(name) || 'crew'
  let slug = base
  const { data: taken } = await supabase.from('crews').select('slug').eq('slug', slug).maybeSingle()
  if (taken) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`

  const { data, error } = await supabase
    .from('crews')
    .insert({ name, slug, description, crew_type, visibility: visibility ?? 'public', whatsapp_group_link, owner_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
