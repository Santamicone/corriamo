# Integrazione Strava — feed attività per crew private

Collega l'account Strava di un utente e sincronizza automaticamente le sue
**corse** (Run / TrailRun) nel feed delle **crew private** di cui fa parte.

## Modello dati (`supabase/strava.sql`, SQL #29)

- **`strava_connections`** — 1 riga per utente: token OAuth (`access_token`,
  `refresh_token`, `expires_at`), `strava_athlete_id`, `scope`.
  ⚠️ **Nessuna policy RLS** → i token si leggono/scrivono **solo con
  service-role** (callback OAuth + webhook). Il client non li vede mai.
- **`strava_activities`** — 1 riga per corsa importata (nessuna colonna
  `crew_id`: il feed è calcolato a runtime).
- **`profiles.strava_share_activities`** (bool, default `true`) — toggle di
  condivisione col feed, indipendente dalla connessione.
- **`shares_private_crew_with(uuid)`** — helper `SECURITY DEFINER` (come
  `is_active_crew_member`): vero se l'utente corrente condivide una crew
  **privata** con l'altro utente. Usato dalla policy SELECT di
  `strava_activities`.

**Visibilità feed:** un'attività è visibile a `U` se l'autore `A` condivide con
`U` almeno una crew `private` (entrambi `active`) **e** `A.strava_share_activities = true`.
Le crew **pubbliche** non mostrano il feed (decisione di privacy).

## Flusso

1. **Connessione** — `/profilo/modifica` → `StravaConnectCard` → link
   `GET /api/strava/connect` (genera `state` anti-CSRF in cookie httpOnly,
   scope `activity:read`) → consenso Strava → `GET /api/strava/callback`
   (verifica state, scambia i token, upsert connessione via service-role).
2. **Sync** — webhook Strava (`/api/strava/webhook`), non polling (rate limit
   stretti per-app). `create/update` → fetch dettaglio → importa solo se
   Run/TrailRun e non privata; `delete` → rimuove; deautorizzazione athlete →
   cancella connessione + attività.
3. **Feed** — `crew/[id]/page.tsx` carica `strava_activities` dei membri (solo
   se `visibility='private'` e sei membro); la RLS filtra alle sole condivise.
   Reso da `components/CrewActivityFeed.tsx`.
4. **Disconnessione** — `POST /api/strava/disconnect` → deauthorize su Strava +
   delete connessione e attività.

## Variabili d'ambiente

In `.env.local` (e su **Vercel** per la produzione):

```
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_WEBHOOK_VERIFY_TOKEN=<stringa a caso scelta da te>
```

`STRAVA_CLIENT_ID/SECRET` vengono da **strava.com/settings/api**. Il
**Authorization Callback Domain** dell'app Strava deve corrispondere al dominio
che serve `/api/strava/callback` (`localhost` in dev, `app.vieniacorrere.it` in
prod — si aggiorna nello stesso form, senza creare una seconda app).

## Registrazione del webhook (una tantum)

Il webhook va sottoscritto **dopo** che l'endpoint è pubblicamente
raggiungibile. In locale serve un tunnel (ngrok/cloudflared) verso
`/api/strava/webhook`.

```bash
npm run strava:webhook -- create https://app.vieniacorrere.it/api/strava/webhook
npm run strava:webhook -- list
npm run strava:webhook -- delete <subscription_id>
```

Alla `create` Strava chiama subito l'endpoint in GET con una challenge:
l'handler risponde con `hub.challenge` solo se `hub.verify_token` combacia con
`STRAVA_WEBHOOK_VERIFY_TOKEN`.

## Note e follow-up

- Il webhook elabora l'evento in modo sincrono prima di rispondere 200. Per
  volumi alti conviene accodare (queue/Edge Function) e processare async.
- **Evoluzione già prevista:** incrociare `start_date`+distanza dell'attività
  con le corse a cui l'utente ha partecipato per **auto-confermare la presenza**
  e alimentare `reliability_score` (vedi `lib/reliability.ts`), sostituendo il
  check-in manuale del Purple Screen.
- Import storico: il webhook copre solo le attività **nuove**. Un backfill delle
  attività recenti (`GET /athlete/activities`) alla prima connessione è un
  possibile miglioramento.
