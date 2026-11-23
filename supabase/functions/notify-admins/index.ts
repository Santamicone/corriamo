// Edge Function: email agli admin per nuove registrazioni e nuove corse.
//
// Chiamata da (supabase/admin-notifications.sql, SQL #52):
//   - trigger → POST { "mode": "event", "queue_id": "<uuid>" }  (frequenza "subito")
//   - cron ogni 15 minuti → POST { "mode": "due" }               (riepiloghi orari/giornalieri
//                                                                 e recupero degli invii falliti)
// Entrambe con header x-push-secret. Le impostazioni (eventi, frequenza, destinatari) si
// gestiscono da /admin/notifiche e stanno nelle tabelle admin_notification_*.
//
// Deploy:  supabase functions deploy notify-admins --project-ref <ref> --no-verify-jwt --use-api
// Secret:  PUSH_FUNCTION_SECRET (già presente, usato anche da send-push)
//          RESEND_API_KEY       (già presente, usato dalle email)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FROM = 'Vieni a correre? <info@vieniacorrere.it>'
const APP = 'https://app.vieniacorrere.it'
const MAX_LISTED = 50
/** Oltre questa età un evento non si invia più (es. email ferme per giorni): niente notifiche "vecchie". */
const MAX_AGE_DAYS = 7

type EventType = 'user_signup' | 'run_created'
type Frequency = 'immediate' | 'hourly' | 'daily'

interface Rule { event_type: EventType; enabled: boolean; frequency: Frequency; last_sent_at: string | null }
interface QueueEvent {
  id: string
  event_type: EventType
  entity_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Nomi, titoli e luoghi li scrivono gli utenti: vanno neutralizzati prima di entrare nell'HTML. */
const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const str = (v: unknown) => (v == null ? '' : String(v))

/** Ora corrente a Roma (le impostazioni "giornaliero" sono in ora italiana). */
function romeHour(d = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(d)
  return Number(h) % 24
}

/* ───────────────────────── contenuto dell'email ───────────────────────── */

function describe(ev: QueueEvent): { line: string; link: string } {
  const p = ev.payload
  if (ev.event_type === 'user_signup') {
    const city = str(p.city)
    return {
      line: `<strong>${esc(p.full_name || 'Nuovo runner')}</strong>${city ? ` · ${esc(city)}` : ''}`,
      link: ev.entity_id ? `${APP}/admin/utenti/${ev.entity_id}` : `${APP}/admin/utenti`,
    }
  }
  const when = [str(p.date), str(p.time).slice(0, 5)].filter(Boolean).join(' ')
  const km = p.distance_km ? ` · ${esc(p.distance_km)} km` : ''
  const by = str(p.organizer_name) ? ` — di ${esc(p.organizer_name)}` : ''
  const serie = p.series_id ? ' <em>(serie ricorrente)</em>' : ''
  return {
    line: `<strong>${esc(p.title)}</strong>${serie}<br><span style="color:#6b7280;">${esc(when)} · ${esc(p.city)}${km}${by}</span>`,
    link: ev.entity_id ? `${APP}/corse/${ev.entity_id}` : APP,
  }
}

function subjectFor(events: QueueEvent[]): string {
  if (events.length === 1) {
    const ev = events[0]
    if (ev.event_type === 'user_signup') return `👤 Nuova registrazione: ${str(ev.payload.full_name) || 'nuovo utente'}`
    return `🏃 Nuova corsa: ${str(ev.payload.title)} (${str(ev.payload.city)})`
  }
  const users = events.filter(e => e.event_type === 'user_signup').length
  const runs = events.filter(e => e.event_type === 'run_created').length
  const parts = [
    users ? `${users} ${users === 1 ? 'nuovo utente' : 'nuovi utenti'}` : '',
    runs ? `${runs} ${runs === 1 ? 'nuova corsa' : 'nuove corse'}` : '',
  ].filter(Boolean)
  return `📬 Riepilogo: ${parts.join(' e ')}`
}

function section(title: string, events: QueueEvent[]): string {
  if (events.length === 0) return ''
  const shown = events.slice(0, MAX_LISTED)
  const items = shown.map(ev => {
    const d = describe(ev)
    return `<li style="margin:0 0 10px;"><a href="${d.link}" style="color:#111827;text-decoration:none;">${d.line}</a></li>`
  }).join('')
  const more = events.length > shown.length ? `<p style="margin:0;color:#6b7280;font-size:13px;">…e altri ${events.length - shown.length}.</p>` : ''
  return `<h3 style="margin:20px 0 8px;font-size:15px;">${title} (${events.length})</h3><ul style="margin:0;padding-left:18px;">${items}</ul>${more}`
}

function renderHtml(events: QueueEvent[]): string {
  const users = events.filter(e => e.event_type === 'user_signup')
  const runs = events.filter(e => e.event_type === 'run_created')
  const heading = events.length === 1 ? (users.length ? '👤 Nuova registrazione' : '🏃 Nuova corsa') : '📬 Novità su Vieni a correre?'
  return `<!DOCTYPE html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
<h2 style="margin:0 0 4px;">${heading}</h2>
${section('Nuove registrazioni', users)}
${section('Nuove corse', runs)}
<p style="margin:24px 0 0;"><a href="${APP}/admin" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:700;">Apri l’area admin</a></p>
<p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Ricevi questa email perché sei admin. Eventi, frequenza e destinatari si gestiscono da <a href="${APP}/admin/notifiche" style="color:#9ca3af;">Notifiche</a>.</p>
</body></html>`
}

/* ───────────────────────── destinatari e invio ───────────────────────── */

/** Admin con gli avvisi attivi (default: tutti) e relativo indirizzo email. */
async function recipients(): Promise<string[]> {
  const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true)
  if (!admins || admins.length === 0) return []
  const { data: prefs } = await supabase.from('admin_notification_prefs').select('user_id, enabled')
  const off = new Set((prefs ?? []).filter(p => p.enabled === false).map(p => p.user_id as string))

