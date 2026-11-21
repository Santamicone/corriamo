# PROJECT_STATUS.md — Vieni a correre?

> ⚠️ **21/11/2026 — Integrazione Strava STACCATA dal sito** (policy API Strava, Effective Date 1/6/2026: vietato mostrare dati di un atleta ad altri utenti, aggregarli, tenerli in cache >7gg). Codice rimosso dal web; **SQL #46 `strava-detach.sql` (+ `strava-detach-rollback.sql`) scritto, NON applicato**; script `npm run strava:detach` da lanciare PRIMA del SQL. L'app mobile (in revisione Apple) non è stata toccata: la sezione "Corse recenti" si svuota da sola quando le righe vengono cancellate. Procedura completa e motivi in `docs/STRAVA.md`. Le sezioni "Strava" più sotto sono storiche.

> Documento di stato del progetto per il ripristino del contesto in una nuova sessione Claude Code.  
> Aggiornato al: **novembre 2026** (stato al 06/11) — nasce l'**app mobile nativa** (repo separato privato `Santamicone/vieniacorrere-app`, Expo/React Native, stesso Supabase). Lato backend di questo repo: **push notification** (SQL **#41** `push-tokens.sql` ✅ applicato in produzione + Edge Function `send-push` ✅ pubblicata + cron `push-due-every-5min` ✅ attivo), **blocco utenti** (SQL **#42** `user-blocks.sql` ⏳ da applicare), **avviso email allo staff per ogni segnalazione** (SQL **#43** `report-alerts.sql` + Edge Function `notify-report` ⏳ da applicare/pubblicare), **eliminazione account** (Edge Function `delete-account` ⏳ da pubblicare) e nuova pagina pubblica **`/elimina-account`** (richiesta da Google Play, ⏳ da pubblicare). Il template email *Reset Password* contiene ora il codice `{{ .Token }}` per il recupero password dell'app (⏳ da incollare nel Dashboard). Bozza schede privacy e note per gli store in **`docs/APP-STORE-PRIVACY.md`**. Dettagli nelle sezioni 4, 6 e 9.
>
> Aggiornato al: **luglio 2026** — nuova **Integrazione Strava** (SQL #29–#31, in produzione): connessione OAuth per utente + **sincronizzazione automatica delle corse** via webhook, con **feed attività per le crew private** e opzione di visibilità **sul profilo pubblico** (opt-in). Backfill degli ultimi 30 giorni al primo collegamento. Card di collegamento in `/profilo/modifica` con due toggle indipendenti (crew / profilo pubblico). Dati mostrati: distanza, passo, tempo, dislivello, **frequenza cardiaca media**, link all'attività su Strava. Documentazione completa in **`docs/STRAVA.md`**.
>
> Aggiornato al: **luglio 2026** — allineamento stato reale: il ramo di sviluppo è stato **mergiato su `main`** (che ora è il branch attivo e gira in produzione) e le migrazioni **#27 `races-moderation.sql` e #28 `admin.sql` risultano APPLICATE in produzione** (verificate via query read-only sul DB: `profiles.is_admin`, `races.status`, `user_moderation`, `admin_actions`, `reports`, `admin_recovery_codes`, `runs.hidden_by_admin`, `profiles.moderation_status` tutte presenti). Completati anche: voce **Strumenti** nel menu Extra dell'Header e ripristino GPX Firenze (maratona completa).
> Aggiornato al: **luglio 2026** — nuova funzionalità **Calendario gare** (`/calendario-gare`, PR #106–#109): catalogo di eventi reali (`races`) con import automatico (AIMS ICS + costanti Major/SuperHalfs), pagina lista/scheda con SEO (JSON-LD `SportsEvent`), tool **"Trova la tua gara ideale"** (`/tools/gara-ideale`), ponte community (`runs.race_id` + CTA precompilata + "Chi ci va?") e **segnalazioni utenti moderate**. Documentazione completa in **`docs/CALENDARIO-GARE.md`**.
>
> Aggiornato al: **luglio 2026** — nuovo tool **"Strategia gara intelligente"** (`/tools/strategia-gara`): l'utente carica il **GPX** del percorso e il passo ideale su piatto, indica le condizioni (meteo, vento, fondo, affollamento, approccio) e ottiene passo reale per km, tempo finale ±margine, split, tratti critici, profilo altimetrico e un **commento strategico generato dalle caratteristiche del percorso** (regole trasparenti, `buildRaceComment`). Tutto client-side: motore di calcolo puro in `src/lib/running/gpx.ts` + `raceStrategy.ts`, nessun DB e nessuna API esterna.
>
> Aggiornato al: **luglio 2026** — profilo fisico nel tool **"Da dove inizio?"** (PR #90): aggiunti alla scheda iniziale i campi **altezza** e **genere** (oltre a peso ed età). Il rapporto altezza/peso (BMI) genera note prudenziali nell'esito: sovrappeso evidente (≥30) / lieve (≥25) / sottopeso (<18.5, con frase dedicata alle donne) + nota gentile se obiettivo "dimagrire" con BMI già <25. Tutti i campi fisici sono facoltativi.
>
> Aggiornato al: **luglio 2026** — esteso il tool **"Da dove inizio?"** (`/tools/da-dove-inizio`): scheda iniziale profilo (età, peso, storia sportiva), scheda multi-selezione sui blocchi che frenano la corsa, esito ampliato (nota profilo, piccoli obiettivi, come superare i blocchi, trucchi per non mollare). Nuovi tipi di step dichiarativi `form` e `multi`. Mergiata su `main` (PR #88).
>
> Aggiornato al: **giugno 2026** — aggiunta sezione **Strumenti per runner** (`/tools`): calcolatore zone di passo, predittore tempi gara, test "da dove inizio?" + backend email scheda ritmi. Mergiata su `main`. Allineamento stato reale produzione: tutti gli SQL #18–#24 ed Edge Functions email risultano applicati e attivi (crew, reliability ed email funzionanti in prod)

---

## 1. Panoramica

**App:** Vieni a correre? — web app per runner che vogliono proporre corse, trovare compagni e gestire appuntamenti singoli o ricorrenti.  
**URL produzione:** https://www.vieniacorrere.it  
**Repository:** https://github.com/Santamicone/corriamo  
**Branch attivo:** `main` (il ramo `feat/ui-ux-redesign` è stato mergiato; lo sviluppo procede via feature branch → PR su `main`)

---

## 2. Stack tecnico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework | Next.js App Router | 16.2.7 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 (CSS-based config in `globals.css`) | 4.x |
| Database / Auth | Supabase (PostgreSQL + RLS + Realtime) | 2.107.x |
| Auth helpers | @supabase/ssr | 0.10.x |
| Mappa | Leaflet + React-Leaflet | 1.9 / 5.0 |
| OG Images | next/og (ImageResponse) | built-in |
| Date | date-fns | 4.x |
| Icons | Material Symbols Outlined (Google Fonts CDN) | — |
| Font | Plus Jakarta Sans (Google Fonts CDN) | — |
| Hosting | Vercel | — |

---

## 3. Variabili d'ambiente

### `.env.local` (sviluppo)
```env
NEXT_PUBLIC_SUPABASE_URL=https://wshjtgtmxbxhpdqtxpiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Vercel (produzione)
```
NEXT_PUBLIC_SUPABASE_URL  → https://wshjtgtmxbxhpdqtxpiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY → eyJhbGci... (JWT legacy)
NEXT_PUBLIC_SITE_URL → https://vieniacorrere.it   ← IMPORTANTE per email redirect
RESEND_API_KEY → re_...   ← invio email dalle API route Next (es. scheda ritmi tool)
SUPABASE_SERVICE_ROLE_KEY → eyJhbGci... (service_role legacy) ← firma token unsubscribe lato Next
STRAVA_CLIENT_ID → ...            ← OAuth Strava (da strava.com/settings/api)
STRAVA_CLIENT_SECRET → ...        ← OAuth Strava (sensibile)
STRAVA_WEBHOOK_VERIFY_TOKEN → ... ← stringa scelta da noi; deve combaciare tra .env.local e Vercel
```

> Le 3 variabili `STRAVA_*` servono anche in `.env.local` (lo script `strava:webhook` e i test girano in locale). Il *Authorization Callback Domain* su Strava è `app.vieniacorrere.it` (in dev era `localhost`).

> Nota: `RESEND_API_KEY` esiste anche come secret delle Edge Functions Supabase (ambiente separato).
> Le API route Next girano su Vercel, quindi la chiave va presente **anche** nelle env di Vercel.

---

## 4. Database Supabase

**Progetto:** `corriamo`  
**Ref:** `wshjtgtmxbxhpdqtxpiq`

### Ordine esecuzione SQL

| # | File | Stato | Contenuto |
|---|---|---|---|
| 1 | `supabase/schema.sql` | ✅ | `profiles`, `runs`, `series`, `participations` + RLS |
| 2 | `supabase/trigger-new-user.sql` | ✅ | Trigger auto-crea profilo alla registrazione |
| 3 | `supabase/messages.sql` | ✅ | Tabella `messages` + RLS |
| 4 | `supabase/reviews.sql` | ✅ | Tabella `reviews` + RLS + trigger updated_at |
| 5 | `supabase/add-coordinates.sql` | ✅ | Colonne `lat`, `lng` su `runs` |
| 6 | `supabase/storage-avatars.sql` | ✅ | Bucket `avatars` + RLS policies |
| 7 | `supabase/notifications.sql` | ✅ | Tabella `notifications` + 4 trigger automatici |
| 8 | `supabase/add-spot.sql` | ✅ | Colonna `is_spot boolean` su `runs` |
| 9 | `supabase/momenti.sql` | ✅ | Tabella `momenti` + bucket `momenti` Storage |
| 10 | `supabase/add-tags.sql` | ✅ | Colonna `tags text[]` su `runs` e `series` |
| 11 | `supabase/add-gara.sql` | ✅ | Colonne gara su `runs`: type, race_name, race_distance, race_target_time, race_registered, looking_for |
| 12 | `supabase/add-profile-fields.sql` | ✅ | Nuovi campi profilo: age, why_i_run, pb_5k/10k/21k/42k + nuovi livelli |
| 13 | `supabase/run-chat.sql` | ✅ | Tabella `run_chat` (chat di gruppo) + RLS |
| 14 | `supabase/check-ins.sql` | ✅ | Tabella `check_ins` (Purple Screen ritrovo) + RLS |
| 15 | `supabase/add-interests.sql` | ✅ | Tabella `interests` ("Mi interessa") + RLS |
| 16 | `supabase/add-location-public.sql` | ✅ | Colonna `location_public boolean` su `runs` |
| 17 | `supabase/add-filter-by-city.sql` | ✅ | Colonna `filter_by_city boolean` su `profiles` |
| 18 | `supabase/reliability.sql` | ✅ | Tabella `run_confirmations` + colonne `reliability_*` su `profiles` + funzione score + 4 trigger |
| 19 | `supabase/crews.sql` | ✅ | Tabelle `crews` + `crew_members` + RLS + 4 trigger + colonne `crew_id`, `run_visibility` su `runs` |
| 20 | `supabase/crew-invites.sql` | ✅ | Tabella `crew_invites` + RLS |
| 21 | `supabase/crews-fix-rls.sql` | ✅ | Fix ricorsione RLS crews/crew_members — funzioni SECURITY DEFINER |
| 22 | `supabase/edit-run.sql` | ✅ | Permessi e trigger per modifica corsa (blocco <2h dalla partenza) |
| 23 | `supabase/email-notifications.sql` | ✅ | Tabella `email_notifications` + preferenze utente + unsubscribe token |
| 24 | `supabase/email-triggers.sql` | ✅ | Trigger DB che accodano email (partecipazione, approvazione, ecc.) |
| 25 | `supabase/races.sql` | ✅ | Catalogo gare `races` (calendario gare) + RLS + indici + unique `(source, external_ref)` |
| 26 | `supabase/add-race-id.sql` | ✅ | Colonna `race_id` su `runs` → ponte post community ↔ catalogo `races` |
| 27 | `supabase/races-moderation.sql` | ✅ | `profiles.is_admin` + policy admin su `races` (modera pending) + nomina admin owner |
| 28 | `supabase/admin.sql` | ✅ | Sezione backend admin: `user_moderation` (ban graduale) + colonne moderazione su `profiles`, `admin_actions` (audit), soft-delete `hidden_by_admin` su runs/series/momenti/reviews/run_chat, `reports`, `admin_recovery_codes`, funzioni `is_admin_aal2()`/`is_active_user()`, RLS (admin AAL2 + blocco scrittura sospesi/bannati). Verifica: `supabase/admin-verify.sql`. **Richiede MFA TOTP abilitato in Dashboard.** |
| 29 | `supabase/strava.sql` | ✅ | Integrazione Strava: `strava_connections` (token OAuth, **nessuna policy** → solo service-role), `strava_activities` (corse importate), `profiles.strava_share_activities`, helper `shares_private_crew_with()` + RLS feed (attività visibili a chi condivide una crew **privata** con l'autore che condivide). Vedi `docs/STRAVA.md`. |
| 30 | `supabase/strava-public-profile.sql` | ✅ | Strava: `profiles.strava_public_profile` (opt-in, default false) + RLS feed aggiornata → attività visibili anche sul profilo pubblico se l'utente lo abilita. |
| 31 | `supabase/strava-heartrate.sql` | ✅ | Strava: `strava_activities.avg_heartrate_bpm`. Si popola dalle attività sincronizzate/ri-sincronizzate dopo l'applicazione. |
| 32 | `supabase/strava-attendance.sql` | ⏳ da applicare | **Modificato il 21/11/2026**: niente più `strava_activities.start_lat/lng`; resta `run_confirmations.source` + colonne `profiles.attendance_*` + `update_attendance_score()` + trigger (attendance_score sulle sole conferme manuali, dopo il distacco Strava). |
| 46 | `supabase/strava-detach.sql` | ✅ applicato il 21/11/2026 (FASE 2 → #47 `strava-detach-fase2.sql`, ⏳ da applicare dopo l'adozione della 1.0.1) | **Distacco Strava**: cancella `run_confirmations` con `source='strava'`, `strava_activities`, `strava_connections`; droppa la policy `strava_activities_select` e `shares_private_crew_with()`; spegne i flag `strava_*` su `profiles`. Tabelle/colonne restano (compatibilità app in revisione + Edge Function `delete-account`); DROP definitivo nella FASE 2 commentata. **Irreversibile sui dati.** Rollback: `strava-detach-rollback.sql` (solo policy/funzione). |
| 33 | `supabase/crew-enhancements.sql` | ✅ | Potenziamento crew: `crews.slug` (UNIQUE, URL personalizzato) + `crews.cover_url` (immagine di testata) + funzione `crew_slugify()` + backfill slug; tabella `crew_posts` (bacheca del coach) + RLS + trigger notifica `crew_new_post`; bucket Storage `crew-covers` (scrittura ristretta agli admin della crew). |
| 35 | `supabase/crew-chat.sql` | ✅ | **Chat di gruppo privata della crew** (`crew_chat`, specchio di `run_chat`): scrivono/leggono **solo i membri attivi** (anche per crew pubbliche), delete dell'autore o admin/owner (moderazione). RLS via helper `is_active_crew_member` / `is_crew_admin`. Aggiunge `crew_chat` a `supabase_realtime`. Distinta da `crew_posts` (bacheca unidirezionale) e `run_chat` (chat del singolo evento). |
| 34 | `supabase/crew-members-public-visibility.sql` | ✅ | Coerenza pagina crew. (a) `crew_members_select`: i membri **attivi** di una crew **pubblica** sono leggibili anche dagli anonimi (allinea la lista membri allo stat aggregato di `crew_stats`; il fix era già live in prod via hotfix Dashboard con helper `is_public_crew`, ora standardizzato su `crew_is_public`). (b) `crew_posts_select`: **bacheca del coach ristretta ai soli membri attivi** (rimossa la clausola crew pubblica). Front-end: `CrewBoard` renderizzata solo se `isMember` in `crew/[id]/page.tsx`. |
| 37 | `supabase/crew-attendance.sql` | ⏳ da applicare | **Presenze rapide "Ci sono" (Step 3 area crew).** Due funzioni `SECURITY DEFINER`: `run_going_roster(run_id)` restituisce il roster dei confermati (nome+avatar) aggirando la RLS di `participations` (che nasconde le partecipazioni altrui), con guard di visibilità (corsa pubblica / membro attivo / organizzatore); `crew_confirm_attendance(run_id)` conferma immediatamente il **membro attivo** della crew (insert `in_attesa`→update `approvata` per riusare i trigger di notifica + promemoria 24h esistenti). L'annulla usa la DELETE diretta (RLS già consente). Alimenta `NextOutingCard` + `AttendanceButton`. Nessuna modifica ai trigger esistenti. |
| 36 | `supabase/community-impact.sql` | ⏳ da applicare | **Gamification Fase 1 (variante "RPC al volo")** — vedi `docs/GAMIFICATION.md` §7. Due funzioni read-only `SECURITY DEFINER` che calcolano l'impatto sociale dai segnali già verificati (`run_confirmations.confirmed` / `check_ins`), senza nuove tabelle/colonne/trigger: `crew_impact_stats(crew_id)` (persone diverse coinvolte / tornate / prime uscite del gruppo) e `user_impact_stats(user_id)` (eventi verificati, partecipazioni generate, persone coinvolte/abituali/newcomer di un organizzatore). Alimentano la `ImpactCard` su pagina crew ("L'impatto della crew") e profilo ("Runner ispirati"). Le colonne `ci_*` + trigger restano per la Fase 2. |
| 38 | `supabase/add-location-public-series.sql` | ✅ | Colonna `location_public boolean` su `series` (fix bug: mancava, creazione serie falliva) |
| 39 | `supabase/add-series-status.sql` | ✅ | Colonna `status text` (`attiva`\|`in_pausa`) su `series` — pausa serie senza eliminarla |
| 40 | `supabase/add-series-coorganizer.sql` | ✅ | Colonna `co_organizer_id uuid` su `series` + policy update estesa al co-organizzatore |
| 41 | `supabase/push-tokens.sql` | ✅ (06/11/2026) | **Push dell'app mobile.** Tabella `push_tokens` (RLS: select/delete solo propri), RPC `register_push_token()` (SECURITY DEFINER: riassegna il token se lo stesso telefono cambia account), colonne `profiles.push_enabled` e `notifications.push_sent`, trigger `trg_push_immediate` (AFTER INSERT su `notifications` per i tipi con push e `show_after` già passato, chiama `send-push`), job pg_cron `push-due-every-5min` (promemoria con `show_after` scaduto, finestra 12 h). Richiede **Vault** con secret `push_function_secret`. Rollback: `push-tokens-rollback.sql`. Verificato end-to-end sul cron (risposta 200 della funzione); il trigger immediato e la consegna reale si provano con build + telefono. |
| 42 | `supabase/user-blocks.sql` | ✅ applicato (21/11/2026) | **Blocco utenti** dell'app: tabella `user_blocks(blocker_id, blocked_id)` con RLS (ognuno vede/crea/toglie solo i propri blocchi). Il filtro è applicato dall'app (bacheca, chat, richieste, notifiche): NON ci sono policy sulle altre tabelle. Rollback: `user-blocks-rollback.sql`. |
| 43 | `supabase/report-alerts.sql` | ✅ applicato (21/11/2026; invio email reale non ancora provato) | **Avviso staff sulle segnalazioni**: trigger `trg_report_alert` su `reports` → Edge Function `notify-report` (email via Resend a `STAFF_ALERT_EMAIL`, impostato su info@vieniacorrere.it). Riusa il secret Vault `push_function_secret`. Rollback: `report-alerts-rollback.sql`. |
| 44 | `supabase/run-notifications.sql` | ✅ applicato e provato su iPhone (21/11/2026: modifica corsa, push chat, anti-spam; `send-push` ripubblicata) | **Fix notifiche**: (A) trigger `on_run_modified` su `runs` → `corsa_modificata` ai partecipanti (prima l'INSERT da client era bloccato da "No direct insert"; tolto da `EditRunForm` e dall'app); (B) trigger `on_run_chat_message` su `run_chat` → nuovo tipo `chat_corsa` con anti-spam (una notifica per corsa ogni 10 min, i messaggi successivi aggiornano la stessa → una sola push); `call_send_push()` ridefinita con `'chat_corsa'`; (C) `run_confirmations.user_id` default `auth.uid()`. Dopo: `supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api`. Rollback: `run-notifications-rollback.sql`. |
| 45 | `supabase/run-counts-reminders.sql` | ✅ applicato (21/11/2026; `send-immediate` ripubblicata, cron verificato: 200 `{"ok":true,"processed":0,...}`; invio reale di un promemoria non ancora provato) | **(A)** funzione `run_participant_counts(uuid[])` SECURITY DEFINER: numero di approvati per corsa (la RLS di `participations` nasconde le righe altrui → conteggi sbagliati per i non-organizzatori, sempre 0 per anon: landing condivisione e immagine OG). Usata da bacheca, dettaglio, landing, OG del sito e dall'app (`fetchApprovedCounts`, con ripiego sul conteggio diretto se la funzione manca). **(B)** cron `email-reminders-every-15min` → `send-immediate` `{"mode":"due"}` con header `x-push-secret` (Vault `push_function_secret`). La nuova `send-immediate` ignora le notifiche con `show_after` futuro (prima l'email `promemoria_corsa` partiva subito all'approvazione) e va pubblicata **prima** con `--no-verify-jwt --use-api` (si autentica col segreto o con la service role key del trigger). Rollback: `run-counts-reminders-rollback.sql`. Resta aperto: i nomi di "Chi ci sarà" restano visibili solo a organizzatore e partecipante (scelta di privacy da confermare); promemoria calcolato con `(date+time)::timestamptz` in UTC → arriva 1–2 h dopo le 24 h esatte |

### Schema tabelle aggiornato

```
profiles         id, full_name, city, level, pace_min, pace_max, bio,
                 strava_url, garmin_url, instagram_url, avatar_url,
                 age, why_i_run text[], pb_5k, pb_10k, pb_21k, pb_42k,
                 filter_by_city boolean,
                 reliability_score numeric(5,2), reliability_eligible numeric(5,2),
                 reliability_confirmed numeric(5,2),
                 strava_share_activities boolean (feed crew, default true),
                 strava_public_profile boolean (profilo pubblico, default false),
                 attendance_score numeric(5,2), attendance_eligible numeric(6,2),
                 attendance_confirmed numeric(6,2)  (presenze partecipante),
                 push_enabled boolean default true  (SQL #41 — interruttore push dell'app)

runs             id, organizer_id, series_id, title, description, date, time,
                 location, city, lat, lng, distance_km, pace_target, level,
                 max_participants, status, is_no_drop, is_spot, tags text[],
                 type (allenamento|gara), race_name, race_distance (5k|10k|21k|42k),
                 race_target_time, race_registered, looking_for text[],
                 location_public boolean, race_id (→ races.id, nullable)

races            id, slug, name, city, region, country, event_date, end_date,
                 distances text[], race_type, level_hint, elevation_m,
                 course_profile text[], participants_est, official_url,
                 registration_status, circuit, tags text[], gpx_path, featured,
                 source (editoriale|utente|aims|fidal), external_ref, status,
                 created_by, created_at, updated_at

series           id, organizer_id, title, description, location, city,
                 recurrence_type, recurrence_day, recurrence_time, start_date,
                 distance_km, pace_target, level, max_participants, is_no_drop, tags text[],
                 location_public boolean, status (attiva|in_pausa), co_organizer_id uuid

participations   id, run_id, user_id, status (in_attesa|approvata|rifiutata), message

interests        id, run_id, user_id, created_at — UNIQUE(run_id, user_id)

messages         id, run_id, sender_id, recipient_id, body, read_at

reviews          id, run_id, reviewer_id, reviewed_id, rating (1-5), body,
                 UNIQUE(run_id, reviewer_id)

notifications    id, user_id, type, title, body, run_id, actor_id, read, show_after,
                 email_sent, push_sent boolean  (SQL #41 — push già inviata)

momenti          id, run_id, author_id, photo_url, body, UNIQUE(run_id, author_id)

run_chat         id, run_id, author_id, body, created_at

check_ins        id, run_id, user_id, checked_in_at, UNIQUE(run_id, user_id)

run_confirmations id, run_id, user_id, confirmed boolean, created_at,
                  UNIQUE(run_id, user_id)

crews            id, slug (UNIQUE, URL personalizzato), name, description,
                 avatar_url, cover_url (immagine di testata), owner_id,
                 crew_type (training_group|running_club|friends),
                 visibility (public|private), whatsapp_group_link, created_at

crew_posts       id, crew_id, author_id, body, pinned boolean, created_at
                 — bacheca del coach; scrivono solo owner/admin, leggono
                   SOLO i membri attivi (public + private) — vedi SQL #34

crew_chat        id, crew_id, author_id, body, created_at
                 — chat di gruppo privata; scrivono/leggono SOLO i membri
                   attivi; delete autore o admin/owner — vedi SQL #35

crew_members     id, crew_id, user_id, role (owner|admin|member),
                 status (active|pending|rejected), joined_at,
                 UNIQUE(crew_id, user_id)

crew_invites     id, crew_id, invited_by, token uuid, max_uses, use_count,
                 expires_at, created_at

runs             + crew_id → crews.id (nullable)
                 + run_visibility (public|crew_only|invite_only) default 'public'

strava_connections  id, user_id (UNIQUE → profiles), strava_athlete_id (UNIQUE),
                    access_token, refresh_token, expires_at, scope, connected_at
                    — token OAuth, NESSUNA policy RLS (solo service-role)

strava_activities   id, user_id, strava_activity_id (UNIQUE), name, distance_m,
                    moving_time_s, elapsed_time_s, total_elevation_gain_m,
                    activity_type ('Run'|'TrailRun'), start_date,
                    avg_pace_s_per_km, avg_heartrate_bpm, start_lat, start_lng, created_at
                    — feed calcolato a runtime (nessuna crew_id)

push_tokens      id, user_id, token (UNIQUE, ExponentPushToken[…]), platform (ios|android),
                 device_name, created_at, updated_at
                 — SQL #41; si scrive SOLO via RPC register_push_token(); RLS select/delete propri

user_blocks      blocker_id, blocked_id, created_at — PK(blocker_id, blocked_id)
                 — SQL #42 ⏳; RLS: ognuno vede/crea/toglie solo i propri blocchi
```

### Storage bucket
- `avatars` — foto profilo utente
- `momenti` — foto post-run
- `crew-covers` — immagine di testata delle crew (scrittura ristretta agli owner/admin della crew)

### Edge Functions, job pianificati e segreti
Cartella `supabase/functions/`. Deploy con la CLI: `supabase functions deploy <nome> --project-ref wshjtgtmxbxhpdqtxpiq --use-api` (opzione `--use-api` = niente Docker; metti sempre `--project-ref` **in mezzo** ai flag, mai in fondo attaccato a un altro flag).

| Funzione | Stato | Chiamata da | Verifica JWT | Note |
|---|---|---|---|---|
| `send-immediate` | ✅ | trigger `trg_email_immediate` | — | Email immediate (Resend) per approvata/annullata/modificata/promemoria |
| `send-digest` | ✅ | cron `email-digest-every-30min` (job 1) | — | Digest di richieste/messaggi non letti |
| `send-weekly-digest` | ✅ | cron `weekly-digest-monday` (job 3) | — | Digest settimanale geolocalizzato |
| `send-push` | ✅ (06/11/2026) | trigger `trg_push_immediate` + cron `push-due-every-5min` (job 4) | **no** (`--no-verify-jwt`, si autentica con header `x-push-secret`) | Invia via Expo Push API, elimina i token `DeviceNotRegistered`. Tipi con push: richiesta_approvata/rifiutata, nuova_richiesta, corsa_annullata/modificata, promemoria_corsa, crew_join_request, crew_request_approved, crew_new_run, nuovo_messaggio. Esclusi broadcast staff e altre crew |
| `notify-report` | ✅ (21/11/2026) | trigger `trg_report_alert` (SQL #43) | **no** (`x-push-secret`) | Email allo staff per ogni segnalazione |
| `delete-account` | ✅ (21/11/2026, ripubblicata senza blocco Strava; mai provata) | app mobile (`supabase.functions.invoke`) | **sì** (nessun `--no-verify-jwt`) | Elimina l'account di chi chiama. Rifiuta gli admin e chi possiede crew con altri membri attivi; scrive notifiche di annullamento **senza `run_id`** agli iscritti alle corse future (con `run_id` sparirebbero in cascata con la corsa); pulisce Storage (`avatars`, `momenti`, `crew-covers`); prova a revocare Strava; poi `auth.admin.deleteUser` (la cascata FK elimina il resto) |

**Segreti.** Vault database: `push_function_secret` (letto dai trigger/cron). Secret delle funzioni: `PUSH_FUNCTION_SECRET` (**stesso valore** del Vault; verifica con `supabase secrets list`: l'impronta sha256 deve coincidere), `RESEND_API_KEY`, `STAFF_ALERT_EMAIL` (per `notify-report`), `EXPO_ACCESS_TOKEN` (facoltativo). **Non incollare mai il valore del segreto in chat/log:** se succede, rigenerarlo e aggiornare entrambi i posti (`vault.update_secret(...)` + `supabase secrets set`).

**Job pg_cron attivi:** `email-digest-every-30min` (id 1), `weekly-digest-monday` (id 3), `push-due-every-5min` (id 4). Diagnostica: `cron.job_run_details` (esecuzioni) e `net._http_response` (risposte HTTP delle funzioni; filtrare per contenuto, es. `like '%processed%'` per le push).

### Configurazione Dashboard Supabase (manuale)
- **Authentication → Email Templates → Reset Password:** usare `supabase/email-templates/reset-password.html` (contiene il codice `{{ .Token }}` per il recupero password dell'app mobile, oltre al pulsante per il sito) — ✅ incollato (21/11/2026); Redirect URLs verificati.
- **Authentication → URL Configuration → Redirect URLs:** controllare che includa `https://app.vieniacorrere.it/**` (il link di conferma email dalla registrazione in app atterra su `/login`). Il vecchio `DASHBOARD-CONFIG.md` parla ancora di `corriamo.vercel.app`.
- **Authentication → URL Configuration:** Site URL = `https://vieniacorrere.it`
- **Authentication → MFA:** abilitare **TOTP** (necessario per la sezione admin — gate AAL2 su `/admin`)
- **Database → Replication (via SQL):** Abilitare Realtime con:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.run_chat;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.run_confirmations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_chat;
  ```

---

## 5. Struttura file sorgente

```
src/
├── app/
│   ├── layout.tsx                    Root layout + metadata globale + favicon SVG
│   ├── globals.css                   Design tokens Tailwind v4
│   ├── icon.svg                      Favicon SVG brand color
│   ├── sitemap.ts                    Sitemap.xml dinamico (corse, serie, gare, profili)
│   ├── page.tsx                      Homepage: hero, value props, come funziona,
│   │                                 "Perché Vieni a correre?" (foto noi.jpeg), why different
│   ├── come-funziona/page.tsx        Guida funzionalità (7 sezioni incl. Purple Screen + Crew)
│   ├── privacy/page.tsx              Privacy Policy GDPR
│   ├── termini/page.tsx              Termini di Servizio
│   ├── auth/callback/route.ts
│   ├── bacheca/page.tsx              2 tab: Corse (singole+serie) | Gare
│   ├── corse/[id]/
│   │   ├── page.tsx                  Dettaglio + OG + "Sono qui" button in sidebar
│   │   ├── JoinButton.tsx            "Mi interessa" (toast conferma) + "Partecipa" (due flussi)
│   │   ├── modifica/page.tsx         Form modifica corsa (blocco <2h dalla partenza)
│   │   ├── chat/page.tsx             Server: access check + carica messaggi
│   │   ├── chat/ChatWindow.tsx       Client: Realtime, insert ottimistico, iMessage style
│   │   ├── chat/MessageInput.tsx     Client: input + invio su Enter
│   │   ├── ritrovo/page.tsx          Purple Screen — server: check accesso + finestra
│   │   ├── ritrovo/RitrovoScreen.tsx Client: schermo colorato, counter live, Wake Lock
│   │   ├── ParticipantsList.tsx
│   │   ├── ContactButton.tsx
│   │   ├── ReviewForm.tsx
│   │   ├── MomentoSection.tsx
│   │   ├── CancelRunButton.tsx
│   │   ├── ShareButton.tsx
│   │   └── ShareLanding.tsx
│   ├── serie/[id]/page.tsx
│   ├── gare/
│   │   ├── page.tsx                  Hub gare: hero, spiegazione, filtri, lista
│   │   └── [id]/page.tsx             Dettaglio gara (solo ContactButton)
│   ├── nuova-corsa/
│   │   ├── page.tsx
│   │   └── NuovaCorsaForm.tsx        Selettore tipo (singola|serie) + form unificato
│   ├── nuova-corsa-spot/
│   │   ├── page.tsx
│   │   └── SpotForm.tsx
│   ├── nuova-gara/
│   │   ├── page.tsx
│   │   └── NuovaGaraForm.tsx
│   ├── nuova-serie/page.tsx          → redirect a /nuova-corsa
│   ├── crew/
│   │   ├── nuova/page.tsx            Crea nuova crew
│   │   ├── [id]/page.tsx             Pagina pubblica crew (risolve slug o uuid): testata, bacheca, corse programmate/effettuate, feed Strava
│   │   ├── [id]/modifica/page.tsx    Modifica nome/URL slug/descrizione/testata/visibilità/WhatsApp
│   │   ├── [id]/chat/page.tsx        Chat di gruppo privata crew (server: access check membri attivi)
│   │   │   ├── CrewChatWindow.tsx     Client: Realtime, insert ottimistico, stile iMessage
│   │   │   └── MessageInput.tsx       Client: input + invio su Enter
│   │   ├── [id]/gestisci/page.tsx    Gestione membri (solo owner/admin)
│   │   │   ├── AddMemberSearch.tsx   Ricerca e aggiunta membro per nome
│   │   │   ├── MemberActions.tsx     Approva/rimuovi membro
│   │   │   ├── InviteLinkSection.tsx Link d'invito con token
│   │   │   └── DeleteCrewButton.tsx  Eliminazione crew
│   │   └── invite/[token]/page.tsx   Pagina accettazione invito
│   ├── profilo/
│   │   ├── [id]/page.tsx             Profilo: età, perché corri, PB, momenti, recensioni
│   │   └── modifica/
│   │       ├── page.tsx              (+ stato connessione Strava via service-role)
│   │       ├── EditProfileForm.tsx   Avatar (9 personaggi+lightbox), età, PB, perché corri,
│   │       │                         filtro città automatico
│   │       └── StravaConnectCard.tsx Collega/scollega Strava + 2 toggle (crew / profilo pubblico)
│   ├── area-personale/page.tsx       Welcome banner (nuovo utente) + banner profilo incompleto
│   ├── messaggi/
│   │   ├── page.tsx
│   │   └── [runId]/[otherId]/
│   │       ├── page.tsx
│   │       ├── ReplyForm.tsx
│   │       └── MarkReadTrigger.tsx
│   ├── notifiche/
│   │   ├── page.tsx
│   │   └── MarkNotificationsRead.tsx
│   ├── login/page.tsx
│   ├── registrati/
│   │   ├── page.tsx                  Form semplificato (solo nome + email + password)
│   │   └── conferma/page.tsx         Pagina "Controlla la tua email"
│   ├── (public)/tools/               Sezione Strumenti per runner — route group PUBBLICO (no auth, indicizzabile)
│   │   ├── layout.tsx                Guscio Header/Footer + metadata SEO
│   │   ├── page.tsx                  Hub: card dei 4 tool
│   │   ├── zone-di-passo/page.tsx    Calcolatore zone di passo (SSR + <PaceZonesTool/>)
│   │   ├── predittore/page.tsx       Predittore tempi gara (SSR + <RacePredictorTool/>)
│   │   ├── da-dove-inizio/page.tsx   Quiz "da dove inizio?" (SSR + <StartQuiz/>)
│   │   ├── alimentazione-gara/page.tsx Piano alimentazione pre-gara/gara (SSR + <NutritionPlanTool/>, disclaimer medico)
│   │   └── gara-ideale/page.tsx      Tool "Trova la tua gara ideale" (carica catalogo + <RaceMatcherTool/>)
│   ├── (public)/calendario-gare/     Calendario gare — vedi docs/CALENDARIO-GARE.md
│   │   ├── layout.tsx                Guscio Header/Footer + SEO
│   │   ├── page.tsx                  Lista: filtri, "In evidenza", per mese, orizzonte 15 mesi
│   │   ├── [slug]/page.tsx           Scheda gara + JSON-LD SportsEvent + "Chi ci va?"
│   │   ├── proponi/                  Form segnalazione gara (auth → source='utente'/pending)
│   │   └── modera/                   Moderazione admin (profiles.is_admin): Approva/Rifiuta
│   ├── elimina-account/page.tsx      Pagina pubblica statica "Come eliminare l'account" (app o email, cosa si cancella) — URL per Google Play; ⏳ da pubblicare
│   ├── api/og/corse/[id]/route.tsx
│   ├── api/unsubscribe/route.ts      Unsubscribe email notifiche via token
│   ├── api/tools/scheda-ritmi/route.ts  POST: invia scheda zone di passo via email (auth + ricalcolo server-side)
│   └── api/strava/                   Integrazione Strava (vedi docs/STRAVA.md)
│       ├── connect/route.ts          GET: avvia OAuth (state anti-CSRF in cookie)
│       ├── callback/route.ts         GET: salva connessione (service-role) + backfill 30gg
│       ├── disconnect/route.ts       POST: deauthorize + elimina connessione/attività
│       └── webhook/route.ts          GET challenge + POST eventi (create/update/delete/deauth)
│
├── components/
│   ├── Header.tsx                    Mobile overlay menu (mobileOpen/userOpen separati)
│   ├── Footer.tsx                    Link reali: Privacy, Termini, Contatti
│   ├── RunCard.tsx                   Badge interessi, luogo privato, compatibilità
│   ├── GaraCard.tsx                  Card post community "cerca compagni" (accent indigo)
│   ├── RaceCard.tsx                  Card evento catalogo (+ export countryLabel ISO→bandiera)
│   ├── CrewFeed.tsx                  Feed unificato crew: attività Strava + nuovi membri + insight (da src/lib/crewFeed.ts)
│   ├── CrewMemberList.tsx            Lista membri con collasso "+altri N" per crew numerose
│   ├── CrewEmptyState.tsx            Empty-state colonna principale per crew senza corse (owner/membro/visitatore)
│   ├── CrewBoard.tsx                 Bacheca del coach: lista messaggi + composer (owner/admin) + elimina
│   ├── SeriesCard.tsx
│   ├── SpotRunsStrip.tsx             parseRunDateTime per fuso orario corretto
│   ├── ReviewCard.tsx
│   ├── MomentoCard.tsx
│   ├── LocationPreviewMap.tsx
│   ├── RunMap.tsx                    Pin grigio tratteggiato per luogo privato
│   ├── RunMapWrapper.tsx
│   ├── tools/                        Componenti client dei tool runner
│   │   ├── ToolShell.tsx             Guscio comune: breadcrumb, intestazione, disclaimer (override opzionale)
│   │   ├── PaceZonesTool.tsx         Form + risultati zone + CTA + invio scheda via email (se loggato)
│   │   ├── RacePredictorTool.tsx     Form + previsione realistica/ottimistica (Riegel)
│   │   ├── StartQuiz.tsx             Quiz a step + esito personalizzato + link editoriali (target _blank)
│   │   ├── NutritionPlanTool.tsx     Form + piano alimentazione a sezioni (48h, cena, colazione, gara, dopo)
│   │   └── RaceMatcherTool.tsx       Form preferenze + shortlist gare (tool "gara ideale")
│   └── ui/
│       ├── Avatar.tsx                CHARACTER_PRESETS (9 img) + COLOR_PRESETS (6)
│       ├── AvatarLightbox.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Stars.tsx
│       ├── TagBadge.tsx
│       ├── TagPicker.tsx
│       └── Textarea.tsx
│
├── lib/
│   ├── types.ts                      Profile (+ reliability_*, is_admin), Run (gara, location_public, race_id...),
│   │                                 Race + CatalogDistance/RaceType/RaceCircuit/RaceSource/RaceStatus,
│   │                                 Interest, CheckIn, RunChatMessage, RunConfirmation, ProfileLevel,
│   │                                 Crew, CrewMember, CrewInvite
│   ├── utils.ts                      + parseRunDateTime (fuso Europe/Rome)
│   │                                 + runRitrovoColor (Purple Screen)
│   ├── tags.ts                       12 tag attivi (rimossi: scarico, solo_asfalto, panoramico,
│   │                                 porta_frontale, porta_acqua, hi_vis)
│   ├── compatibility.ts              Supporto nuovi livelli profilo (amatore_gare, atleta)
│   ├── geocoding.ts
│   ├── reliability.ts                getReliabilityBadge() → 'affidabile' | 'organizzatore' | null
│   ├── email/
│   │   ├── templates.ts              Template HTML email (partecipazione, approvazione, ... + emailSchedaRitmi)
│   │   ├── send.ts                   Helper invio Resend lato Next (per le API route)
│   │   └── token.ts                  Generazione/verifica token unsubscribe
│   ├── running/                      Logica dei tool runner (calcolo puro, testabile)
│   │   ├── time.ts                   Parse/format tempi e ritmi (mm:ss, m:ss/km)
│   │   ├── riegel.ts                 Predizione tempi gara — formula pubblica di Riegel
│   │   ├── paceZones.ts              Zone di passo: ancora al ritmo soglia + modulazione esperienza/giorni
│   │   ├── quiz.ts                   Grafo dichiarativo del quiz (step form/single/multi) + computeOutcome() (profilo, blocchi, obiettivi, anti-mollare)
│   │   ├── nutrition.ts              Campi form + computeNutritionPlan() (piano alimentazione gara, calcolo puro)
│   │   └── raceMatcher.ts            matchRaces()/scoreRace() — motore "gara ideale" (calcolo puro)
│   ├── strava/
│   │   ├── api.ts                    Wrapper Strava server-only: OAuth, refresh token,
│   │   │                             fetch attività, backfill, deauthorize, mapping riga
│   │   └── attendance.ts             Auto-conferma presenze: matcher puro activityMatchesRun
│   │                                 + autoConfirmAttendance (service-role)
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── admin.ts                  Client service-role (bypassa RLS, solo server)
│
└── proxy.ts                          Protected paths aggiornati (nuova-gara, ecc.)
```

---

## 6. Funzionalità implementate ✅

### Core MVP
- [x] Registrazione / Login / Logout con email
- [x] Conferma email con redirect corretto
- [x] Protezione route tramite proxy.ts

### Profilo runner
- [x] Avatar: foto caricata, 9 personaggi illustrati (lightbox ingrandimento), 6 icone colorate
- [x] Livelli estesi: Principiante, Intermedio, Avanzato, Amatore che fa gare, Atleta agonista
- [x] Età, Bio, Personal Best (5K/10K/21K/42K)
- [x] Sezione "Perché corri?" con 7 motivazioni (chip multi-selezione)
- [x] Link verificabili: Strava, Garmin, Instagram
- [x] Filtro città automatico in bacheca (con chip rimovibile)
- [x] Score compatibilità calcolato server-side

### Bacheca e corse
- [x] Tab "Corse": singole + serie ricorrenti nella stessa vista
- [x] Tab "Gare": post per trovare compagni di gara
- [x] Filtri: testo, città, livello, data, 18 tag in 5 categorie
- [x] Vista Lista e Vista Mappa (toggle)
- [x] Striscia "Adesso" con geolocalizzazione e countdown live
- [x] Filtro automatico città dal profilo

### Creazione corse
- [x] Form unificato con selettore tipo (singola | serie)
- [x] Geocoding live + mappa con pin draggabile
- [x] Luogo pubblico o privato (pin generico sulla mappa se privato)
- [x] No drop, tag caratteristiche, max partecipanti
- [x] Serie: genera automaticamente 8 appuntamenti
- [x] Corsa spot (form rapido < 30 secondi)

### Partecipazioni
- [x] "Mi interessa": segnale automatico, no approvazione, no chat
- [x] "Partecipa": richiesta formale → organizzatore approva/rifiuta
- [x] Contatori separati in card e dettaglio
- [x] Annullamento corsa con notifica automatica

### "Sono qui" — Purple Screen
- [x] Ogni corsa ha un colore unico (hash deterministico, 18 colori)
- [x] Pulsante in sidebar nella finestra −60 min → +30 min
- [x] Pagina /corse/[id]/ritrovo: schermo full-color
- [x] Counter live partecipanti arrivati (Supabase Realtime)
- [x] Wake Lock API: schermo sempre acceso
- [x] Due stati: preview / attivo

### Chat di gruppo
- [x] Accessibile solo a organizzatore e partecipanti approvati
- [x] iMessage style, Realtime, insert ottimistico
- [x] Separatori data, raggruppamento per autore
- [x] Layout full-screen mobile-first

### Compagni di gara (/gare)
- [x] Hub /gare con hero descrittivo e 3-step
- [x] Pacer / Compagno di gara / Supporter
- [x] Filtri distanza e tipo compagno
- [x] Solo ContactButton (no JoinButton)
- [x] Tab "Gare" in bacheca (sola visualizzazione)

### Messaggistica 1-to-1
- [x] Inbox, thread iMessage-style, badge realtime, read receipts

### Momenti post-run & Recensioni
- [x] Foto + testo post-corsa, griglia nel profilo
- [x] Stelle 1-5, media con distribuzione nel profilo

### Notifiche
- [x] Badge realtime, notification center, 6 tipi di trigger DB

### Mappa
- [x] Pin colorati per livello, grigio tratteggiato per luogo privato, rosso per spot

### Affidabilità organizzatori
- [x] Badge **Affidabile** (verde) e **Organizzatore** (blu) calcolati automaticamente
- [x] Score da segnali passivi: check-in Purple Screen + recensioni + prompt post-run
- [x] Prompt "La corsa si è svolta?" per partecipanti approvati (2h–7gg dopo la corsa)
- [x] Corse spot pesano 0.5 nel calcolo
- [x] Colonne materializzate su `profiles` aggiornate da 4 trigger DB
- [x] `ReliabilityBadge` componente riutilizzabile (varianti full/icon)
- [x] Badge visibile nel profilo e nella sidebar del dettaglio corsa
- ✅ **`supabase/reliability.sql` applicato in produzione**

### SEO (Sprint 1 completato)
- [x] robots.txt, sitemap.xml dinamico, favicon SVG
- [x] generateMetadata su tutte le pagine pubbliche (canonical, OG, Twitter card)
- [x] noindex su tutte le pagine private
- [x] OG image dinamica per ogni corsa
- [x] Privacy Policy e Termini di Servizio

### Crew (gruppi permanenti)
- [x] Creazione crew con nome, descrizione, tipo, visibilità, link WhatsApp
- [x] Pagina pubblica crew + sezione crew in area personale
- [x] Gestione membri: aggiunta per nome, link invito con token, rimozione, eliminazione crew
- [x] Badge "Riservata a [crew]" nella card/dettaglio corsa
- [x] Corsa privata (run_visibility: crew_only)
- [x] Fix RLS ricorsione crews/crew_members con funzioni SECURITY DEFINER
- [x] Sezione Crew in /come-funziona
- ✅ **SQL crews.sql / crew-invites.sql / crews-fix-rls.sql applicati in produzione**

#### Potenziamento pagina crew (SQL #33 `crew-enhancements.sql` ⏳ da applicare)
- [x] **URL personalizzato** (`crews.slug`): la route `/crew/[id]` risolve slug **o** uuid legacy; slug auto-suggerito dal nome alla creazione (`/api/crew`), modificabile dall'owner in `/crew/[id]/modifica` (unique → errore "URL già in uso")
- [x] **Immagine di testata** (`crews.cover_url`): banner 16:6 in cima alla pagina; upload nel bucket `crew-covers` dalla pagina modifica (solo owner/admin via RLS storage)
- [x] **Bacheca del coach** (`crew_posts`, componente `CrewBoard`): scrivono solo owner/admin, con opzione "in evidenza" (pinned); leggono tutti sulle crew pubbliche, i soli membri sulle private; trigger notifica `crew_new_post` ai membri
- [x] **Corse programmate**: sezione consolidata (pubbliche a tutti + riservate `crew_only` ai soli membri)
- [x] **Corse effettuate**: nuova sezione storico (le riservate visibili solo ai membri — filtro in query perché la SELECT policy su `runs` è `using(true)`)
- [x] **Feed attività Strava dei membri**: confluito nel feed unificato `CrewFeed` (vedi sotto); il vecchio `CrewActivityFeed` è stato rimosso

#### Miglioramenti area crew (feat/crew-community-impact — in sviluppo)
- [x] **Gamification Fase 1 — card impatto** (`ImpactCard`): "L'impatto della crew" (pagina crew) e "Runner ispirati" (profilo), da RPC `crew_impact_stats`/`user_impact_stats` (SQL #36, read-only, al volo). Vedi `docs/GAMIFICATION.md`.
- [x] **Prossima uscita in evidenza** (`NextOutingCard`): la corsa futura più imminente in cima alla colonna principale, con roster dei confermati (RPC `run_going_roster`).
- [x] **Presenze rapide "Ci sono"** (`AttendanceButton` + SQL #37 `crew-attendance.sql`): conferma immediata dei membri, aggiornamento ottimistico.
- [x] **Feed unificato** (`CrewFeed` + `src/lib/crewFeed.ts`): sostituisce `CrewActivityFeed`, fonde attività Strava + nuovi membri + insight generati. **Assemblato lato TypeScript, nessuna modifica DB** (eredita i filtri di visibilità delle query esistenti; finestra attività allargata a 30gg).
- [x] **Rifiniture UX (Step 5)**: empty-state curato per crew senza corse (`CrewEmptyState`, testo diverso per owner/membro/visitatore), lista membri collassabile con "+altri N" per i gruppi numerosi (`CrewMemberList`), rimozione del componente morto `CrewActivityFeed`. Nessuna modifica DB.

#### Chat di gruppo della crew (SQL #35 `crew-chat.sql` ✅ applicato in produzione)
- [x] **Chat privata** (`crew_chat`, route `/crew/[id]/chat`): messaggistica di gruppo tra **tutti i membri attivi** — distinta dalla bacheca del coach (unidirezionale) e dalla chat delle corse (legata al singolo evento)
- [x] Riservata ai **soli membri attivi** anche per le crew pubbliche (RLS `is_active_crew_member`); Realtime + insert ottimistico, stile iMessage (riuso pattern `run_chat`)
- [x] Cancellazione messaggio dell'autore o di **admin/owner** (moderazione, RLS `is_crew_admin`)
- [x] Punto d'ingresso "Chat della crew" nella pagina crew, visibile ai soli membri
- [x] **Nessuna notifica per singolo messaggio** (come `run_chat`, per non generare rumore; la bacheca resta il canale che notifica)

### Email notifiche
- [x] Supabase Edge Functions: `send-immediate` e `send-digest` via Resend API
- [x] Tabella `email_notifications` con preferenze utente e log invii
- [x] Trigger DB per accodare email (partecipazione, approvazione, modifica, ecc.)
- [x] Template HTML per ogni tipo di notifica
- [x] Unsubscribe via token (`/api/unsubscribe`)
- ✅ **SQL email-notifications.sql / email-triggers.sql applicati in produzione**
- ✅ **Edge Functions deployate + RESEND_API_KEY configurata — email confermate in arrivo**

### Onboarding & Registrazione
- [x] Form registrazione semplificato (solo nome + email + password, profilo completabile dopo)
- [x] Pagina `/registrati/conferma` con istruzioni email
- [x] Welcome banner in area personale per nuovi utenti
- [x] Banner "Completa il profilo" per chi non ha ancora compilato i campi opzionali

### Modifica corsa
- [x] Route `/corse/[id]/modifica` per organizzatori
- [x] Blocco modifica se mancano meno di 2 ore alla partenza
- [x] Notifica automatica ai partecipanti approvati in caso di modifica

### Strumenti per runner (/tools)
- [x] Route group **pubblico** `src/app/(public)/tools/` — niente auth (proxy protegge solo whitelist), pagine SSR indicizzabili, prerenderizzate statiche
- [x] **Calcolatore zone di passo** — da gara recente deriva facile/lungo/medio/soglia/ripetute + ritmi gara 5K/10K/mezza/maratona. Modello proprietario: ritmo soglia derivato da Riegel (distanza coperta in 60'), zone come range % sul soglia, ampiezza modulata da esperienza e giorni/settimana
- [x] **Predittore tempi gara** — formula di Riegel; realistico (esp. 1.10) e ottimistico (esp. 1.06)
- [x] **Test "da dove inizio?"** — quiz a step con grafo dichiarativo (`quiz.ts`), esito personalizzato (cammina-corri, prima 5K, dimagrire, compagnia, benessere), avviso medico se dolori frequenti, invito "Da zero a 5K" (link alla guida editoriale)
- [x] **Test "da dove inizio?" esteso** (PR #88) — scheda iniziale profilo (età, peso facoltativo, sport passato/attuale), scheda multi-selezione sui blocchi (non mi piace, goffo, fiato, tempo, sveglia, giudizio, noia, mai pensato); esito ampliato con nota profilo personalizzata, primi piccoli obiettivi, consigli per superare ogni blocco dichiarato, trucchi per non mollare. Nuovi tipi di step dichiarativi `form` e `multi` in `quiz.ts` (`Answers` ora `string | string[]`)
- [x] **Test "da dove inizio?" — profilo fisico** (PR #90) — campi facoltativi **altezza** e **genere** nella scheda iniziale; calcolo BMI (altezza+peso) con note prudenziali nell'esito: sovrappeso ≥30 (cammino/gradualità/superfici morbide/check-up), ≥25 (uscite facili), sottopeso <18.5 (mangiare a sufficienza, no calo peso, medico/nutrizionista, frase dedicata alle donne), + nota se obiettivo "dimagrire" con BMI <25. Messaggi prudenziali (BMI = indicatore grezzo)
- [x] Link editoriali del quiz verso il sito WordPress (`www.vieniacorrere.it/...`), aperti in nuova scheda
- [x] CTA "Trova compagni" → `/bacheca` su ogni tool; disclaimer legale (solo modelli pubblici, no VDOT)
- [x] **Strategia gara intelligente** (`/tools/strategia-gara`) — upload GPX → parsing percorso in segmenti da 1 km (`gpx.ts`, haversine + dislivello a isteresi anti-rumore); motore `raceStrategy.ts` (coefficienti trasparenti: dislivello, fondo, meteo, vento, affollamento, approccio) → passo reale per km, tempo finale ±margine, split, tratti critici, profilo altimetrico SVG; commento strategico `buildRaceComment` generato dalle caratteristiche del percorso (regole client-side, nessuna API esterna). CTA verso `/gare`. MVP client-side: niente DB, niente gare precaricate (follow-up)
- [x] **Backend email scheda ritmi**: `POST /api/tools/scheda-ritmi` con auth + validazione + **ricalcolo server-side** → invio via Resend (template `emailSchedaRitmi` branded). Utente non loggato → CTA `/registrati`
- ✅ **Mergiata su `main` (PR #81, #82). Env `RESEND_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` configurate su Vercel**

### Calendario gare (`/calendario-gare`) — PR #106–#109
> Doc completa: [`docs/CALENDARIO-GARE.md`](docs/CALENDARIO-GARE.md)
- [x] Catalogo `races` (evento reale) distinto dai post community `type='gara'`; ponte `runs.race_id`
- [x] Import **AIMS ICS** (`npm run import:aims`, ~80 gare europee) + **costanti Major/SuperHalfs** (`npm run seed:circuits`, 13 gare), idempotenti con dedup
- [x] Pagina lista (hero, filtri q/distanza/area/circuito, "In evidenza", per mese, orizzonte 15 mesi) + scheda `[slug]` (dettagli, CTA sito ufficiale, "Chi ci va?", **JSON-LD SportsEvent**)
- [x] Tool **"Trova la tua gara ideale"** (`/tools/gara-ideale`, motore puro `raceMatcher.ts`)
- [x] Ponte community: CTA "Cerca compagni" → `/nuova-gara?race=<slug>` precompilato + sezione "Chi ci va?" da `runs.race_id`
- [x] Segnalazioni utenti (`/calendario-gare/proponi`, `source='utente'`/`pending`) + moderazione admin (`/calendario-gare/modera`, `profiles.is_admin`)
- [x] Voce "Calendario gare" nel menu Extra; card gara con bandiera nazione
- [x] FIDAL scartato (querystring ignorata); long-tail IT via segnalazioni utenti
- ✅ **`races-moderation.sql` (SQL #27) applicato in produzione** — moderazione attiva

### Sezione admin (`/admin`) — richiede `supabase/admin.sql` (#28) + MFA TOTP
- [x] Gate `/admin` a due livelli: `is_admin` (layout) + **2FA AAL2** (`requireAal2` sulle pagine operative)
- [x] Configurazione 2FA TOTP: `/admin/mfa/setup` (QR + **codici di recupero** monouso, hash sha256), `/admin/mfa/verifica` (challenge), `/admin/mfa/recupero` (consuma codice → `mfa.deleteFactor` via service-role)
- [x] Dashboard KPI (gare pending, segnalazioni aperte, utenti sospesi/bannati, contenuti nascosti)
- [x] **Utenti**: ricerca, scheda con **ban graduale** (ammonisci → sospendi N giorni → blocca) + revoca, storico provvedimenti, **messaggio diretto** (in-app + email)
- [x] Enforcement: RLS `is_active_user()` (blocco scrittura DB) + `proxy.ts` redirect a `/account-sospeso` + policy `is_admin_aal2()` con claim `aal2`
- [x] Audit log `admin_actions` su ogni azione sensibile; email staff via template `emailAdminMessage`
- [x] Moderazione gare migrata in `/admin/gare` (riuso `ModeraActions`)
- [x] **Broadcast** (`/admin/broadcast`): annuncio in-app a tutti gli utenti o per città (esclude bannati, insert a blocchi da 500, audit). Solo in-app: niente email di massa (follow-up per deliverability/costi)
- [x] **Contenuti** (`/admin/contenuti`): nascondi/ripristina corse, momenti, recensioni (soft-delete `hidden_by_admin`). Occultamento a livello **RLS restrictive SELECT** → il contenuto sparisce da ogni query pubblica senza toccare i file di lettura; resta visibile solo agli admin AAL2. Stub `broadcast` (PR-E)
- [x] **Segnalazioni** (`/admin/segnalazioni`): coda report con filtri stato (aperte/in lavorazione/risolte/ignorate), azioni admin (API `/api/admin/reports`), link a entità e utente segnalato. Pulsante utente `<ReportButton>` (inserisce in `reports` via RLS) su dettaglio corsa e profilo
- ✅ **`admin.sql` (#28) applicato in produzione** (tabelle/colonne moderazione verificate) — resta da confermare **MFA TOTP** abilitato in Dashboard per il gate AAL2

### Integrazione Strava (`docs/STRAVA.md`) — SQL #29–#31 — ⚠️ STORICO: staccata il 21/11/2026 (vedi banner in testa)
- [x] Connessione OAuth per utente (`activity:read`) da `/profilo/modifica` → `StravaConnectCard`; token in `strava_connections` (nessuna policy RLS, solo service-role)
- [x] **Sincronizzazione automatica** via webhook Strava (`/api/strava/webhook`): create/update/delete + deautorizzazione; importa solo Run/TrailRun non private
- [x] **Backfill** ultimi 30 giorni al primo collegamento (`backfillRecentRuns`, best-effort)
- [x] **Feed attività per crew private** (in `/crew/[id]`, ora reso dal feed unificato `CrewFeed`): visibile solo ai membri, solo `visibility='private'`; RLS via helper `shares_private_crew_with()`
- [x] **Visibilità sul profilo pubblico** (`strava_public_profile`, opt-in default false): sezione "Corse recenti" in `/profilo/[id]`, visibile a chiunque
- [x] Due toggle indipendenti (feed crew / profilo pubblico); dati mostrati: distanza, passo, tempo, **dislivello**, **frequenza cardiaca media**, link all'attività su Strava
- [x] Script gestione subscription webhook: `npm run strava:webhook -- create|list|delete`
- [x] **Auto-conferma presenze** (SQL #32): il matcher puro `activityMatchesRun` (tempo −15/+45min, distanza ±20%, guardia posizione 2km) incrocia le attività con le corse partecipate; `autoConfirmAttendance()` inserisce `run_confirmations(source='strava')` + notifica. Alimenta reliability organizzatore **e** `attendance_score` partecipante. Badge **"Si presenta"** (≥1) / **"Sempre presente"** (≥3, ≥80%) nel profilo. Chiamato da webhook + backfill.
- ✅ **SQL #29 `strava.sql`, #30 `strava-public-profile.sql`, #31 `strava-heartrate.sql` applicati in produzione; webhook registrato; 3 env `STRAVA_*` su Vercel** · #32 `strava-attendance.sql` ⏳ da applicare

### App mobile (repo separato `vieniacorrere-app`) — in sviluppo, non ancora pubblicata
> Expo SDK 57 + Expo Router + NativeWind, stesso progetto Supabase (nessun cambio schema salvo SQL #41–#43). Repo privato: https://github.com/Santamicone/vieniacorrere-app · progetto EAS `vieniacorrere` (bundle id `it.vieniacorrere.app`). Build di sviluppo iOS con EAS; push solo su telefono reale; account Apple Developer attivo, Android/Firebase da fare.
- [x] Auth email/password (registrazione con nome e città, recupero password con **codice** via email, eliminazione account), tab Bacheca · Crew · Le mie corse · Notifiche · Profilo
- [x] Bacheca con filtri, dettaglio corsa, partecipa/annulla/"Mi interessa", crea/modifica/annulla corsa (singola), gestione richieste dell'organizzatore
- [x] Chat della corsa (Realtime), ritrovo a schermo colorato + check-in, conferma presenza, notifiche in-app con badge, **push** (permesso dopo la prima richiesta di partecipazione, interruttore nel Profilo)
- [x] Profilo completo (foto: personaggi/colori/galleria su `avatars`), segnala corsa/messaggio, blocca utenti, privacy/termini/supporto, elimina account
- [x] **Crew** (scritta il 21/11/2026, commit app `8049588`, **provata su iPhone il 21/11/2026: funziona**; chat corsa ritestata): tab Le mie / Scopri con ricerca (nome, città, zona), scheda crew (identità, statistiche, prossima uscita con **"Ci sono"** via RPC `crew_confirm_attendance`, bacheca del coach — la scrivono owner/admin —, corse programmate/effettuate, membri), **chat della crew** (`crew_chat`, Realtime, segnala/blocca, admin possono eliminare), **richieste di ingresso** (chiedi/ritira, owner/admin accettano o rifiutano), esci dalla crew. Query verificate in sola lettura sul DB reale. Chat corsa e chat crew condividono `ChatView` (**ritestare la chat corsa**). NON in app: creare/modificare/eliminare crew, link di invito, aggiungere/rimuovere membri (→ sito, link dalla schermata Gestisci), feed Strava, corse solo-crew da creare, push per la chat crew e per le notifiche crew (le notifiche `crew_*` non hanno `crew_id`: non aprono la crew). Le segnalazioni su `crew_chat` arrivano allo staff ma l'admin web non sa nasconderle (`ALLOWED` in `api/admin/content/hide`)
- [ ] Mancano: serie ricorrenti e corsa spot, profili pubblici degli altri runner, recensioni/momenti, mappa
- ⚠️ Tutto scritto e verificato con `tsc` + query in sola lettura sul DB reale. **Collaudo su iPhone (21/11/2026, build dev con push), OK:** login, creazione corsa, richiesta di partecipazione da un secondo account (notifica in-app + **push reale**), approvazione, chat in tempo reale. **Non ancora provati:** ritrovo/check-in (finestra −60/+30 min), conferma presenza, modifica/annulla, segnala/blocca, registrazione e reset password dall'app, foto profilo, elimina account (solo con account usa-e-getta). Nota: i messaggi di chat NON generano notifiche (manca trigger DB, vedi bug (d))
- Dati noti ereditati dal sito: i conteggi "N partecipanti" per i non-organizzatori sono parziali (RLS `participations` mostra solo la propria riga; serve una funzione SECURITY DEFINER per i conteggi, vedi SQL #37 `run_going_roster`)

### UX
- [x] Design system Tailwind v4: palette arancio/verde, Plus Jakarta Sans
- [x] Homepage: hero video/img + "Perché Vieni a correre?" con foto fondatori
- [x] Pagina "Come funziona" con 7 sezioni (incluse Purple Screen e Crew)
- [x] Menu mobile: overlay full-height, no voci duplicate, badge notifiche su hamburger
- [x] Notifiche link nel menu mobile
- [x] Toast conferma "Mi interessa" dopo click
- [x] Chat responsive: h-screen + min-h-0 per corretto overflow su iOS

---

## 7. Decisioni architetturali

| Decisione | Scelta | Motivazione |
|---|---|---|
| Tailwind config | v4 CSS-based (`@theme` in globals.css) | Next.js 16 default |
| Auth proxy | `src/proxy.ts` (non `middleware.ts`) | Next.js 16 rename |
| Geocoding | Nominatim (OSM) | Gratuito, no API key |
| Mappa | Leaflet + dynamic import (no SSR) | Open source, zero costi |
| Notifiche | DB triggers + Supabase Realtime | Affidabile, no job schedulati |
| Serie → eventi | Generazione in-app (8 settimane) | Semplice, nessun cron job |
| OG image | `next/og` ImageResponse | Built-in, zero dipendenze |
| Compatibilità | Calcolata server-side al load | Nessuna tabella extra |
| Tags | `text[]` su `runs`/`series` con GIN index | Semplice, query con `@>` |
| Messaggi 1-to-1 | Thread `(run_id, sender, recipient)` | Contestuale alle corse |
| Gare | `type='gara'` su tabella `runs` esistente | Riuso tabella, meno JOIN |
| Profilo creation | DB trigger `handle_new_user` | Bypassa RLS post-signUp |
| nuova-serie | Redirect a nuova-corsa | Form unificato con selettore tipo |
| Interessi | Tabella separata `interests` | Flusso completamente diverso da partecipazioni |
| Luogo privato | `location_public boolean` + coordinate arrotondate per non-approvati | Semplice, no extra query |
| Purple Screen | Colore deterministico dall'ID (hash → palette 18 colori) | No colonna DB, sempre consistente |
| Fuso orario | `parseRunDateTime` con `Intl.DateTimeFormat Europe/Rome` | Server Vercel in UTC, corse in ora italiana |
| Chat di gruppo | Insert ottimistico in ChatWindow, Realtime solo per altri utenti | Messaggio appare subito senza attesa Realtime |
| Menu mobile | Due state separati (mobileOpen / userOpen) + overlay fixed | No overlap, no voci duplicate |
| Tools — collocazione | Route group `(public)/tools` nell'app, non WordPress/mini-sito | SEO + design system condiviso + CTA native; pubbliche di default (proxy a whitelist) |
| Tools — modelli | Solo formule pubbliche (Riegel), logica zone proprietaria documentata | Evita IP protetta (tabelle/logiche VDOT); disclaimer "valori indicativi" |
| Tools — calcolo | `lib/running/*` puro client-side per i calcolatori; ricalcolo server-side per l'email | Istantaneo e a costo zero; l'email non si fida dell'input del client |
| Tools — quiz | Grafo dichiarativo (`QUIZ_STEPS` + `computeOutcome`) | Aggiungere domande/esiti senza toccare la UI |
| Tools — email | API route Next + Resend (non Edge Function) | Azione utente autenticata; pattern coerente con `/api/*` esistenti |
| Calendario — catalogo | Nuova tabella `races` (non `runs`) | Anagrafica evento ≠ post community; ponte via `runs.race_id` |
| Calendario — import | AIMS ICS + costanti circuiti + segnalazioni utenti; dedup `(source, external_ref)` | Copre IT+Europa+Major/SuperHalfs; FIDAL scartato (querystring ignorata, filtro JS-only) |
| Calendario — moderazione | `profiles.is_admin` + policy RLS admin | Nessun ruolo admin di sito preesistente |
| Calendario — tool "gara ideale" | Calcolo puro `raceMatcher.ts` sul catalogo | Coerente con gli altri tool, zero API esterne |
| Strava — sync | Webhook Strava (non polling) | Rate limit stretti per-app; il webhook è push, non consuma quota per utente |
| Strava — token | `strava_connections` senza policy RLS, accesso solo service-role | I token OAuth non devono mai essere leggibili dal client |
| Strava — feed | Nessuna `crew_id` sulle attività; visibilità calcolata a runtime via RLS | Un'attività appare in tutte le crew condivise senza duplicazione |
| Strava — visibilità | Due flag indipendenti (`strava_share_activities` crew / `strava_public_profile` opt-in) | Livelli di esposizione diversi: crew private ≠ profilo pubblico a tutti |
| Strava — helper RLS | `shares_private_crew_with()` SECURITY DEFINER | Evita ricorsione (come `is_active_crew_member`) |

> Dettaglio completo della funzionalità Calendario gare: [`docs/CALENDARIO-GARE.md`](docs/CALENDARIO-GARE.md)

---

## 8. Problemi noti / aree da migliorare

| Problema | Priorità | Note |
|---|---|---|
| Corse esistenti senza coordinate | Bassa | Non appaiono sulla mappa; backfill SQL in DASHBOARD-CONFIG.md |
| SEO Sprint 2 non ancora fatto | Media | Schema.org JSON-LD (Event, Person, WebSite) |

---

## 9. Prossimi task (in ordine di priorità)

### ✅ Completati (ex alta priorità)
- **Merge `feat/ui-ux-redesign` → `main`** — FATTO: `main` è il branch attivo e gira in produzione
- **Migrazioni #27 `races-moderation.sql` e #28 `admin.sql`** — FATTO: applicate in produzione (verificate via query sul DB)
- **Voce "Strumenti" nella nav** — FATTO: menu Extra nell'Header (desktop + mobile)
- **Strategia gara — GPX Firenze** — FATTO: sostituito con la maratona completa

> Nota: SQL #18–#28 ed Edge Functions email risultano **applicati e attivi in produzione**.
> Per riconferma a colpo d'occhio è disponibile lo script read-only `supabase/verify-pending.sql`.
> La migrazione idempotente `supabase/apply-all-pending.sql` resta come riferimento ri-applicabile in sicurezza.

### Media priorità
1. **SEO Sprint 2** — Schema.org JSON-LD: Event su corse, Person su profili, WebSite su homepage (oggi presente solo `SportsEvent` sul calendario gare)
2. **SEO Sprint 3** — Migrazione a `next/font`, ottimizzazione keyword, OG image per bacheca

### Calendario gare (`/calendario-gare`) — ✅ completata (in produzione)
Sezione Extra: catalogo di **eventi reali** (`races`), distinto dai post community `type='gara'`.
Import automatico (**AIMS ICS** + **costanti Major/SuperHalfs**) + **segnalazioni utenti** moderate;
pagina lista/scheda con SEO, tool "gara ideale", ponte community via `runs.race_id`.

📖 **Documentazione completa: [`docs/CALENDARIO-GARE.md`](docs/CALENDARIO-GARE.md)** (schema, motori d'import, pagine, moderazione, manutenzione, decisioni).

- SQL: #25 `races.sql` ✅ · #26 `add-race-id.sql` ✅ · **#27 `races-moderation.sql` ⏳ da applicare** (abilita la moderazione).
- Comandi import: `npm run import:aims` (poi `npm run seed:circuits`) — richiedono `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- FIDAL **scartato** (querystring ignorata, filtro JS-only): il long-tail IT cresce con le segnalazioni utenti.

### Follow-up sezione Tools
6. **Programma "Da zero a 5K"** — ✅ FATTO (rimando editoriale): la CTA nell'esito del quiz punta alla guida completa su `www.vieniacorrere.it/da-zero-a-5-km-la-guida-completa-per-iniziare-a-correre/`. Follow-up eventuale: percorso interattivo in-app se in futuro si vuole un piano guidato dentro l'app
7. **Voce "Strumenti" nella nav** — ✅ FATTO: menu **Extra** nell'Header (desktop + mobile) con link a Strumenti e al sito editoriale
8. **Allineamento dominio template email** — su `main` i template usano `www.vieniacorrere.it`; valutare allineamento a `app.` quando la migrazione domini arriva su `main`
9. **Strategia gara — gare precaricate** — ✅ FATTO (catalogo statico): 8 grandi maratone reali (Berlino, Boston, Firenze, NewYork, Parigi, Roma, Valencia, Venezia) selezionabili con ricerca per gara/città, oltre all'upload GPX. Pipeline ripetibile: droppare i .gpx in `scripts/race-courses-gpx/` e lanciare `npm run gen:courses` (genera `src/lib/running/raceCourses.generated.ts`). Nota: il GPX di Firenze risulta parziale (~31 km), da sostituire. Follow-up: migrazione a DB `race_courses` + segmenti quando il catalogo cresce; compilare campo `country`
10. **Strategia gara — salvataggio strategie** — tabelle `race_strategy_plans`/`race_strategy_splits`, salvataggio nel profilo utente e collegamento alla sezione Gare
11. **Strategia gara — evoluzioni** — API meteo per condizioni previste, import passo da Strava/Garmin, confronto previsione vs risultato reale, export PDF "Race Plan"

### Follow-up integrazione Strava (`docs/STRAVA.md`) — ⚠️ annullati: integrazione staccata il 21/11/2026
- ✅ **Auto-conferma presenze** — FATTO (SQL #32): match attività↔corse partecipate → `run_confirmations(source='strava')` + badge presenze partecipante
- **Webhook async**: oggi l'evento è processato in modo sincrono prima del 200; per volumi alti accodare (queue/Edge Function)
- **Backfill storico più profondo**: oggi 30 giorni al primo collegamento; valutare finestra maggiore o import on-demand
- **Dati aggiuntivi**: cadenza, kudos, scarpe, split per km, mappa percorso (polyline) — alcuni richiedono colonne nuove e/o la chiamata di dettaglio per attività

### App mobile — passaggi aperti (aggiornato 21/11/2026)
> ✅ **Collaudo su iPhone chiuso il 21/11/2026 (dichiarato "funziona tutto")**: login, creazione/modifica corsa, richieste, push reali, chat, ritrovo, Crew, segnala (+ email staff), blocca, foto profilo, registrazione/reset password, elimina account (account usa-e-getta). Restano da fare i punti 2, 3 (Android), 5 qui sotto e le funzioni di Fase 4.

1. ✅ Fatto il 21/11/2026: SQL #42 e #43 applicati, `delete-account` e `notify-report` pubblicate, `STAFF_ALERT_EMAIL` impostato, template *Reset Password* incollato. Resta da **provare** con un **account usa-e-getta** (l'eliminazione è irreversibile: mai con l'account principale) e da verificare l'email di una segnalazione reale.
2. **Pubblicare il sito** (push su `main` → Vercel) per mettere online `/elimina-account`; aggiornare Privacy (token push, coordinate luoghi, sub-responsabili Expo/Resend/Nominatim/Strava, eliminazione dall'app, età minima, "analisi aggregata" senza strumenti) e Termini (la sez. 6 promette la cancellazione dal profilo web: **non esiste**, aggiungere il pulsante o correggere). Dettaglio in `docs/APP-STORE-PRIVACY.md`.
3. Provare le **push** con la nuova build iOS (trigger immediato + consegna reale); `aps-environment` oggi `development`, da verificare nella build di produzione. Android: progetto Firebase + `google-services.json` + credenziali FCM v1 su EAS.
4. **Bug/limiti del sito emersi dal lavoro sull'app** (da valutare): (a) le notifiche `corsa_modificata` che `EditRunForm` inserisce da client probabilmente falliscono per la policy "No direct insert" su `notifications` (fix pulito: trigger DB su UPDATE di `runs`); (b) il prompt "La corsa si è svolta?" fa upsert su `run_confirmations` senza `user_id` (colonna NOT NULL senza default nello SQL del repo); (c) l'email `promemoria_corsa` sembra partire all'INSERT anziché a `show_after`; (d) nessuna notifica per i messaggi di `run_chat`; (e) i conteggi partecipanti per i non-organizzatori (RLS).
5. Account demo per i revisori Apple, screenshot e testi degli store, build di produzione, TestFlight / test interno Google Play.

6. **🔴 Distacco Strava — chiusura (deciso il 21/11/2026; lato web FATTO e pushato su `main` il 21/11/2026; revoca token, SQL #46 e FASE 2 ancora da fare).** Motivo: API Policy Strava (Effective Date 1/6/2026, sez. 2.3, 5.4, 6.2, 7.4) → dati Strava non mostrabili ad altri utenti; dettagli in `docs/STRAVA.md`. Checklist, in ordine:
   - [x] **Sito:** push su `main` fatto il 21/11/2026 con ok esplicito (build ok). Contiene: rimozione route `/api/strava/*`, `lib/strava`, UI, pagina allenamenti, sezione profilo; feed crew solo "nuovi ingressi"; script `strava:detach`; SQL #46.
   - [x] **FATTO il 21/11/2026** (2 token revocati, 0 errori; webhook 360794 eliminato; 288 attività e 0 presenze `source='strava'` ancora in DB fino al SQL #46) — `npm run strava:detach` (dry-run) → `npm run strava:detach -- --apply`: revoca i token su Strava ed elimina il webhook. **Subito dopo il deploy** (le route non rispondono più) e **prima** del SQL.
   - [x] **APPLICATO il 21/11/2026** (verificato: 0 connessioni, 0 attività, 0 webhook, 0 profili con flag `strava_*`) — `supabase/strava-detach.sql` (#46) dal SQL Editor (rollback: `strava-detach-rollback.sql`, non ripristina i dati). L'app mobile non si rompe: tabelle e colonne restano, le query danno 0 righe.
   - [ ] Eliminare l'app su https://www.strava.com/settings/api e le env `STRAVA_*` da Vercel e `.env.local`.
   - [ ] Rivedere **a mano** i testi: `/privacy` (riga "Strava (facoltativo)", sub-responsabili), `/elimina-account`, `/termini` se serve. Non modificati dal distacco.
   - [~] **App mobile** (Apple ha approvato la 1.0.0 e l'app è in store, 21/11/2026): codice ripulito e committato nel repo `vieniacorrere-app`, branch `chore/rimuovi-strava` (commit da0e184, **PR #13 mergiata**): tolta la sezione "Corse recenti" da `profilo/[id].tsx`, la query `strava_activities` da `public-profile.ts`, `StravaActivity`/`strava_public_profile` da `types.ts`, la frase su Strava da `elimina-account.tsx`; `app.json` → **versione 1.0.1**; `npx tsc --noEmit` ok. **Build iOS di produzione 1.0.1 (build n. 4) lanciata su EAS con auto-submit** a App Store Connect (build 888b3278, submission b9eee1bb). **1.0.1 (build 4) inviata in revisione ad Apple il 21/11/2026** — in attesa di approvazione; poi eseguire la FASE 2 (#47). `strava_url` (link scritto a mano) resta. Android: non fatto (la build Android non è stata lanciata).
   - [x] Blocco "Strava: revoca" tolto da `supabase/functions/delete-account/index.ts` e funzione **ripubblicata il 21/11/2026** (`supabase functions deploy delete-account --project-ref wshjtgtmxbxhpdqtxpiq --use-api`, da lanciare dalla radice del repo).
   - [ ] **FASE 2 (SQL #47 `supabase/strava-detach-fase2.sql`, pronto, NON applicato):** DROP di `strava_activities`, `strava_connections` e delle colonne `profiles.strava_share_activities/strava_public_profile`. Da eseguire **solo dopo che la 1.0.1 dell'app è approvata e adottata** (le versioni ≤ 1.0.0 interrogano ancora quelle tabelle: dopo il DROP non crashano ma ricevono errore).
   - [ ] Quando i dati sono cancellati: togliere "Fitness" dalla Privacy in App Store Connect (e dal Play Data safety se dichiarato) e aggiornare `docs/APP-STORE-PRIVACY.md`.

### Bassa priorità / idee future
12. **GPS condiviso durante la corsa** — tracker posizione in tempo reale per il gruppo
13. **Backfill coordinate corse esistenti** — geocodificare le corse create prima della mappa

---

## 10. Come avviare il progetto in locale

```bash
git clone https://github.com/Santamicone/corriamo.git
cd corriamo
git checkout feat/ui-ux-redesign
npm install

# Configura .env.local (vedi §3)
npm run dev   # → http://localhost:3000
npm run build # verifica prima di push
```

---

## 11. Deployment

- **Piattaforma:** Vercel (deploy automatico a ogni push su `main`)
- **Preview:** ogni push su branch crea un preview URL temporaneo
- **Rollback:** Vercel → Deployments → promote to production

---

## 12. Repository e risorse

| Risorsa | URL |
|---|---|
| Repository | https://github.com/Santamicone/corriamo |
| Produzione | https://www.vieniacorrere.it |
| Supabase Dashboard | https://supabase.com/dashboard/project/wshjtgtmxbxhpdqtxpiq |
| Vercel Dashboard | https://vercel.com/santamicone/corriamo |
| App mobile (repo privato) | https://github.com/Santamicone/vieniacorrere-app |
| Progetto EAS (build app) | https://expo.dev/accounts/vieniacorrere/projects/vieniacorrere |
