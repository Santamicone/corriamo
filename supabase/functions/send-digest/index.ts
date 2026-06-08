import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL       = 'https://www.vieniacorrere.it'
const FROM           = 'Vieni a correre? <info@vieniacorrere.it>'
const EXPIRY_DAYS    = 30
const PRIMARY        = '#EA580C'
const BG             = '#FAFAF9'

async function buildUnsubscribeUrl(userId: string, secret: string): Promise<string> {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000 })
  const encoded = btoa(payload)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(encoded))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(`${encoded}.${sigB64}`)}`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

Deno.serve(async () => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const supabase       = createClient(supabaseUrl, serviceRoleKey)

  // Notifiche digest non inviate, non lette, create >2h fa
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: notifs, error } = await supabase
    .from('notifications')
    .select(`
      id, type, title, body, run_id, user_id, created_at,
      user:profiles!notifications_user_id_fkey(id, full_name, last_seen_at, email_prefs)
    `)
    .in('type', ['nuova_richiesta', 'nuovo_messaggio'])
    .eq('email_sent', false)
    .eq('read', false)
    .lt('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[send-digest] query error', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  if (!notifs || notifs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  // Raggruppa per user_id
  const byUser = new Map<string, typeof notifs>()
  for (const n of notifs) {
    const uid = n.user_id
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(n)
  }

  let sent = 0
  const errors: string[] = []

  for (const [userId, userNotifs] of byUser) {
    const user = userNotifs[0].user as {
      id: string; full_name: string; last_seen_at: string | null; email_prefs: Record<string, boolean>
    }
    const prefs = user.email_prefs ?? { digest: true }

    if (!prefs.digest) continue

    // Se l'utente ha fatto login dopo la creazione delle notifiche → le ha viste in-app
    const lastSeen = user.last_seen_at ? new Date(user.last_seen_at) : null
    const oldestNotif = new Date(userNotifs[userNotifs.length - 1].created_at as string)
    if (lastSeen && lastSeen > oldestNotif) continue

    // Recupera email da auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const toEmail = authUser?.user?.email
    if (!toEmail) continue

    const unsubUrl = await buildUnsubscribeUrl(userId, serviceRoleKey)
    const n = userNotifs.length
    const subject = `📬 ${n} aggiornament${n === 1 ? 'o' : 'i'} da Vieni a correre?`

    const rows = userNotifs.map(item => {
      const icon = item.type === 'nuova_richiesta' ? '👤' : '💬'
      const href = item.run_id ? `${SITE_URL}/corse/${item.run_id}` : SITE_URL
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${icon} ${item.title}</p>
        ${item.body ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${item.body}</p>` : ''}
        <a href="${href}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:${PRIMARY};text-decoration:none;">Vedi →</a>
      </td></tr>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:${PRIMARY};padding:20px 32px;"><span style="color:#fff;font-size:18px;font-weight:800;">🏃 Vieni a correre?</span></td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Hai ${n} aggiornament${n === 1 ? 'o' : 'i'}</h2>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Ciao <strong>${user.full_name}</strong>, ecco cosa ti sei perso/a.</p>
  <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  <a href="${SITE_URL}" style="display:inline-block;margin-top:24px;background:${PRIMARY};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:50px;">Vai all'app →</a>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
  <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
    <a href="${SITE_URL}/profilo/modifica" style="color:#9ca3af;">Preferenze email</a> &nbsp;·&nbsp;
    <a href="${unsubUrl}" style="color:#9ca3af;">Disiscriviti</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`

    try {
      await sendEmail(toEmail, subject, html)
      const ids = userNotifs.map(n => n.id)
      await supabase.from('notifications').update({ email_sent: true }).in('id', ids)
      sent++
    } catch (e) {
      errors.push(`${userId}: ${String(e)}`)
    }
  }

  console.log(`[send-digest] sent=${sent} errors=${errors.length}`)
  return new Response(JSON.stringify({ sent, errors }), { status: 200 })
})
