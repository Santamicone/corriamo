// Edge Function: elimina definitivamente l'account di chi la chiama.
//
// Richiede l'accesso dell'utente (JWT): si pubblica CON la verifica JWT attiva,
//   supabase functions deploy delete-account --project-ref <ref> --use-api
// (niente --no-verify-jwt). L'app chiede prima la password e solo dopo la richiama.
//
// Tutto ciò che è collegato all'utente sparisce con lui perché le tabelle sono
// legate a `profiles` con ON DELETE CASCADE (corse, partecipazioni, messaggi,
// recensioni, momenti, crew possedute, token push…). La funzione si
// occupa di ciò che la cascata NON copre o copre male:
//   - rifiuta gli admin e chi possiede crew con altri membri attivi;
//   - avvisa gli iscritti alle corse future (le notifiche NON sono legate alla
//     corsa, altrimenti sparirebbero insieme alla corsa);
//   - cancella i file dallo Storage (avatars, momenti, crew-covers).
// (L'integrazione Strava è stata rimossa il 21/11/2026: niente più revoca token.)
//
// Accedi con Apple: chi è entrato con Apple deve vedere revocato il collegamento quando
// elimina l'account (regola di Apple). L'app ripete l'accesso con Apple e manda
// `{ appleAuthorizationCode }` nel corpo; qui il codice diventa un refresh token che si
// revoca (best effort, DOPO l'eliminazione). Servono i secret APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY (contenuto del file .p8) e, se diverso, APPLE_CLIENT_ID (bundle id).
// Se mancano, la revoca viene saltata e l'eliminazione va avanti.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Revoca il collegamento "Accedi con Apple" a partire dal codice di autorizzazione dell'app. */
async function revokeAppleAuthorization(authorizationCode: string): Promise<void> {
  const teamId = Deno.env.get('APPLE_TEAM_ID')
  const keyId = Deno.env.get('APPLE_KEY_ID')
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY')
  const clientId = Deno.env.get('APPLE_CLIENT_ID') ?? 'it.vieniacorrere.app'
  if (!teamId || !keyId || !privateKey) {
    console.warn('[delete-account] revoca Apple saltata: secret APPLE_* mancanti')
    return
  }

  // Client secret = JWT firmato con la chiave .p8 (ES256), valido pochi minuti
  const key = await importPKCS8(privateKey.replace(/\\n/g, '\n'), 'ES256')
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key)

  const form = (fields: Record<string, string>) =>
    new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...fields })

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ code: authorizationCode, grant_type: 'authorization_code' }),
  })
  if (!tokenRes.ok) {
    console.error('[delete-account] Apple token', tokenRes.status, await tokenRes.text())
    return
  }
  const { refresh_token: refreshToken } = await tokenRes.json()
  if (!refreshToken) return

  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ token: refreshToken, token_type_hint: 'refresh_token' }),
  })
  if (!revokeRes.ok) console.error('[delete-account] Apple revoke', revokeRes.status, await revokeRes.text())
}

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

  // Codice Apple (solo per chi è entrato con Apple); un corpo assente o non valido va bene
  let appleAuthorizationCode: string | null = null
  try {
    const body = await req.json()
    if (typeof body?.appleAuthorizationCode === 'string') appleAuthorizationCode = body.appleAuthorizationCode
  } catch { /* nessun corpo */ }

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

  // ── Apple: revoca il collegamento (l'account non esiste più: un errore qui non blocca nulla) ──
  if (appleAuthorizationCode) {
    try {
      await revokeAppleAuthorization(appleAuthorizationCode)
    } catch (e) {
      console.error('[delete-account] revoca Apple', e)
    }
  }

  return json({ ok: true })
})
