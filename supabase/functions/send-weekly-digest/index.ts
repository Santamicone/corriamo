// Digest settimanale geolocalizzato: a ogni utente con una città nel profilo
// invia le corse in programma nei prossimi 7 giorni nella sua zona.
//
// Schedulazione: vedi supabase/weekly-digest-cron.sql (lunedì mattina).
// Opt-out: profiles.email_prefs.weekly === false  (default: attivo).
//
// NON ancora deployata. Deploy: supabase functions deploy send-weekly-digest
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL       = 'https://www.vieniacorrere.it'
const FROM           = 'Vieni a correre? <info@vieniacorrere.it>'
const EXPIRY_DAYS    = 30
const PRIMARY        = '#EA580C'
const BG             = '#FAFAF9'

const normCity = (c: string | null) => (c ?? '').trim().toLowerCase()

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

interface RunRow {
  id: string; title: string; city: string | null; date: string; time: string
  distance_km: number | null; pace_target: string | null; level: string | null
}

Deno.serve(async () => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const supabase       = createClient(supabaseUrl, serviceRoleKey)

  // Finestra: da oggi a +7 giorni
  const today  = new Date().toISOString().split('T')[0]
  const in7    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 1. Tutte le corse pubbliche in programma nei prossimi 7 giorni (una query sola)
  const { data: runsData, error: runsErr } = await supabase
    .from('runs')
    .select('id, title, city, date, time, distance_km, pace_target, level, type, status, run_visibility')
    .eq('status', 'aperta')
    .neq('type', 'gara')
    .gte('date', today)
    .lte('date', in7)
    .order('date', { ascending: true })

  if (runsErr) {
    console.error('[weekly-digest] runs query error', runsErr)
    return new Response(JSON.stringify({ error: runsErr.message }), { status: 500 })
  }

  // Solo corse pubbliche (escludi crew_only / invite_only) e con città
  const publicRuns = (runsData ?? []).filter(
    (r: RunRow & { run_visibility?: string }) =>
      (r.run_visibility ?? 'public') === 'public' && normCity(r.city) !== ''
  ) as RunRow[]

  if (publicRuns.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no upcoming runs' }), { status: 200 })
  }

  // Bucket corse per città normalizzata
  const runsByCity = new Map<string, RunRow[]>()
  for (const r of publicRuns) {
    const key = normCity(r.city)
    if (!runsByCity.has(key)) runsByCity.set(key, [])
    runsByCity.get(key)!.push(r)
  }

  // 2. Utenti con città impostata
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, city, email_prefs')
    .not('city', 'is', null)

  if (profErr) {
    console.error('[weekly-digest] profiles query error', profErr)
    return new Response(JSON.stringify({ error: profErr.message }), { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const p of (profiles ?? [])) {
    const prefs = (p.email_prefs ?? {}) as Record<string, boolean>
    if (prefs.weekly === false) continue   // opt-out esplicito

    const cityRuns = runsByCity.get(normCity(p.city as string)) ?? []
    if (cityRuns.length === 0) continue     // niente corse nella sua zona

    const { data: authUser } = await supabase.auth.admin.getUserById(p.id as string)
    const toEmail = authUser?.user?.email
    if (!toEmail) continue

    const unsubUrl = await buildUnsubscribeUrl(p.id as string, serviceRoleKey)
    const cityLabel = (p.city as string).trim()
    const n = cityRuns.length
    const subject = `🏃 ${n} cors${n === 1 ? 'a' : 'e'} questa settimana a ${cityLabel}`

    const rows = cityRuns.slice(0, 8).map(r => {
      const meta = [
        r.distance_km ? `${r.distance_km} km` : null,
        r.pace_target,
      ].filter(Boolean).join(' · ')
      return `<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${r.title}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${r.date} · ${r.time?.slice(0,5) ?? ''}${meta ? ' · ' + meta : ''}</p>
        <a href="${SITE_URL}/corse/${r.id}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:${PRIMARY};text-decoration:none;">Vedi la corsa →</a>
      </td></tr>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:${PRIMARY};padding:20px 32px;"><span style="color:#fff;font-size:18px;font-weight:800;">🏃 Vieni a correre?</span></td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Corse a ${cityLabel} questa settimana</h2>
  <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Ciao <strong>${p.full_name}</strong>, ecco cosa si corre vicino a te nei prossimi 7 giorni.</p>
  <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  <a href="${SITE_URL}/bacheca?city=${encodeURIComponent(cityLabel)}" style="display:inline-block;margin-top:24px;background:${PRIMARY};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:50px;">Vedi tutte le corse →</a>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
  <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
    Ricevi questa email perché hai una città nel profilo. &nbsp;·&nbsp;
    <a href="${SITE_URL}/profilo/modifica" style="color:#9ca3af;">Preferenze email</a> &nbsp;·&nbsp;
    <a href="${unsubUrl}" style="color:#9ca3af;">Disiscriviti</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`

    try {
      await sendEmail(toEmail, subject, html)
      sent++
    } catch (e) {
      errors.push(`${p.id}: ${String(e)}`)
    }
  }

  console.log(`[weekly-digest] sent=${sent} errors=${errors.length}`)
  return new Response(JSON.stringify({ sent, errors }), { status: 200 })
})