  const emails: string[] = []
  for (const a of admins) {
    if (off.has(a.id as string)) continue
    const { data } = await supabase.auth.admin.getUserById(a.id as string)
    const email = data?.user?.email
    if (email) emails.push(email)
  }
  return emails
}

/** Invia a ogni destinatario; riesce se almeno uno ha ricevuto l'email. */
async function sendTo(emails: string[], subject: string, html: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) { console.error('[notify-admins] manca RESEND_API_KEY'); return false }
  let ok = 0
  for (const to of emails) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (res.ok) ok++
    else console.error('[notify-admins] Resend', res.status, await res.text())
  }
  return ok > 0
}

/**
 * "Prenota" gli eventi (sent_at) PRIMA di inviare: se trigger e cron arrivano insieme, uno solo
 * li invia. Se l'invio fallisce per tutti, vengono liberati e li riprova il prossimo giro.
 */
async function claimAndSend(ids: string[]): Promise<{ sent: number }> {
  if (ids.length === 0) return { sent: 0 }
  const { data: claimed, error } = await supabase
    .from('admin_event_queue')
    .update({ sent_at: new Date().toISOString() })
    .in('id', ids)
    .is('sent_at', null)
    .select('id, event_type, entity_id, payload, created_at')
    .order('created_at', { ascending: true })
  if (error || !claimed || claimed.length === 0) return { sent: 0 }

  const events = claimed as QueueEvent[]
  const to = await recipients()
  const delivered = to.length > 0 && (await sendTo(to, subjectFor(events), renderHtml(events)))

  if (!delivered) {
    // Nessun destinatario o invio fallito: si libera la coda. Senza destinatari restano in attesa
    // finché non scadono (MAX_AGE_DAYS): così non si perde nulla se si riattiva un admin.
    await supabase.from('admin_event_queue').update({ sent_at: null }).in('id', events.map(e => e.id))
    return { sent: 0 }
  }

  const types = [...new Set(events.map(e => e.event_type))]
  await supabase.from('admin_notification_rules').update({ last_sent_at: new Date().toISOString() }).in('event_type', types)
  return { sent: events.length }
}

