# Integrazione Strava — feed attività per crew private

Collega l'account Strava di un utente e sincronizza automaticamente le sue
**corse** (Run / TrailRun) nel feed delle **crew private** di cui fa parte.

## Modello dati (`supabase/strava.sql`, SQL #29)

- **`strava_connections`** — 1 riga per utente: token OAuth (`access_token`,
  `refresh_token`, `expires_at`), `strava_athlete_id`, `scope`.
  ⚠️ **Nessuna policy RLS** → i token si leggono/scrivono **solo con
  service-role** (callback OAuth + webhook). Il client non li vede mai.
- **`strava_activities`** — 1 riga per corsa importata (nessuna colonna
  `crew_id`: il feed è calcolato a runtime). Campi mostrati: distanza, passo
  medio (`avg_pace_s_per_km`), tempo, dislivello (`total_elevation_gain_m`),
  **frequenza cardiaca media** (`avg_heartrate_bpm`, SQL #31) e link
  all'attività (`strava.com/activities/<strava_activity_id>`). L'HR si popola
  solo dalle attività (ri)sincronizzate dopo l'applicazione della #31.
- **`profiles.strava_share_activities`** (bool, default `true`) — toggle di
  condivisione col feed delle crew private, indipendente dalla connessione.
- **`profiles.strava_public_profile`** (bool, default `false`, SQL #30) — opt-in
  per mostrare le corse recenti anche sul **profilo pubblico** (`/profilo/[id]`,
  visibile a chiunque, anche non loggato). Indipendente dal toggle crew.
- **`shares_private_crew_with(uuid)`** — helper `SECURITY DEFINER` (come
  `is_active_crew_member`): vero se l'utente corrente condivide una crew
  **privata** con l'altro utente. Usato dalla policy SELECT di
  `strava_activities`.

**Visibilità attività** (policy SELECT su `strava_activities`) — un'attività è
leggibile se almeno una condizione è vera:
1. è la propria (`user_id = auth.uid()`);
2. l'autore ha `strava_public_profile = true` → visibile a **chiunque** (anche anon);
3. condivido una crew `private` con l'autore (entrambi `active`) **e** l'autore
   ha `strava_share_activities = true`.

Il feed compare sulla pagina di **ogni** crew (pubblica o privata) e per
**qualsiasi** visitatore: è la RLS a filtrare per viewer, quindi un anonimo o
un non-membro vede solo gli atleti con `strava_public_profile = true`, mentre un
membro di una crew privata vede anche chi condivide col feed
(`strava_share_activities = true`). Ai non-membri, se non c'è nulla di
condivisibile, la sezione non viene renderizzata.

## Flusso

1. **Connessione** — `/profilo/modifica` → `StravaConnectCard` → link
   `GET /api/strava/connect` (genera `state` anti-CSRF in cookie httpOnly,
   scope `activity:read`) → consenso Strava → `GET /api/strava/callback`
   (verifica state, scambia i token, upsert connessione via service-role).
2. **Sync** — webhook Strava (`/api/strava/webhook`), non polling (rate limit
   stretti per-app). `create/update` → fetch dettaglio → importa solo se
   Run/TrailRun e non privata; `delete` → rimuove; deautorizzazione athlete →
   cancella connessione + attività.
3. **Feed** — `crew/[id]/page.tsx` carica `strava_activities` di tutti i membri
   della crew (a prescindere da `visibility` e dall'essere membro); la RLS
   filtra alle sole attività visibili al viewer. Confluisce nel feed unificato
   `components/CrewFeed.tsx` (assemblato da `src/lib/crewFeed.ts`; `isMember`
   decide l'empty-state).
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

## Auto-conferma presenze (SQL #32)

Quando un'attività Strava combacia con una corsa a cui l'utente ha partecipato,
il backend conferma la presenza **in automatico**, senza il prompt manuale.

- **Match** (`lib/strava/attendance.ts`, `activityMatchesRun`, calcolo puro):
  - **tempo** — l'attività parte tra −15 e +45 min dal ritrovo (`parseRunDateTime`);
  - **distanza** — entro ±20% della `distance_km` (saltato se un dato manca);
  - **posizione** — se *entrambe* hanno coordinate e distano > 2 km → scartata;
    se le coordinate mancano (privacy zone) la posizione non blocca il match.
- **Orchestrazione** (`autoConfirmAttendance`, service-role): per ogni corsa
  passata (approvata, ≤35gg) senza conferma esistente e con un'attività
  compatibile → inserisce `run_confirmations(confirmed=true, source='strava')`
  + una **notifica** `presenza_confermata`. Idempotente e **solo additivo**
  (mai `confirmed=false`, mai sovrascrive una conferma manuale).
- **Hook**: chiamata da webhook (nuova attività) e da backfill (al collegamento).
- **Effetti**: la conferma alimenta il `reliability_score` dell'**organizzatore**
  (trigger #18) e il nuovo `attendance_score` del **partecipante** (#32).
- **Badge partecipante** (`getAttendanceBadge`): *"Si presenta"* (≥1 presenza)
  e *"Sempre presente"* (≥3 corse, score ≥80%), mostrati nel profilo.

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
