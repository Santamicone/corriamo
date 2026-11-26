# PROJECT_STATUS.md — Vieni a correre?

> ✅ **21–22/11/2026 — Integrazione Strava STACCATA dal sito e dal database** (policy API Strava, Effective Date 1/6/2026: vietato mostrare dati di un atleta ad altri utenti, aggregarli, tenerli in cache >7gg). Codice rimosso da web e app (1.0.1 online); token revocati; **SQL #46 e #47 applicati** (tabelle e colonne Strava cancellate); "Fitness" tolto dalla privacy in App Store Connect il 22/11/2026. Restano solo: eliminare l'app su strava.com/settings/api e le env `STRAVA_*` da Vercel/`.env.local`. Procedura e motivi in `docs/STRAVA.md`. Le sezioni "Strava" più sotto sono storiche.

> 📱 **22/11/2026 — App iOS 1.1.0 inviata ad Apple** (build 5, stato "in attesa di verifica"): accesso con Apple/Google/Facebook, mappa delle crew con "Avvisami", Scopri a sezioni (gestite / non gestite), due link gare nel profilo. La 1.0.1 è online. Dopo l'approvazione: badge ufficiale App Store su `/app`; entro aprile 2027 aggiornare Expo SDK (avviso Apple ITMS-90725, SDK iOS 27).
>
> 🗺️ **22/11/2026 — Mappa delle crew:** Fasi 1, 2a-1 e 2a-2 **fatte, applicate e su `main`**: SQL #49 (mappa), #50 (schede informative + admin `/admin/crew` con import CSV e, dal 22/11/2026, modifica delle schede informative in `/admin/crew/[id]/modifica`, senza SQL), #51 ("Avvisami" + lista ordinata `crews_discover`); nell'app 1.1.0 mappa, elenco a sezioni e scheda informativa. **⏸ SOSPESE (deciso il 22/11/2026):** rivendicazione delle crew (Fase 2b, `crew_claims`, SQL #52 previsto), suggerimenti di modifica degli utenti, area gestori (Fase 3), verifica e badge (Fase 4); mancano anche la fascia "Nuove crew", la notifica `crew_claimed` a chi ha usato "Avvisami" e l'ordine di §6.1 nella lista `/crew` del sito. Specifica in **`docs/MAPPA-CREW.md`**.

