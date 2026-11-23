import { requireAdmin } from '@/lib/admin/guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { NotificheForm, type RuleState, type RecipientState } from './NotificheForm'

export default async function AdminNotifichePage() {
  // Cambia chi riceve i dati degli utenti: serve la sessione AAL2 (2FA)
  const { user } = await requireAdmin()

  // Service-role: le tabelle delle notifiche non hanno policy per il client
  const svc = createServiceRoleClient()
  const [rulesRes, settingsRes, adminsRes, prefsRes, pendingRes] = await Promise.all([
    svc.from('admin_notification_rules').select('event_type, enabled, frequency, last_sent_at'),
    svc.from('admin_notification_settings').select('daily_hour').eq('id', true).maybeSingle(),
    svc.from('profiles').select('id, full_name').eq('is_admin', true).order('full_name'),
    svc.from('admin_notification_prefs').select('user_id, enabled'),
    svc.from('admin_event_queue').select('event_type').is('sent_at', null),
  ])

  const setupError = rulesRes.error ?? settingsRes.error ?? prefsRes.error ?? pendingRes.error
  if (setupError) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Notifiche</h1>
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">
          Non riesco a leggere le impostazioni: {setupError.message}. Controlla che lo SQL #52
          (<span className="font-mono">supabase/admin-notifications.sql</span>) sia applicato.
        </p>
      </div>
    )
  }

  const rules: RuleState[] = (rulesRes.data ?? []).map(r => ({
    event_type: r.event_type as string,
    enabled: !!r.enabled,
    frequency: r.frequency as string,
    last_sent_at: (r.last_sent_at as string | null) ?? null,
    pending: (pendingRes.data ?? []).filter(p => p.event_type === r.event_type).length,
  }))

  // Chi non ha una riga nelle preferenze riceve gli avvisi (default)
  const off = new Set((prefsRes.data ?? []).filter(p => p.enabled === false).map(p => p.user_id as string))
  const recipients: RecipientState[] = []
  for (const a of adminsRes.data ?? []) {
    const { data } = await svc.auth.admin.getUserById(a.id as string)
    recipients.push({
      user_id: a.id as string,
      name: (a.full_name as string) || 'Admin',
      email: data?.user?.email ?? '',
      enabled: !off.has(a.id as string),
      isMe: a.id === user.id,
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Notifiche</h1>
      <p className="text-sm text-gray-500 mb-6">
        Email agli admin quando succede qualcosa di nuovo nell’app: scegli quali eventi, ogni quanto e chi le riceve.
      </p>
      <NotificheForm
        initialRules={rules}
        initialDailyHour={settingsRes.data?.daily_hour ?? 8}
        initialRecipients={recipients}
      />
    </div>
  )
}
