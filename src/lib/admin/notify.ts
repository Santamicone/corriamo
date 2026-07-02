import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { emailAdminMessage } from '@/lib/email/templates'

interface NotifyOpts {
  userId: string
  recipientName: string
  type: string          // valore notifications.type (testo libero)
  title: string
  body: string
  tone?: 'neutral' | 'warning' | 'danger'
  withEmail?: boolean
}

/**
 * Invia una comunicazione dallo staff a un utente: notifica in-app (sempre) +
 * email (opzionale). Usa il client service-role: la tabella notifications blocca
 * l'insert diretto (policy "No direct insert"), quindi va scritta con RLS bypass.
 * L'email dell'utente vive in auth.users → recuperata via admin API.
 */
export async function notifyUser(admin: SupabaseClient, opts: NotifyOpts): Promise<void> {
  await admin.from('notifications').insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
  })

  if (!opts.withEmail) return
  try {
    const { data } = await admin.auth.admin.getUserById(opts.userId)
    const to = data?.user?.email
    if (!to) return
    const { subject, html } = emailAdminMessage({
      recipientName: opts.recipientName,
      heading: opts.title,
      message: opts.body,
      tone: opts.tone,
    })
    await sendEmail(to, subject, html)
  } catch (e) {
    console.error('[admin notify] email failed:', (e as Error).message)
  }
}