> Documento di stato del progetto per il ripristino del contesto in una nuova sessione Claude Code.  
> Aggiornato al: **22/11/2026** (stato completo nei banner in testa; il resto di questa riga è lo stato al 06/11) — nasce l'**app mobile nativa** (repo separato privato `Santamicone/vieniacorrere-app`, Expo/React Native, stesso Supabase). Lato backend di questo repo: **push notification** (SQL **#41** `push-tokens.sql` ✅ applicato in produzione + Edge Function `send-push` ✅ pubblicata + cron `push-due-every-5min` ✅ attivo), **blocco utenti** (SQL **#42** `user-blocks.sql` ⏳ da applicare), **avviso email allo staff per ogni segnalazione** (SQL **#43** `report-alerts.sql` + Edge Function `notify-report` ⏳ da applicare/pubblicare), **eliminazione account** (Edge Function `delete-account` ⏳ da pubblicare) e nuova pagina pubblica **`/elimina-account`** (richiesta da Google Play, ⏳ da pubblicare). Il template email *Reset Password* contiene ora il codice `{{ .Token }}` per il recupero password dell'app (⏳ da incollare nel Dashboard). Bozza schede privacy e note per gli store in **`docs/APP-STORE-PRIVACY.md`**. Dettagli nelle sezioni 4, 6 e 9.
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
| 46 | `supabase/strava-detach.sql` | ✅ applicato il 21/11/2026 (FASE 2 → #47 `strava-detach-fase2.sql`, ✅ applicato il 22/11/2026: tabelle `strava_*` e colonne `profiles.strava_share_activities/strava_public_profile` eliminate) | **Distacco Strava**: cancella `run_confirmations` con `source='strava'`, `strava_activities`, `strava_connections`; droppa la policy `strava_activities_select` e `shares_private_crew_with()`; spegne i flag `strava_*` su `profiles`. Tabelle/colonne restano (compatibilità app in revisione + Edge Function `delete-account`); DROP definitivo nella FASE 2 commentata. **Irreversibile sui dati.** Rollback: `strava-detach-rollback.sql` (solo policy/funzione). |
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
| 48 | `supabase/oauth-profile-name.sql` | ✅ applicato (21/11/2026) | **Login Google/Facebook (sito).** `handle_new_user()` sceglie `full_name` → `name` → `Nuovo runner` (Facebook manda solo `name`; prima i profili OAuth nascevano senza nome). Resto invariato. Nessuna nuova tabella/colonna. Rollback: `oauth-profile-name-rollback.sql`. Numeri della mappa crew riallineati in `docs/MAPPA-CREW.md` (ora #49–#53). |
| 49 | `supabase/crew-map.sql` | ✅ applicato (22/11/2026, su `main`) | **Mappa delle crew, Fase 1** (`docs/MAPPA-CREW.md`). Additivo: su `crews` `lat`, `lng` (arrotondate dal trigger `crews_round_coords`: mai il punto esatto), `pin_precision` (exact/area/city, default area), `show_on_map` (opt-in, default false), `meeting_point`, `website_url`, `instagram_url`, vincoli (URL solo http/https, slug riservati); RPC `crews_in_bbox()` (SECURITY INVOKER, solo campi pubblici; restituisce già `trust_level` e `has_manager` per non cambiare firma in Fase 2a). **Applicare PRIMA di pubblicare il codice**. Rollback: `crew-map-rollback.sql` (cancella i dati di mappa). |
| 50 | `supabase/crew-directory.sql` | ✅ applicato (22/11/2026; codice su `main`) | **Mappa crew, Fase 2a-1: schede informative + admin.** Su `crews`: `moderation_status`, `trust_level`, `source`, `created_by`, `schedule_text`, `activity_status`, `last_confirmed_at`; `owner_id` diventa NULLABLE; `visibility` accetta `directory` (invisibile all'app 1.0.x); invariante: senza proprietario = `directory` = `unclaimed`; trigger `crews_protect_trust_columns` (authenticated/anon non toccano i campi di fiducia) e `crew_members_require_manager` (nessuna richiesta di ingresso su schede senza gestore); `add_crew_owner_as_member` tollera owner nullo; nuova `crews_select`; tabella privata `crew_contacts` (nessuna policy); `find_duplicate_crews()` (solo service_role); `crews_in_bbox` ricreata (stessa firma) con le schede informative. **Applicare PRIMA di pubblicare il codice** (admin `/admin/crew`, `/crew/[id]` informativa). Rollback: `crew-directory-rollback.sql` (CANCELLA le schede senza proprietario). |
| 51 | `supabase/crew-discover.sql` | ✅ applicato (22/11/2026; verificato con la chiave anonima: `crews_discover`, RLS di `crew_interests` e permessi; codice su `main`) | **Mappa crew, Fase 2a-2: "Avvisami" e lista ordinata.** Tabella `crew_interests` (ognuno vede/crea/cancella solo le proprie righe, e solo su schede senza proprietario); `crew_interest_count(crew_id)` (solo il numero); `crews_discover(q, city, limit)` (SECURITY DEFINER, solo campi pubblici e conteggi): lista di Scopri già ordinata per §6.1 (geografia → gestite prima delle non gestite → attività → membri → nome; soglia 5 membri; gruppi 0–3), stesso contratto per sito e app. Additivo: l'app 1.0.x non cambia. L'app 1.1.0 e il bottone "Avvisami" del sito funzionano anche prima (ricadono sulla lista semplice), ma la tabella `crew_interests` serve per salvare le richieste. Rollback: `crew-discover-rollback.sql` (cancella le richieste "Avvisami"). |
| 52 | `supabase/admin-notifications.sql` | ✅ applicato (23/11/2026; cron job id 6; email non ancora provata) | **Notifiche email agli admin** per nuove registrazioni e nuove corse. Tabelle `admin_notification_rules` (evento attivo + frequenza `immediate`/`hourly`/`daily`), `admin_notification_settings` (ora del riepilogo giornaliero), `admin_notification_prefs` (admin che disattivano gli avvisi), `admin_event_queue` (coda); trigger `trg_admin_event_signup` su `profiles` e `trg_admin_event_run` su `runs` (una sola notifica per serie); cron `notify-admins-every-15min`. RLS attiva senza policy (solo service-role). **Prima:** `supabase functions deploy notify-admins --no-verify-jwt --use-api` (da eseguire nella cartella del sito `corriamo`, non in `vieniacorrere-app`). Gestione da `/admin/notifiche` (AAL2). Rollback: `admin-notifications-rollback.sql`. Avvisi attivi e "subito" appena applicato. |
| 53 | `supabase/run-proposals.sql` | ✅ applicato (24/11/2026; `send-push` ripubblicata; verificato con la chiave anonima: `proposals_discover` risponde, `adopt_proposal` ed `expire_run_proposals` negate ad anon, `proposal_interests` vuota per anon, `runs.proposal_id` presente). Provato prima in locale su PGlite (38 controlli). Da verificare: cron `expire-run-proposals` in `cron.job`, concorrenza reale su due connessioni, prima push `proposta_adottata`. **Sito scritto il 24/11/2026, non ancora pushato** (build ok): `/admin/proposte` (elenco, tasso di adozione, nuova da modello con avvisi e "Pubblica comunque", ritira; API `/api/admin/proposte`, AAL1 + service-role come le crew), `/proposte/[id]` (pubblica, "Mi interesserebbe", "La organizzo io"), sezione "Cercano un organizzatore" in bacheca (in alto se le corse reali sono meno di 5), `/nuova-corsa?proposta=` precompilato che pubblica con `adopt_proposal`, notifica `proposta_adottata`, `proxy.ts` conserva `next` per l'adozione. App non ancora scritta | **Proposte di corsa adottabili** (spec: `vieniacorrere-app/docs/proposte-adottabili.md`). Tabelle `run_proposals` (corse senza organizzatore, lettura pubblica, scrittura solo admin AAL2; coordinate arrotondate a 2 decimali; `expires_at` di default = min(+7 giorni, giorno prima alle 20:00)) e `proposal_interests` ("Mi interesserebbe", privato). Colonne nuove `runs.proposal_id` (unica) e `notifications.proposal_id`. RPC `proposals_discover(city, limit)` e `proposal_detail(id)` (SECURITY DEFINER, anche anon, solo il numero di interessati); `adopt_proposal(id, run jsonb)` (atomica con `FOR UPDATE`: crea la corsa, data ±2 giorni, max 2 corse future da proposte per utente, copia gli interessi in `interests` esclusi i blocchi, notifica `proposta_adottata`); `expire_run_proposals()` + cron `expire-run-proposals` (orario). Ridefinisce `call_send_push()` (#44 + `proposta_adottata`). **Dopo:** `supabase functions deploy send-push --no-verify-jwt --use-api` (PUSH_TYPES aggiornato). Additivo per le app già pubblicate. Rollback: `run-proposals-rollback.sql` (cancella proposte e interessi; le corse adottate restano). |
| 54 | `supabase/chat-delete.sql` | ✅ applicato (26/11/2026; provato nell'app con due account). **Sito allineato e online dal 26/11/2026** (commit `4a66344`, insieme al sito per il #55) | **Eliminazione "alla WhatsApp" dei messaggi di chat** (spec: `vieniacorrere-app/docs/evoluzioni-crew.md` §1). Colonna `deleted_at` su `crew_chat` e `run_chat`; RPC `delete_crew_chat_message(id)` (autore o owner/admin crew) e `delete_run_chat_message(id)` (autore o organizzatore): la riga resta, `body` diventa `'Messaggio eliminato'` e il contenuto originale sparisce. Policy di DELETE invariate: le app 1.0.x/1.1.x continuano col DELETE fisico e vedono il testo normale. Il Realtime usa gli UPDATE. Rollback: `chat-delete-rollback.sql`. **Sul sito:** `BoardWindow` usa le RPC (con conferma ed errore visibile), mostra "Messaggio eliminato" e ascolta gli UPDATE; chi organizza può eliminare i messaggi altrui nella chat di corsa |
| 55 | `supabase/crew-join-request.sql` | ✅ applicato (26/11/2026; verificato: elenco delle policy dal SQL Editor e `accept_crew_invite` negata con la chiave anonima). Provato prima in locale su PGlite (54 controlli). Sito online (commit `4a66344`, verificato senza accesso). Da provare i flussi con accesso e da eseguire la query sui ruoli `owner` anomali | **Crew: ingresso solo su richiesta + chiusura di una falla.** Secondo i file SQL precedenti, via API ci si poteva inserire in una crew gestita già `active` anche come `owner`, approvarsi o promuoversi da soli, spostare la propria riga in un'altra crew. Ora: INSERT solo se stessi come `member`/`pending`; policy `crew_members_insert_admin` eliminata; UPDATE solo owner/admin; trigger `trg_crew_members_protect_update` (`crew_id`/`user_id` immutabili, riga del proprietario protetta, ruoli cambiabili solo dal proprietario; nessun vincolo senza `auth.uid()`: SQL Editor e service_role); `accept_crew_invite` crea una richiesta in attesa (esiti `requested`/`already_requested`/…) e corregge l'errore `crew_id is ambiguous` di `crew-invite-accept.sql` emerso nelle prove. Lo script si annulla se trova altre policy permissive di INSERT/UPDATE. Non tocca dati; le app 1.0.x–1.2.x continuano a funzionare. **Dopo:** eseguire la query commentata in fondo (ruoli `owner` anomali). **Sito:** via `AddMemberSearch`; POST `/api/crew/[id]/members` accetta solo la richiesta per sé; il link `/crew/invite/[token]` porta alla scheda (per le crew private fa da scheda ridotta) con "Chiedi di entrare"; la pagina crew ora riconosce le richieste in attesa o rifiutate. Rollback: `crew-join-request-rollback.sql` (riapre la falla) |
| 56 | `supabase/proposal-images.sql` | ✅ applicato (26/11/2026; `select` di verifica tutta `true`; con la chiave anonima lista e scheda restituiscono `image_url`). Provato prima in locale su PGlite (15 controlli). Da provare: caricamento di un'immagine da admin | **Proposte: immagine e tipologia "Test di gara"** (spec: `vieniacorrere-app/docs/evoluzioni-crew.md` §6–7). Colonna `run_proposals.image_url` (solo `https://`); CHECK di `kind` allargato a `test_gara`; bucket pubblico `proposal-images` (1 MB, JPEG/WebP) **senza policy di scrittura** (carica solo l'API admin con service-role); `proposals_discover` e `proposal_detail` eliminate e ricreate nella stessa transazione con `image_url` in coda. La `select` finale deve dare tutti `true`. App 1.2.0: una proposta `test_gara` ha icona generica e nessuna etichetta di tipologia. **Sito:** segnaposto in `public/proposals/{kind}.jpg` (800×800), miniatura nella card e immagine nella scheda (`ProposalImage`), caricamento nel modulo "Nuova proposta" (ritaglio e compressione nel browser, `POST /api/admin/proposte/immagine`), blocco in home dopo "Come funziona" (`components/home/`: prossime corse **pubbliche** e proposte, 2:1, carosello; home in ISR ogni 5 minuti; di una serie solo il prossimo appuntamento). Le proposte esistenti non si possono modificare. Rollback: `proposal-images-rollback.sql` (le `test_gara` diventano `veloce`) |
| 57 | `supabase/checkins-fix.sql` | ✅ applicato (26/11/2026: `policy_corretta` = true, 0 check-in senza approvazione). Provato prima su PGlite | **Correzione di sicurezza dei check-in.** In `check-ins.sql` la sottoquery diventava `participations.run_id = participations.run_id`: chi era approvato in una corsa qualsiasi poteva fare check-in in tutte. La policy `check_ins_insert` ora richiede di organizzare o essere approvati in **quella** corsa. Non tocca dati; la `select` finale dà `policy_corretta` e il numero di check-in senza approvazione (include chi l’ha persa dopo). Indipendente dal #58. Rollback: `checkins-fix-rollback.sql` (reintroduce l’errore) |
| 58 | `supabase/ritrovo-nudge.sql` | ✅ applicato (26/11/2026: `select` di verifica tutta `true`; con la chiave anonima `nudge_missing` è negata e le due tabelle non mostrano righe), dopo il deploy di `send-push` (versione 8). Prima: 50 controlli su PGlite per #57+#58. **Da provare:** sollecito e push reali con due account, concorrenza | **Arrivi al ritrovo e sollecito** (spec: `vieniacorrere-app/docs/evoluzioni-crew.md` §5). `run_arrivals` (scritta solo dal trigger `trg_check_ins_arrival`: resta anche se si disattiva il ritrovo; la legge chi organizza, ognuno la propria riga; in Realtime), `run_nudges` (ultimo sollecito), RPC `nudge_missing(run_id)` (solo organizzatore, da -10 a +30 minuti, 1 ogni 5 minuti, blocchi esclusi), `call_send_push()` con `sollecito_ritrovo`. **Prima:** `supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api`, dalla cartella `corriamo` (la push del sollecito scade dopo 15 minuti). La `select` finale deve dare tutti `true`. **Sito:** la notifica apre `/corse/[id]/ritrovo`. **App 1.3.0:** pannello «arrivati» nel ritrovo per chi organizza. App 1.2.0: icona di ripiego e la push apre la corsa. Rollback: `ritrovo-nudge-rollback.sql` |
| 59 | `supabase/crew-run-link.sql` | ✅ applicato (26/11/2026: i due trigger `true`, 0 corse e 0 serie collegate da non gestori). Provato prima su PGlite | **Corse e serie collegabili a una crew solo da chi la gestisce.** Le policy di `runs` e `series` controllavano solo l'organizzatore: via API si poteva collegare una corsa a qualsiasi crew (e, se `crew_only`, far partire notifiche e push a tutti i membri). Trigger `crew_link_guard` su `runs` e `series`: alla creazione o quando `crew_id` cambia serve owner/admin attivo; togliere il collegamento è libero; nessun vincolo senza `auth.uid()`. La `select` finale dà i due trigger e il numero di corse e serie collegate da chi oggi non gestisce la crew. **Non** copre `runs.series_id` (resta senza controllo). Rollback: `crew-run-link-rollback.sql` |
| 60 | `supabase/crew-dashboard.sql` | ✅ applicato (26/11/2026: con la chiave anonima le tre funzioni sono negate e `crew_stats` risponde). Provato prima su PGlite. **Da provare** con un membro e un gestore, dall'app | **Statistiche della crew** (spec: `vieniacorrere-app/docs/evoluzioni-crew.md` §4). RPC `crew_dashboard_summary` (membri attivi: corse, partecipazioni con organizzatore, media, persone, presenze rilevate, top 5, mesi) e `crew_dashboard_members` (solo owner/admin: una riga per membro attivo, stato attivo/nuovo/inattivo a 60 giorni); base `crew_dashboard_signups` non chiamabile dai ruoli. Nomi nuovi: `crew_stats` (#34) resta. **Niente tasso di presenza né affidabilità** (scelta del 26/11: la mancanza di un check-in non prova un'assenza). La `select` finale deve dare tutti `true`. **App 1.3.0:** schermata `statistiche-crew/[id]`. **Sito:** solo informativa privacy aggiornata (arrivi al ritrovo e statistiche). Rollback: `crew-dashboard-rollback.sql` |
| 61 | `supabase/chat-realtime.sql` | ✅ applicato (26/11/2026: dal sito in locale il server accetta tutti i canali, compresi `run_chat` e `messages`; consegna dal vivo di un messaggio non riprovata). Provato prima su PGlite | **Tempo reale per chat della corsa e messaggi privati.** Aggiunge `run_chat` e `messages` alla publication `supabase_realtime` se mancano; non tocca dati, policy né permessi, e si ferma se la RLS non è attiva. Rieseguibile. La `select` finale deve dare due `true`. Rollback: `chat-realtime-rollback.sql` (le toglie entrambe) |
| 62 | `supabase/crew-messages.sql` | ✅ applicato (26/11/2026; `select` di verifica tutta `true`). Provato prima su PGlite (60 controlli, anche rollback e riapplicazione). **Prima:** `supabase functions deploy send-push --project-ref wshjtgtmxbxhpdqtxpiq --no-verify-jwt --use-api` (nuovo tipo `messaggio_crew`) e, per la pulizia degli allegati, `supabase functions deploy delete-account --project-ref wshjtgtmxbxhpdqtxpiq --use-api` (senza `--no-verify-jwt`), dalla cartella `corriamo`. **Sito scritto il 26/11/2026, non pushato** (`tsc` e `npm run build` ok, non provato con due account): `/crew/[id]/messaggi` (gestore: elenco conversazioni, "Nuovo messaggio" con scelta di più destinatari o tutti, allegato JPEG/PNG/WebP/PDF; membro: "Messaggi dal gestore" con risposta di testo; eliminazione, "Letto", segnalazione con il testo allegato, tempo reale), link da `/crew/[id]` e da Gestisci crew, notifica `messaggio_crew` in `/notifiche`, etichetta in `/admin/segnalazioni` (lo staff non legge i messaggi: il testo lo allega chi segnala). Il sito non ha ancora il blocco utenti. **App scritta, non committata** (`tsc` ok, da provare su dispositivo, per la 1.3.0): `src/app/messaggi-crew/[id].tsx` + `src/lib/crew-messages.ts` (elenco, conversazione, risposta, nuovo messaggio a più persone con immagine, segnala e blocca con pressione lunga, eliminazione, tempo reale), voce nella scheda crew, notifica nella tab Notifiche. Dall'app si allegano solo immagini (niente `expo-document-picker`: i PDF si inviano dal sito); la push apre l'elenco notifiche (il payload non porta il `crew_id`). | **Messaggi privati del gestore ai membri, con allegati (Fase F).** Tabella `crew_direct_messages`: una riga per destinatario, con `batch_id` che raggruppa un invio a più persone; RLS di lettura solo per mittente e destinatario, nessuna scrittura diretta (privilegi tolti). RPC `send_crew_message` (solo owner/admin attivi; destinatari = membri attivi della stessa crew, `null` = tutti; max 50 per invio, 20 invii/ora; i blocchi in entrambi i sensi sono saltati e contati in `skipped`), `reply_crew_message` (risposta di testo a chi ti ha scritto, 60/ora, rifiutata se c'è un blocco), `mark_crew_messages_read`, `delete_crew_direct_message` (solo il mittente: 'Messaggio eliminato', allegato staccato). Bucket **privato** `crew-attachments` (10 MB, JPEG/PNG/WebP/PDF), percorso `{crew_id}/{batch_id}/{uuid}`: lettura solo a mittente e destinatari tramite la riga del messaggio, scrittura/cancellazione agli owner/admin della crew. Notifica `messaggio_crew` (trigger; per le risposte una sola ogni 10 minuti se la precedente non è letta) con nuova colonna `notifications.crew_id`. `call_send_push()` ridefinita (#58 + `messaggio_crew`). Realtime su `crew_direct_messages`. Additivo: le app 1.0.x–1.2.x non cambiano. Limite noto: i file non si cancellano da SQL, restano in Storage dopo l'eliminazione di un messaggio (illeggibili senza riga); `delete-account` ora toglie quelli dell'utente. Rollback: `crew-messages-rollback.sql` (CANCELLA i messaggi privati) |
| 63 | `supabase/run-series-link.sql` | ⏳ scritto (26/11/2026), **da applicare**. Provato su PGlite (15 controlli, anche rollback e riapplicazione). Nessuna funzione da pubblicare prima | **Corse collegate a una serie: solo a una serie propria.** Via API si poteva mettere una propria corsa nella serie di un altro (la policy di `runs` controlla solo `organizer_id`): la corsa compariva nella pagina e nelle card della serie con titolo e luogo scelti da chi la creava. Stesso schema di #59 per `crew_id`: trigger `trg_runs_series_link` su `runs` (insert, o update di `series_id`): chi agisce deve essere organizzatore o co-organizzatore della serie; togliere il collegamento è sempre permesso; senza utente (SQL Editor, service_role) nessun vincolo; le modifiche che non cambiano `series_id` non sono toccate. Non tocca dati. La `select` finale mostra anche `corse_in_serie_altrui` (conteggio di corse già collegate a serie di altri: sopra zero non prova un abuso; la query per vederle è commentata in fondo al file). Sito e app non cambiano (il sito propone solo le proprie serie). Rollback: `run-series-link-rollback.sql` |

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
| `notify-admins` | ✅ deployata (23/11/2026) | trigger `trg_admin_event_*` (subito) + cron `notify-admins-every-15min` | **no** (`x-push-secret`) | Email agli admin per nuove registrazioni/corse, a seconda di `admin_notification_rules` (subito, riepilogo orario o giornaliero). Secret: `PUSH_FUNCTION_SECRET`, `RESEND_API_KEY` (già presenti) |
| `delete-account` | ✅ (21/11/2026, ripubblicata senza blocco Strava; mai provata) | app mobile (`supabase.functions.invoke`) | **sì** (nessun `--no-verify-jwt`) | Elimina l'account di chi chiama. Rifiuta gli admin e chi possiede crew con altri membri attivi; scrive notifiche di annullamento **senza `run_id`** agli iscritti alle corse future (con `run_id` sparirebbero in cascata con la corsa); pulisce Storage (`avatars`, `momenti`, `crew-covers`); prova a revocare Strava; poi `auth.admin.deleteUser` (la cascata FK elimina il resto). **22/11/2026:** revoca "Accedi con Apple" dopo l'eliminazione (riceve `{ appleAuthorizationCode }` dall'app 1.1.0; secret `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, opz. `APPLE_CLIENT_ID`; senza secret la revoca è saltata). Ripubblicata il 22/11/2026. |

**Segreti.** Vault database: `push_function_secret` (letto dai trigger/cron). Secret delle funzioni: `PUSH_FUNCTION_SECRET` (**stesso valore** del Vault; verifica con `supabase secrets list`: l'impronta sha256 deve coincidere), `RESEND_API_KEY`, `STAFF_ALERT_EMAIL` (per `notify-report`), `EXPO_ACCESS_TOKEN` (facoltativo). **Non incollare mai il valore del segreto in chat/log:** se succede, rigenerarlo e aggiornare entrambi i posti (`vault.update_secret(...)` + `supabase secrets set`).

**Job pg_cron attivi:** `email-digest-every-30min` (id 1), `weekly-digest-monday` (id 3), `push-due-every-5min` (id 4), `notify-admins-every-15min` (id 6). Diagnostica: `cron.job_run_details` (esecuzioni) e `net._http_response` (risposte HTTP delle funzioni; filtrare per contenuto, es. `like '%processed%'` per le push).

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
│   ├── page.tsx                      Homepage: hero, value props, come funziona, prossime corse + proposte
│   │                                 (components/home/, ISR 5 min), "Perché Vieni a correre?" (foto noi.jpeg), why different
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
│   │   │   ├── MemberActions.tsx     Approva/rimuovi membro
│   │   │   ├── InviteLinkSection.tsx Link d'invito con token
│   │   │   └── DeleteCrewButton.tsx  Eliminazione crew
│   │   ├── mappa/page.tsx            Mappa Leaflet delle crew con clustering (Fase 1, SQL #49)
│   │   ├── citta/[city]/page.tsx     Crew per città (SSR, indicizzabile)
│   │   ├── [id]/InformativeCrew.tsx  Scheda informativa (crew senza proprietario, noindex)
│   │   ├── [id]/NotifyMeButton.tsx   "Avvisami" (crew_interests, SQL #51)
│   │   └── invite/[token]/page.tsx   Link di invito: porta alla scheda; richiesta da approvare (InviteRequestButton)
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
- [x] Login e registrazione con **Google** e **Facebook** (Meta) — componente `src/components/auth/OAuthButtons.tsx`, callback `src/app/auth/callback/route.ts` (valida `next`, benvenuto ai nuovi utenti, errori provider → `/login?error=…`). Google attivo; Facebook attivo (app Meta 1946773333353218 in modalità Live dal 21/11/2026, collegata al portfolio business Web Live; configurato anche su Supabase); SQL #48 applicato. Nell'app mobile NON ancora (Apple 4.8: vanno aggiunti insieme a Accedi con Apple)
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
- [x] Gestione membri: ingresso solo su richiesta (anche dal link invito), approvazione, rimozione, eliminazione crew (SQL #55)
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

#### Mappa delle crew e schede informative (`docs/MAPPA-CREW.md`) — SQL #49–#51 ✅ applicati (22/11/2026)
- [x] **Fase 1** (SQL #49): `/crew/mappa` (Leaflet + clustering), pagine `/crew/citta/[city]`, opt-in `show_on_map` del proprietario, coordinate arrotondate dal database, RPC `crews_in_bbox` (contratto comune a sito e app), `src/lib/crewMap.ts`
- [x] **Fase 2a-1** (SQL #50): `owner_id` nullable, `visibility='directory'` (invisibile all'app 1.0.x), colonne di fiducia e moderazione protette da trigger, `crew_contacts` privata, `find_duplicate_crews`; **area admin `/admin/crew`**: elenco con filtri, **Nuova crew**, **Importa** (CSV o tabella incollata: parser condiviso `src/lib/crews/import.ts`, geocoding a blocchi, controllo doppioni, anteprima, pubblicazione subito o "in attesa", campo link del logo), nascondi/disattiva; API `src/app/api/admin/crew/*`, audit in `admin_actions`; scheda informativa su `/crew/[id]` (`InformativeCrew`)
- [x] **Fase 2a-2** (SQL #51): "Avvisami" (`crew_interests`, `NotifyMeButton`, numero in attesa da 5 persone) e `crews_discover` (ordine §6.1: città, gestite prima delle non gestite, soglia 5 membri, attività, nome)
- [x] **App 1.1.0**: tab Crew con Le mie · Scopri (sezioni "Su Vieni a correre" / "Nella tua zona") · Mappa (`react-native-maps`, pin per stato, raggruppamento), scheda informativa con "Avvisami"
- [ ] ⏸ **SOSPESO (22/11/2026):** rivendicazione (Fase 2b), suggerimenti di modifica (`crew_suggestions`), area gestori (Fase 3), verifica e badge (Fase 4), fascia "Nuove crew", notifica `crew_claimed`, ordine §6.1 nella lista `/crew` del sito. Nel frattempo la scheda informativa rimanda a una mail a `info@vieniacorrere.it`: **non c'è ancora un modo per assegnare una scheda a un proprietario** (né dall'admin né dall'utente)

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

### App mobile (repo separato `vieniacorrere-app`) — pubblicata: 1.0.0 e 1.0.1 online, **1.1.0 inviata ad Apple il 22/11/2026**
> Expo SDK 57 + Expo Router + NativeWind, stesso progetto Supabase (nessun cambio schema salvo SQL #41–#43). Repo privato: https://github.com/Santamicone/vieniacorrere-app · progetto EAS `vieniacorrere` (bundle id `it.vieniacorrere.app`). Build di sviluppo iOS con EAS; push solo su telefono reale; account Apple Developer attivo, Android/Firebase da fare.
- [x] Auth email/password (registrazione con nome e città, recupero password con **codice** via email, eliminazione account), tab Bacheca · Crew · Le mie corse · Notifiche · Profilo
- [x] Bacheca con filtri, dettaglio corsa, partecipa/annulla/"Mi interessa", crea/modifica/annulla corsa (singola), gestione richieste dell'organizzatore
- [x] Chat della corsa (Realtime), ritrovo a schermo colorato + check-in, conferma presenza, notifiche in-app con badge, **push** (permesso dopo la prima richiesta di partecipazione, interruttore nel Profilo)
- [x] Profilo completo (foto: personaggi/colori/galleria su `avatars`), segnala corsa/messaggio, blocca utenti, privacy/termini/supporto, elimina account
- [x] **Crew** (scritta il 21/11/2026, commit app `8049588`, **provata su iPhone il 21/11/2026: funziona**; chat corsa ritestata): tab Le mie / Scopri con ricerca (nome, città, zona), scheda crew (identità, statistiche, prossima uscita con **"Ci sono"** via RPC `crew_confirm_attendance`, bacheca del coach — la scrivono owner/admin —, corse programmate/effettuate, membri), **chat della crew** (`crew_chat`, Realtime, segnala/blocca, admin possono eliminare), **richieste di ingresso** (chiedi/ritira, owner/admin accettano o rifiutano), esci dalla crew. Query verificate in sola lettura sul DB reale. Chat corsa e chat crew condividono `ChatView` (**ritestare la chat corsa**). NON in app: creare/modificare/eliminare crew, link di invito, aggiungere/rimuovere membri (→ sito, link dalla schermata Gestisci), feed Strava, corse solo-crew da creare, push per la chat crew e per le notifiche crew (le notifiche `crew_*` non hanno `crew_id`: non aprono la crew). Le segnalazioni su `crew_chat` arrivano allo staff ma l'admin web non sa nasconderle (`ALLOWED` in `api/admin/content/hide`)
- [x] Dopo la 1.0: serie ricorrenti, corsa spot ("Esci adesso"), profili pubblici, e nella **1.1.0**: accesso con **Apple (nativo, nonce) / Google / Facebook** (docs/login-social.md nel repo app), **mappa delle crew** + "Avvisami" + Scopri a sezioni, due link gare nel profilo. Build di sviluppo iOS provata su iPhone il 22/11/2026: tutto ok
- [ ] Mancano (da verificare): recensioni/momenti; Android/Play Console fermi
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

### Decisioni sulla mappa delle crew (22/11/2026, dettaglio in `docs/MAPPA-CREW.md` §1 e §11)
- Le crew senza proprietario sono schede **informative** (`visibility='directory'`): non si può chiedere di entrare; l'app 1.0.x non le vede mai.
- L'admin pubblica **subito**, con livello base (AAL1); import da CSV o tabella incollata; nessun elenco acquisito da fonti esterne senza averne letto le condizioni.
- Ordine delle liste: prima la geografia, poi le gestite e solo dopo le non gestite; soglia **5 membri**; la verifica non incide sull'ordine.
- Dati personali: solo informazioni pubbliche di organizzazioni, mai telefoni o nomi di persone; email di contatto in tabella privata.
- **Rivendicazione, suggerimenti di modifica, area gestori e verifica sospesi** (decisione del titolare): riprendere da `docs/MAPPA-CREW.md` §5.2 e §10.

**Tempo reale sul sito (26/11/2026):** ogni canale va creato con `subscribeWithAuth` (`src/lib/supabase/realtime.ts`), mai con `.subscribe()` diretto. A pagina appena caricata il token non è ancora pronto: il canale partirebbe senza utente e le policy RLS scarterebbero gli eventi.

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

### App 1.1.0 — stato e passaggi aperti (aggiornato 22/11/2026)
- [x] Codice su `main` (repo app `b306957` + `6a7e5f7`), testi in `docs/store-listing.md`, privacy in `docs/APP-STORE-PRIVACY.md` (Fitness tolto, login social, "Avvisami"), `/privacy` e `/elimina-account` aggiornati, build di produzione 5 (profilo App Store rigenerato con "Sign in with Apple") caricata su App Store Connect e collegata alla versione 1.1.0, **inviata alla revisione**
- [ ] Dopo l'approvazione: rilascio (manuale o automatico), badge ufficiale App Store su `/app`; provare "Avvisami" con un utente reale
- [ ] Entro aprile 2027: aggiornare Expo SDK (Xcode 27 / SDK iOS 27, avviso ITMS-90725) e rifare la build
- [ ] Android: Firebase/FCM, `google-services.json`, chiave Google Maps per la mappa, Play Console
- Nota: i punti 2 e 5 della lista sotto sono superati da questa sezione.

### App mobile — passaggi aperti (aggiornato 21/11/2026, in parte superato)
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
   - [x] (22/11/2026: tolte le righe su Strava da `/privacy` e `/elimina-account`; da far leggere a chi segue la parte legale) Rivedere **a mano** i testi: `/privacy` (riga "Strava (facoltativo)", sub-responsabili), `/elimina-account`, `/termini` se serve. Non modificati dal distacco.
   - [~] **App mobile** (Apple ha approvato la 1.0.0 e l'app è in store, 21/11/2026): codice ripulito e committato nel repo `vieniacorrere-app`, branch `chore/rimuovi-strava` (commit da0e184, **PR #13 mergiata**): tolta la sezione "Corse recenti" da `profilo/[id].tsx`, la query `strava_activities` da `public-profile.ts`, `StravaActivity`/`strava_public_profile` da `types.ts`, la frase su Strava da `elimina-account.tsx`; `app.json` → **versione 1.0.1**; `npx tsc --noEmit` ok. **Build iOS di produzione 1.0.1 (build n. 4) lanciata su EAS con auto-submit** a App Store Connect (build 888b3278, submission b9eee1bb). **1.0.1 (build 4) inviata in revisione ad Apple il 21/11/2026** — in attesa di approvazione; poi eseguire la FASE 2 (#47). `strava_url` (link scritto a mano) resta. Android: non fatto (la build Android non è stata lanciata).
   - [x] Blocco "Strava: revoca" tolto da `supabase/functions/delete-account/index.ts` e funzione **ripubblicata il 21/11/2026** (`supabase functions deploy delete-account --project-ref wshjtgtmxbxhpdqtxpiq --use-api`, da lanciare dalla radice del repo).
   - [x] **APPLICATO il 22/11/2026** — **FASE 2 (SQL #47 `supabase/strava-detach-fase2.sql`):** DROP di `strava_activities`, `strava_connections` e delle colonne `profiles.strava_share_activities/strava_public_profile`. Da eseguire **solo dopo che la 1.0.1 dell'app è approvata e adottata** (le versioni ≤ 1.0.0 interrogano ancora quelle tabelle: dopo il DROP non crashano ma ricevono errore).
   - [x] **Fatto il 22/11/2026 (App Store Connect; Play Data safety non ancora pubblicata)** — Quando i dati sono cancellati: togliere "Fitness" dalla Privacy in App Store Connect (e dal Play Data safety se dichiarato) e aggiornare `docs/APP-STORE-PRIVACY.md`.

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
