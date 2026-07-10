/**
 * Gestione della subscription webhook Strava (push notifications).
 *
 * Strava consente UNA sola subscription per applicazione. Va creata una volta
 * quando l'endpoint /api/strava/webhook è pubblicamente raggiungibile
 * (in produzione, oppure in locale via tunnel es. ngrok/cloudflared).
 *
 * Uso (con `node --env-file=.env.local`):
 *   npm run strava:webhook -- create https://app.vieniacorrere.it/api/strava/webhook
 *   npm run strava:webhook -- list
 *   npm run strava:webhook -- delete <subscription_id>
 *
 * Alla create, Strava chiama subito l'endpoint in GET con una challenge:
 * il nostro handler risponde con hub.challenge solo se hub.verify_token
 * combacia con STRAVA_WEBHOOK_VERIFY_TOKEN.
 *
 * Richiede in .env.local:
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   STRAVA_WEBHOOK_VERIFY_TOKEN
 */

const API = 'https://www.strava.com/api/v3/push_subscriptions'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Mancano STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET in .env.local')
  process.exit(1)
}

const [cmd, arg] = process.argv.slice(2)

async function list() {
  const url = `${API}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  const res = await fetch(url)
  console.log(res.status, JSON.stringify(await res.json(), null, 2))
}

async function create(callbackUrl) {
  if (!callbackUrl) { console.error('Manca la callback URL. Es: ...api/strava/webhook'); process.exit(1) }
  if (!VERIFY_TOKEN) { console.error('Manca STRAVA_WEBHOOK_VERIFY_TOKEN in .env.local'); process.exit(1) }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    callback_url: callbackUrl,
    verify_token: VERIFY_TOKEN,
  })
  const res = await fetch(API, { method: 'POST', body })
  console.log(res.status, JSON.stringify(await res.json(), null, 2))
}

async function del(id) {
  if (!id) { console.error('Manca il subscription_id da eliminare.'); process.exit(1) }
  const url = `${API}/${id}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  const res = await fetch(url, { method: 'DELETE' })
  console.log(res.status, res.status === 204 ? 'eliminata' : await res.text())
}

switch (cmd) {
  case 'list':   await list(); break
  case 'create': await create(arg); break
  case 'delete': await del(arg); break
  default:
    console.log('Comandi: list | create <callback_url> | delete <subscription_id>')
}
