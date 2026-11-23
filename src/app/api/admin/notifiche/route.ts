import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'
import { EVENT_TYPES, FREQUENCIES } from '@/lib/admin/notifications'

export const runtime = 'nodejs'

type Body = {
  rules?: { event_type?: string; enabled?: boolean; frequency?: string }[]
  daily_hour?: number
  recipients?: { user_id?: string; enabled?: boolean }[]
}

/**
 * Salva le impostazioni delle notifiche email agli admin: quali eventi, ogni quanto, chi le riceve.
 * Cambia chi riceve i dati degli utenti, quindi richiede la sessione AAL2 (2FA) come le altre azioni
 * sensibili. Scrive con il service-role: le tabelle non hanno policy per il client.
 */
export async function PUT(request: Request) {
  try {
    const guard = await guardAdminApi(true)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const body = (await request.json().catch(() => null)) as Body | null
    if (!body) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const rules = (body.rules ?? []).map(r => ({
      event_type: String(r.event_type ?? ''),
      enabled: r.enabled === true,
      frequency: String(r.frequency ?? ''),
    }))
    for (const r of rules) {
      if (!EVENT_TYPES.some(e => e.value === r.event_type)) {
        return NextResponse.json({ error: `Evento non valido: ${r.event_type}` }, { status: 400 })
      }
      if (!FREQUENCIES.some(f => f.value === r.frequency)) {
        return NextResponse.json({ error: 'Frequenza non valida' }, { status: 400 })
      }
    }
    const hour = body.daily_hour
    if (hour !== undefined && !(Number.isInteger(hour) && hour >= 0 && hour <= 23)) {
      return NextResponse.json({ error: 'Ora non valida (0-23)' }, { status: 400 })
    }

    const svc = createServiceRoleClient()

    // I destinatari possono essere solo admin veri: si ignora qualsiasi altro id
    const { data: admins, error: admErr } = await svc.from('profiles').select('id').eq('is_admin', true)
    if (admErr) return NextResponse.json({ error: admErr.message }, { status: 500 })
    const adminIds = new Set((admins ?? []).map(a => a.id as string))
    const recipients = (body.recipients ?? [])
      .filter(r => typeof r.user_id === 'string' && adminIds.has(r.user_id))
      .map(r => ({ user_id: r.user_id as string, enabled: r.enabled === true }))

    const now = new Date().toISOString()
    for (const r of rules) {
      const { error } = await svc.from('admin_notification_rules')
        .update({ enabled: r.enabled, frequency: r.frequency, updated_at: now, updated_by: guard.user.id })
        .eq('event_type', r.event_type)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (hour !== undefined) {
      const { error } = await svc.from('admin_notification_settings').update({ daily_hour: hour }).eq('id', true)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (recipients.length > 0) {
      const { error } = await svc.from('admin_notification_prefs').upsert(recipients, { onConflict: 'user_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAdminAction(svc, {
      admin_id: guard.user.id,
      action_type: 'notifications.update',
      entity_table: 'admin_notification_rules',
      metadata: { rules, daily_hour: hour ?? null, recipients_off: recipients.filter(r => !r.enabled).length },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/notifiche] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
