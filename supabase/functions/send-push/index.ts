// Edge Function: invia le push (Expo Push API) per una riga di `notifications`.
//
// Chiamata da:
//   - trigger trg_push_immediate  → { "notification_id": "<uuid>" }
//   - cron push-due-every-5min    → { "mode": "due" }   (promemoria scaduti + recuperi)
//
// Deploy:  supabase functions deploy send-push --no-verify-jwt
// Secret:  PUSH_FUNCTION_SECRET (uguale a "push_function_secret" nel Vault)
//          EXPO_ACCESS_TOKEN    (facoltativo, da expo.dev → Access tokens)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const DUE_WINDOW_HOURS = 12   // mai push per notifiche scadute da più di così
const DUE_BATCH = 200

// Tenere allineato con call_send_push() (ultima versione: supabase/crew-messages.sql, #62)
const PUSH_TYPES = new Set([
  'richiesta_approvata', 'richiesta_rifiutata', 'nuova_richiesta',
  'corsa_annullata', 'corsa_modificata', 'promemoria_corsa',
  'crew_join_request', 'crew_request_approved', 'crew_new_run',
  'nuovo_messaggio', 'chat_corsa', 'proposta_adottata', 'sollecito_ritrovo',
  'messaggio_crew',
])

// Push che hanno senso solo sul momento: oltre questo tempo non si inviano più (né il cron le
// ritenta), e Expo/Apple le scartano se il telefono non è raggiungibile
const SHORT_LIVED_SECONDS: Record<string, number> = { sollecito_ritrovo: 15 * 60 }

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface ExpoTicket {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

/** Invia la push per una notifica. Ritorna quante push sono partite. */
async function processOne(id: string): Promise<number> {
  // "Claim" atomico: se trigger e cron arrivano insieme, solo uno prosegue
  const { data: claimed } = await supabase
    .from('notifications')
    .update({ push_sent: true })
    .eq('id', id)
    .eq('push_sent', false)
    .select('id, user_id, type, title, body, run_id, show_after')
    .maybeSingle()

  if (!claimed) return 0   // già inviata o inesistente

  const release = () => supabase.from('notifications').update({ push_sent: false }).eq('id', id)

  // Promemoria non ancora scaduto: rilascia, ci penserà il cron
  if (new Date(claimed.show_after) > new Date()) {
    await release()
    return 0
  }
  if (!PUSH_TYPES.has(claimed.type)) return 0   // tipo senza push: resta segnata
  const ttl = SHORT_LIVED_SECONDS[claimed.type]
  if (ttl && Date.now() - new Date(claimed.show_after).getTime() > ttl * 1000) return 0   // troppo tardi

  const { data: profile } = await supabase
    .from('profiles').select('push_enabled').eq('id', claimed.user_id).maybeSingle()
  if (!profile || profile.push_enabled === false) return 0

  const { data: tokens } = await supabase
    .from('push_tokens').select('token').eq('user_id', claimed.user_id)
  if (!tokens || tokens.length === 0) return 0

  const messages = tokens.map((t) => ({
    to: t.token,
    title: claimed.title,
    ...(claimed.body ? { body: claimed.body } : {}),
    sound: 'default',
    priority: 'high',
    ...(ttl ? { ttl } : {}),
    data: { notification_id: claimed.id, type: claimed.type, run_id: claimed.run_id },
  }))

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN')
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`

  let tickets: ExpoTicket[]
  try {
    const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) })
    if (!res.ok) throw new Error(`Expo ${res.status}: ${await res.text()}`)
    tickets = (await res.json()).data
  } catch (err) {
    await release()   // il cron riproverà entro DUE_WINDOW_HOURS
    throw err
  }

  // Token non più validi (app disinstallata, permesso revocato): si eliminano
  const dead: string[] = []
  tickets.forEach((t, i) => {
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') dead.push(tokens[i].token)
    else if (t.status === 'error') console.error('[send-push] ticket error', t.message)
  })
  if (dead.length > 0) await supabase.from('push_tokens').delete().in('token', dead)

  return tickets.filter((t) => t.status === 'ok').length
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const expected = Deno.env.get('PUSH_FUNCTION_SECRET')
  if (!expected || req.headers.get('x-push-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401)
  }

  const body = await req.json().catch(() => ({}))
  let ids: string[] = []

  if (typeof body.notification_id === 'string') {
    ids = [body.notification_id]
  } else if (body.mode === 'due') {
    const now = new Date()
    const since = new Date(now.getTime() - DUE_WINDOW_HOURS * 3600_000)
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('push_sent', false)
      .lte('show_after', now.toISOString())
      .gt('show_after', since.toISOString())
      .in('type', [...PUSH_TYPES])
      .order('show_after', { ascending: true })
      .limit(DUE_BATCH)
    if (error) return json({ error: error.message }, 500)
    ids = (data ?? []).map((r) => r.id)
  } else {
    return json({ error: 'notification_id o mode=due richiesti' }, 400)
  }

  let sent = 0
  let failed = 0
  for (const id of ids) {
    try {
      sent += await processOne(id)
    } catch (err) {
      failed++
      console.error('[send-push]', id, err)
    }
  }

  return json({ ok: true, processed: ids.length, sent, failed })
})