/* ───────────────────────── modalità ───────────────────────── */

/** Un evento appena creato (frequenza "subito"). */
async function handleEvent(queueId: string) {
  const { data: ev } = await supabase.from('admin_event_queue').select('id, event_type, sent_at').eq('id', queueId).maybeSingle()
  if (!ev || ev.sent_at) return { skipped: 'già inviato o inesistente' }

  const { data: rule } = await supabase.from('admin_notification_rules').select('enabled, frequency').eq('event_type', ev.event_type).maybeSingle()
  // Se nel frattempo l'admin ha cambiato frequenza, l'evento lo prende il riepilogo
  if (!rule?.enabled || rule.frequency !== 'immediate') return { skipped: 'evento non più "subito"' }

  return await claimAndSend([ev.id])
}

/** Giro periodico: riepiloghi orari/giornalieri e recupero degli "subito" rimasti indietro. */
async function handleDue() {
  const now = new Date()
  const oldest = new Date(now.getTime() - MAX_AGE_DAYS * 86400_000).toISOString()

  // Pulizia: eventi inviati da oltre 30 giorni e non inviati da oltre MAX_AGE_DAYS
  await supabase.from('admin_event_queue').delete().lt('sent_at', new Date(now.getTime() - 30 * 86400_000).toISOString())
  await supabase.from('admin_event_queue').delete().is('sent_at', null).lt('created_at', oldest)

  const { data: rules } = await supabase.from('admin_notification_rules').select('event_type, enabled, frequency, last_sent_at')
  const { data: settings } = await supabase.from('admin_notification_settings').select('daily_hour').eq('id', true).maybeSingle()
  const dailyHour = settings?.daily_hour ?? 8

  const dueTypes: EventType[] = []
  for (const r of (rules ?? []) as Rule[]) {
    if (!r.enabled) continue
    const sinceMs = r.last_sent_at ? now.getTime() - new Date(r.last_sent_at).getTime() : Infinity
    if (r.frequency === 'immediate') dueTypes.push(r.event_type) // solo quelli rimasti indietro (vedi filtro sotto)
    else if (r.frequency === 'hourly' && sinceMs >= 55 * 60_000) dueTypes.push(r.event_type)
    else if (r.frequency === 'daily' && romeHour(now) === dailyHour && sinceMs >= 20 * 3600_000) dueTypes.push(r.event_type)
  }
  if (dueTypes.length === 0) return { sent: 0 }

  const immediate = new Set((rules ?? []).filter(r => r.frequency === 'immediate').map(r => r.event_type))
  const { data: pending } = await supabase
    .from('admin_event_queue')
    .select('id, event_type, created_at')
    .is('sent_at', null)
    .in('event_type', dueTypes)
    .gte('created_at', oldest)
  // Per "subito" si recuperano solo gli invii falliti: quelli di più di 2 minuti fa
  const ids = (pending ?? [])
    .filter(e => !immediate.has(e.event_type) || now.getTime() - new Date(e.created_at).getTime() > 2 * 60_000)
    .map(e => e.id as string)

  return await claimAndSend(ids)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expected = Deno.env.get('PUSH_FUNCTION_SECRET')
  if (!expected || req.headers.get('x-push-secret') !== expected) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  try {
    if (body.mode === 'event' && typeof body.queue_id === 'string') return json({ ok: true, ...(await handleEvent(body.queue_id)) })
    if (body.mode === 'due') return json({ ok: true, ...(await handleDue()) })
    return json({ error: 'mode non valido' }, 400)
  } catch (e) {
    console.error('[notify-admins] errore:', e)
    return json({ error: (e as Error)?.message ?? 'Errore interno' }, 500)
  }
})
