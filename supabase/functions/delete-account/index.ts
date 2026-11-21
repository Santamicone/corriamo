// Edge Function: elimina definitivamente l'account di chi la chiama.
//
// Richiede l'accesso dell'utente (JWT): si pubblica CON la verifica JWT attiva,
//   supabase functions deploy delete-account --project-ref <ref> --use-api
// (niente --no-verify-jwt). L'app chiede prima la password e solo dopo la richiama.
//
// Tutto ciò che è collegato all'utente sparisce con lui perché le tabelle sono
// legate a `profiles` con ON DELETE CASCADE (corse, partecipazioni, messaggi,
// recensioni, momenti, crew possedute, Strava, token push…). La funzione si
// occupa di ciò che la cascata NON copre o copre male:
//   - rifiuta gli admin e chi possiede crew con altri membri attivi;
//   - avvisa gli iscritti alle corse future (le notifiche NON sono legate alla
//     corsa, altrimenti sparirebbero insieme alla corsa);
//   - cancella i file dallo Storage (avatars, momenti, crew-covers);
//   - prova a revocare l'accesso a Strava.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Data odierna (YYYY-MM-DD) in ora italiana. */
function todayItaly(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Cancella ricorsivamente tutti i file sotto `prefix` di un bucket (best effort). */
async function removeAll(bucket: string, prefix: string): Promise<void> {
  try {
    const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
    if (!data) return
    const files: string[] = []
    const folders: string[] = []
    for (const item of data) (item.id ? files : folders).push(item.name)
    if (files.length) await admin.storage.from(bucket).remove(files.map((n) => `${prefix}/${n}`))
    for (const folder of folders) await removeAll(bucket, `${prefix}/${folder}`)
  } catch (e) {
    console.error('[delete-account] storage', bucket, prefix, e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── Chi è ──
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !auth.user) return json({ code: 'unauthenticated' }, 401)
  const uid = auth.user.id

  // ── Guardia 1: gli admin non si eliminano da qui (per non chiudere fuori lo staff) ──
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', uid).maybeSingle()
  if (profile?.is_admin) return json({ code: 'is_admin' }, 403)

  // ── Guardia 2: crew con altri membri attivi ──
  const { data: ownedCrews } = await admin.from('crews').select('id, name').eq('owner_id', uid)
  const blockingCrews: string[] = []
  const soloCrewIds: string[] = []
  for (const crew of ownedCrews ?? []) {
    const { count } = await admin
      .from('crew_members')
      .select('id', { count: 'exact', head: true })
      .eq('crew_id', crew.id)
      .eq('status', 'active')
      .neq('user_id', uid)
    if ((count ?? 0) > 0) blockingCrews.push(crew.name)
    else soloCrewIds.push(crew.id)
  }
  if (blockingCrews.length > 0) return json({ code: 'owns_crew', crews: blockingCrews }, 409)

  // ── Storage ──
  await removeAll('avatars', uid)
  await removeAll('momenti', uid)
  for (const crewId of soloCrewIds) await removeAll('crew-covers', crewId)

  // ── Strava: revoca (best effort, il token potrebbe essere scaduto) ──
  try {
    const { data: conn } = await admin.from('strava_connections').select('access_token').eq('user_id', uid).maybeSingle()
    if (conn?.access_token) {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.access_token}` },
      })
    }
  } catch (e) {
    console.error('[delete-account] strava', e)
  }

  // ── Avvisa gli iscritti alle corse future (approvati e in attesa) ──
  try {
    const { data: runs } = await admin
      .from('runs')
      .select('id, title, date, city')
      .eq('organizer_id', uid)
      .eq('status', 'aperta')
      .gte('date', todayItaly())

    const rows: Record<string, unknown>[] = []
    for (const run of runs ?? []) {
      const { data: parts } = await admin
        .from('participations')
        .select('user_id')
        .eq('run_id', run.id)
        .in('status', ['approvata', 'in_attesa'])
      const [, month, day] = String(run.date).split('-')
      for (const p of parts ?? []) {
        if (p.user_id === uid) continue
        rows.push({
          user_id: p.user_id,
          type: 'corsa_annullata',
          title: 'Corsa annullata',
          body: `${run.title} — ${day}/${month}, ${run.city}. L'organizzatore ha eliminato il suo account.`,
          // Nessun run_id né actor_id: le notifiche devono sopravvivere alla corsa e all'organizzatore
          run_id: null,
          actor_id: null,
        })
      }
    }
    for (let i = 0; i < rows.length; i += 500) {
      await admin.from('notifications').insert(rows.slice(i, i + 500))
    }
  } catch (e) {
    console.error('[delete-account] notifiche', e)
  }

  // ── Crew di cui era l'unico membro ──
  if (soloCrewIds.length > 0) await admin.from('crews').delete().in('id', soloCrewIds)

  // ── Elimina l'utente: la cascata porta via tutto il resto ──
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
  if (deleteError) {
    console.error('[delete-account] deleteUser', deleteError)
    return json({ code: 'delete_failed' }, 500)
  }

  return json({ ok: true })
})
