// Edge Function: avvisa lo staff con un'email quando arriva una nuova segnalazione.
//
// Chiamata dal trigger trg_report_alert (supabase/report-alerts.sql):
//   POST { "report_id": "<uuid>" }  con header x-push-secret
//
// Deploy:  supabase functions deploy notify-report --project-ref <ref> --no-verify-jwt --use-api
// Secret:  PUSH_FUNCTION_SECRET (già presente, usato anche da send-push)
//          STAFF_ALERT_EMAIL    (destinatario degli avvisi)
//          RESEND_API_KEY       (già presente, usato dalle email)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FROM = 'Vieni a correre? <info@vieniacorrere.it>'
const ADMIN_URL = 'https://app.vieniacorrere.it/admin/segnalazioni'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Il testo della segnalazione è scritto da un utente: va neutralizzato prima di entrare nell'HTML. */
const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const LABELS: Record<string, string> = {
  runs: 'una corsa',
  run_chat: 'un messaggio della chat di una corsa',
  momenti: 'un momento (foto)',
  reviews: 'una recensione',
  profiles: 'un utente',
}

/** Una riga che descrive il contenuto segnalato (best effort: se non si trova resta l'id). */
async function describeEntity(table: string, id: string): Promise<string> {
  try {
    if (table === 'runs') {
      const { data } = await supabase.from('runs').select('title, date, city').eq('id', id).maybeSingle()
      if (data) return `Corsa “${data.title}” — ${data.date}, ${data.city}`
    } else if (table === 'run_chat') {
      const { data } = await supabase.from('run_chat').select('body').eq('id', id).maybeSingle()
      if (data) return `Messaggio: “${String(data.body).slice(0, 300)}”`
    } else if (table === 'profiles') {
      const { data } = await supabase.from('profiles').select('full_name, city').eq('id', id).maybeSingle()
      if (data) return `Utente ${data.full_name}${data.city ? ` (${data.city})` : ''}`
    }
  } catch (e) {
    console.error('[notify-report] describeEntity', e)
  }
  return `${table} ${id}`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expected = Deno.env.get('PUSH_FUNCTION_SECRET')
  if (!expected || req.headers.get('x-push-secret') !== expected) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  if (typeof body.report_id !== 'string') return json({ error: 'report_id richiesto' }, 400)

  const staffEmail = Deno.env.get('STAFF_ALERT_EMAIL')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!staffEmail || !resendKey) {
    console.error('[notify-report] manca STAFF_ALERT_EMAIL o RESEND_API_KEY')
    return json({ ok: true, skipped: 'config mancante' })
  }

  const { data: report, error } = await supabase
    .from('reports')
    .select('id, entity_table, entity_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(full_name), reported:profiles!reports_reported_user_id_fkey(full_name)')
    .eq('id', body.report_id)
    .maybeSingle()
  if (error || !report) return json({ error: 'segnalazione non trovata' }, 404)

  const reporter = (report.reporter as { full_name?: string } | null)?.full_name ?? 'utente sconosciuto'
  const reported = (report.reported as { full_name?: string } | null)?.full_name
  const label = LABELS[report.entity_table] ?? report.entity_table
  const entity = await describeEntity(report.entity_table, report.entity_id)

  const html = `<!DOCTYPE html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827;max-width:520px;margin:0 auto;padding:24px;">
<h2 style="margin:0 0 12px;">🚩 Nuova segnalazione</h2>
<p style="margin:0 0 16px;color:#374151;"><strong>${esc(reporter)}</strong> ha segnalato ${esc(label)}${reported ? ` di <strong>${esc(reported)}</strong>` : ''}.</p>
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Contenuto</p>
<p style="margin:0 0 16px;padding:10px 12px;background:#f3f4f6;border-radius:8px;">${esc(entity)}</p>
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Motivo indicato</p>
<p style="margin:0 0 20px;padding:10px 12px;background:#fff7ed;border-radius:8px;white-space:pre-wrap;">${esc(report.reason)}</p>
<p style="margin:0;"><a href="${ADMIN_URL}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:700;">Apri le segnalazioni</a></p>
<p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Le segnalazioni vanno gestite entro 24 ore (richiesta degli store per i contenuti generati dagli utenti).</p>
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: FROM, to: staffEmail, subject: `🚩 Segnalazione: ${label}`, html }),
  })
  if (!res.ok) {
    console.error('[notify-report] Resend', res.status, await res.text())
    return json({ error: 'invio email non riuscito' }, 502)
  }
  return json({ ok: true })
})
