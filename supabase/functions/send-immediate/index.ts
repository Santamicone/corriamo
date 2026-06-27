import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL       = 'https://app.vieniacorrere.it'
const FROM           = 'Vieni a correre? <info@vieniacorrere.it>'

const EXPIRY_DAYS = 30

// ── HMAC token per unsubscribe (Deno-compatible) ──────────────────────────────
async function buildUnsubscribeUrl(userId: string, secret: string): Promise<string> {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  })
  const encoded = btoa(payload)
  const enc     = new TextEncoder()
  const key     = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(encoded))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  const token  = encodeURIComponent(`${encoded}.${sigB64}`)
  return `${SITE_URL}/api/unsubscribe?token=${token}`
}

// ── Template helpers ──────────────────────────────────────────────────────────
const PRIMARY = '#EA580C'
const BG      = '#FAFAF9'

function base(content: string, unsubUrl: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:${PRIMARY};padding:20px 32px;">
  <span style="color:#fff;font-size:18px;font-weight:800;">🏃 Vieni a correre?</span>
</td></tr>
<tr><td style="padding:32px;">${content}</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
  <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
    Hai ricevuto questa email perché sei iscritto a Vieni a correre?.<br>
    <a href="${SITE_URL}/profilo/modifica" style="color:#9ca3af;">Preferenze email</a> &nbsp;·&nbsp;
    <a href="${unsubUrl}" style="color:#9ca3af;">Disiscriviti</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:${PRIMARY};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:50px;">${label}</a>`
}

function runInfo(date: string, time: string, city: string): string {
  const t = time.slice(0, 5)
  const d = new Date(`${date}T${time}`).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return `<p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.8;">📅 ${d} alle ${t}<br>📍 ${city}</p>`
}

// ── Invio email via Resend ────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err}`)
  }
}

// ── Handler principale ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let notificationId: string
  try {
    const body = await req.json()
    notificationId = body.notification_id
    if (!notificationId) throw new Error('notification_id mancante')
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 })
  }

  try {
    // Carica notifica + utente + actor + run
    const { data: notif, error: ne } = await supabase
      .from('notifications')
      .select(`
        *,
        user:profiles!notifications_user_id_fkey(id, full_name, email_prefs, last_seen_at),
        actor:profiles!notifications_actor_id_fkey(full_name),
        run:runs(id, title, date, time, location, city)
      `)
      .eq('id', notificationId)
      .single()

    if (ne || !notif) throw new Error(`Notifica non trovata: ${ne?.message}`)
    if (notif.email_sent) return new Response('already_sent', { status: 200 })

    const user     = notif.user as { id: string; full_name: string; email_prefs: Record<string, boolean> }
    const actor    = notif.actor as { full_name: string } | null
    const run      = notif.run  as { id: string; title: string; date: string; time: string; location: string; city: string } | null
    const prefs    = user.email_prefs ?? { immediate: true, reminders: true }

    // Verifica preferenze
    const needsPref: Record<string, string> = {
      corsa_annullata:    'immediate',
      richiesta_approvata: 'immediate',
      corsa_modificata:   'immediate',
      promemoria_corsa:   'reminders',
    }
    const prefKey = needsPref[notif.type]
    if (prefKey && !prefs[prefKey]) {
      return new Response('email_disabled_by_user', { status: 200 })
    }

    // Recupera email utente da auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
    const toEmail = authUser?.user?.email
    if (!toEmail) throw new Error('Email utente non trovata')

    const unsubUrl = await buildUnsubscribeUrl(user.id, serviceRoleKey)

    // Genera subject + html in base al tipo
    let subject = ''
    let html    = ''

    if (notif.type === 'richiesta_approvata' && run) {
      subject = `✅ Sei nella corsa! "${run.title}"`
      html = base(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Sei iscritto! 🎉</h2>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
          Ciao <strong>${user.full_name}</strong>,<br>
          <strong>${actor?.full_name ?? 'L\'organizzatore'}</strong> ha approvato la tua richiesta per:
        </p>
        <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${run.title}</p>
        ${runInfo(run.date, run.time, run.city)}
        ${cta('Vai alla corsa →', `${SITE_URL}/corse/${run.id}`)}
      `, unsubUrl)

    } else if (notif.type === 'corsa_annullata' && run) {
      subject = `⚠️ Corsa annullata: "${run.title}"`
      html = base(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Corsa annullata</h2>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
          Ciao <strong>${user.full_name}</strong>,<br>
          purtroppo <strong>${actor?.full_name ?? 'L\'organizzatore'}</strong> ha annullato la corsa a cui eri iscritto/a.
        </p>
        <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${run.title}</p>
        ${runInfo(run.date, run.time, run.city)}
        ${cta('Cerca altre corse →', `${SITE_URL}/bacheca`)}
      `, unsubUrl)

    } else if (notif.type === 'corsa_modificata' && run) {
      subject = `📝 "${run.title}" è stata modificata`
      html = base(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Aggiornamento corsa</h2>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
          Ciao <strong>${user.full_name}</strong>,<br>
          <strong>${actor?.full_name ?? 'L\'organizzatore'}</strong> ha modificato i dettagli di una corsa a cui sei iscritto/a.
        </p>
        <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${run.title}</p>
        ${runInfo(run.date, run.time, run.city)}
        ${cta('Guarda le novità →', `${SITE_URL}/corse/${run.id}`)}
      `, unsubUrl)

    } else if (notif.type === 'promemoria_corsa' && run) {
      subject = `🏃 Domani corri con ${actor?.full_name ?? 'il gruppo'}!`
      html = base(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">A domani! 🏃</h2>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
          Ciao <strong>${user.full_name}</strong>,<br>
          ricorda che domani corri con <strong>${actor?.full_name ?? 'il gruppo'}</strong>.
        </p>
        <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${run.title}</p>
        <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.8;">
          🕐 Ore ${run.time.slice(0, 5)}<br>📍 ${run.location}, ${run.city}
        </p>
        ${cta('Apri la corsa →', `${SITE_URL}/corse/${run.id}`)}
        <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">Usa il Purple Screen per riconoscervi al punto di ritrovo.</p>
      `, unsubUrl)

    } else {
      return new Response('type_not_handled', { status: 200 })
    }

    await sendEmail(toEmail, subject, html)

    await supabase
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notificationId)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })

  } catch (err) {
    console.error('[send-immediate]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
