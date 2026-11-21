# Integrazione Strava — ARCHIVIATA (staccata il 21/11/2026)

> **Stato: rimossa dal sito.** Non c'è più nessun collegamento Strava, né
> webhook, né dati Strava mostrati. Questo file documenta il perché e come
> completare/ripristinare il distacco. Il codice storico è nella git history
> (commit precedenti a "stacca integrazione Strava").

## Perché è stata rimossa

L'API Agreement e l'API Policy di Strava (**Effective Date: June 1, 2026**,
https://www.strava.com/legal/api e https://www.strava.com/legal/api_policy)
non consentono quello che facevamo:

- **Visualizzazione ad altri** — Agreement: "Strava Data provided by a specific
  user can only be displayed or disclosed in your Developer Application to that
  user"; Policy 2.3: non si possono mostrare dati di altri utenti "even if such
  data is publicly viewable". L'unica apertura è 5.13 (consenso espresso), ma 6.1
  è in tensione con 2.3. Feed crew, "Tutti gli allenamenti", profilo pubblico e
  badge derivati mostravano dati Strava a terzi.
- **Aggregazione** — Policy 5.4 vieta l'uso anche aggregato/anonimizzato per
  analytics: totali di gruppo e "insight" del feed.
- **Cache** — Policy 6.2: massimo 7 giorni; noi tenevamo le attività a tempo
  indeterminato. Policy 5.7: niente conservazione di dati di posizione.
- **Privacy** — Policy 7.1: rispettare la visibilità delle attività (scope
  `activity:read` include "Followers"; filtravamo solo `private`).
- **Dati derivati** — Policy 7.4: alla revoca vanno cancellati anche i dati
  derivati (es. presenze auto-confermate).

Il testo completo va riletto sulle URL ufficiali prima di una eventuale
reintroduzione: il documento può cambiare ("effective upon our posting").

## Cosa è stato fatto

- Rimossi: `src/app/api/strava/*`, `src/lib/strava/*`, `StravaConnectCard`,
  pagina `/crew/[id]/allenamenti`, `crewStats.ts`, sezione "Corse recenti" nel
  profilo, attività/insight dal feed crew (resta solo "nuovi ingressi"),
  script `strava:webhook`.
- Resta il campo **`profiles.strava_url`**: è un link scritto a mano dall'utente
  al proprio profilo Strava, non un dato ottenuto dall'API.
- Il badge presenze ("Si presenta"/"Sempre presente") resta, ma si basa solo sulle
  conferme **manuali** (check-in).

## Procedura di chiusura (in ordine)

1. Deploy del sito con questo distacco (push su `main`, dopo ok).
2. `npm run strava:detach` (dry-run: mostra connessioni/attività/subscription), poi
   `npm run strava:detach -- --apply` → revoca i token su Strava + elimina il webhook.
   Richiede in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`.
3. Applicare `supabase/strava-detach.sql` (SQL #46; rollback: `strava-detach-rollback.sql`,
   che NON ripristina i dati).
4. Eliminare l'app su https://www.strava.com/settings/api e le 3 env `STRAVA_*` da Vercel.
5. **Dopo la nuova versione dell'app mobile** (che toglie la sezione "Corse recenti"
   e il codice `strava_activities`) e dopo aver tolto il blocco "Strava: revoca" dall'Edge
   Function `delete-account`: eseguire la FASE 2 commentata in fondo a `strava-detach.sql`
   (DROP delle tabelle e delle colonne `strava_*` di `profiles`).
6. Aggiornare Privacy/Termini (menzioni Strava) e la dichiarazione "Fitness" in App Store
   Connect — vedi `docs/APP-STORE-PRIVACY.md`.

## Se in futuro si vuole reintrodurre Strava

Solo con dati mostrati **esclusivamente al proprietario**, cache ≤ 7 giorni, nessuna
aggregazione tra utenti, rispetto di `visibility`, link "View on Strava", e app Strava
approvata per più di 10 atleti (rate-limits: capacity 1 → 10 → review). Valutare prima
una conferma scritta di Strava (developers@strava.com) su Policy 2.3 vs 6.1.
