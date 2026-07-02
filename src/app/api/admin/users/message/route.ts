import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/admin/notify'

/** Messaggio diretto dallo staff a un utente (in-app + email opzionale). */
export async function POST(request: Request) {
  const guard = await guardAdminApi()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { user: admin } = guard

  const { userId, subject, body, withEmail } = await request.json().catch(() => ({}))
  if (!userId || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Oggetto e messaggio obbligatori' }, { status: 400 })
  }

  const svc = createServiceRoleClient()
  const { data: target } = await svc.from('profiles').select('full_name').eq('id', userId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  await notifyUser(svc, {
    userId, recipientName: target.full_name ?? 'runner',
    type: 'messaggio_staff', title: subject.trim(), body: body.trim(),
    tone: 'neutral', withEmail: !!withEmail,
  })
  await svc.from('admin_actions').insert({
    admin_id: admin.id, action_type: 'user.message', entity_table: 'profiles', entity_id: userId,
    metadata: { subject: subject.trim(), email: !!withEmail },
  })

  return NextResponse.json({ ok: true })
}
