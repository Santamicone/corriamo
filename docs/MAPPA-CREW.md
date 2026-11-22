# Mappa delle crew (`/crew/mappa`)

Specifica della funzionalità **Mappa delle crew di corsa in Italia**: ogni crew ha una
scheda, può essere **non reclamata**, **reclamata** o **verificata** (da un umano), e le crew
verificate possono organizzare **corse verificate**. Include il contratto per l'**app mobile**
e l'**area di gestione web** per i gestori delle crew e per gli admin (che **aggiungono e
importano** le crew).

> Stato (22/11/2026): **Fase 1 scritta** nel branch `feat/mappa-crew` (SQL #49 `crew-map.sql` +
> rollback, `/crew/mappa`, `/crew/citta/[city]`, sezione "Sulla mappa" in `/crew/[id]/modifica`,
> sitemap) — **NON applicata** in produzione e non ancora su `main`. Le altre fasi sono solo
> specifica; i loro SQL qui sotto sono bozze.
> **Numeri SQL:** la prima versione riservava #47–#50, ma #47 è `strava-detach-fase2.sql` e
> #48 è `oauth-profile-name.sql`. I numeri previsti ora sono **#49–#53** (§3, §10). Verificare
> comunque l'ultimo numero usato in `PROJECT_STATUS.md` prima di scrivere ogni file.

---

## 1. Decisioni prese

| Tema | Decisione |
|---|---|
| Popolamento | Schede **non reclamate** da **entrambe** le fonti: inserimento/import **dall'area admin** (§9) e segnalazione utenti (moderata, come "Proponi gara") |
| Prova di rivendicazione | **Email** (codice OTP), con due percorsi (§5.2) |
| Verifica | **Sempre umana**, solo dopo la rivendicazione |
| Gruppi informali | Ammessi in mappa, ma: **niente schede non reclamate** di gruppi senza presenza pubblica; entrano **solo per iscrizione propria** (opt-in) e con **precisione del pin scelta dall'owner** |
| Vantaggi della verifica | **Solo badge informativo. Nessun vantaggio di ranking, nessun filtro dedicato in bacheca. DEFINITIVO.** |
| Premium | **Lontano**: non costruire nulla ora (niente `entitlements`); la verifica non si compra mai |
| App mobile | Legge mappa/schede/badge e fa join **solo sulle crew con un gestore**; **rivendicazione, verifica e gestione solo sul web** |
| Area gestori | Web, non app: area strutturata a sezioni (§7) |
| **Schede importate = "directory"** (22/11/2026) | Le schede senza proprietario si salvano con `visibility = 'directory'`, un valore che l'**app già pubblicata (1.0.x) non legge** (§2.4, §8). Passano a `public` solo quando qualcuno le rivendica |
| **Comportamento dipende dal gestore** (22/11/2026) | In app e sito la scheda si comporta in base a *"ha un gestore?"* e al livello di fiducia, **non** a come è nata: crew create sul sito e crew rivendicate sono uguali (§2.4) |
| **"Avvisami"** (22/11/2026) | Sulle schede informative l'utente può chiedere di essere avvisato quando la crew arriva su Vieni a correre (§2.5, tabella `crew_interests`) |
| **Fase 2 divisa** (22/11/2026) | **2a** = directory + import/aggiunta da admin (riempie la mappa), **2b** = segnalazione utenti + rivendicazione (§10) |
| **Suggerimenti di modifica** (22/11/2026) | Gli utenti registrati possono **suggerire modifiche** alla scheda (dati cambiati, link, "non più attiva"). **Nessuna modifica diretta**: decide sempre un umano (gestore della crew, poi admin). "Non più attiva" non nasconde subito: serve una soglia o una conferma (§5.6) |

**Chiusi il 21/11/2026:** ruoli = i **tre attuali** `owner/admin/member` (un ruolo intermedio, es.
"coach", si aggiungerà dopo con migrazione additiva); soglia gruppi informali = **3 uscite**
con conferme di presenza; durata verifica = **12 mesi**; seed editoriale **manuale**, senza
import automatici da fonti esterne (§11).

---

## 2. Concetti

### 2.1 Due assi indipendenti

Una crew ha **due** stati diversi, da non confondere:

- **`moderation_status`** — la scheda può comparire? `published | pending | rejected | hidden`
  (come `races.status`; `hidden` = soft-hide admin).
- **`trust_level`** — quanto è accertata? `unclaimed | claimed | verified`.

`verified` implica `claimed`. Le crew già esistenti diventano `published` + `claimed`
(le ha create un utente reale, ma nessuno le ha verificate).

### 2.2 Cosa significa "verificata"

> *L'identità del gruppo è reale e chi lo gestisce è chi dice di essere.*

**Non** significa "sicura" né "consigliata". Va scritto nel copy del badge e nelle pagine
informative: le corse in luoghi pubblici restano sotto la responsabilità dei partecipanti.

### 2.3 "Corsa verificata" è derivata, non salvata

Una corsa è verificata se:

```
runs.crew_id → crews.trust_level = 'verified'
AND runs.organizer_id è owner/admin attivo di quella crew
```

Niente colonna su `runs`: se la crew perde la verifica, i badge spariscono da soli.
Esporre una vista `v_verified_runs(run_id)` (`security_invoker`) per sito e app.

### 2.4 Quattro situazioni di una scheda (cosa vede l'utente)

Il comportamento di una scheda dipende da due dati: **`has_manager`** (`owner_id IS NOT NULL`)
e **`trust_level`**. Non dipende da `source`.

| Situazione | Dati | Cosa si vede | Azione principale |
|---|---|---|---|
| **Gestita** (creata sul sito o rivendicata) | `has_manager`, `claimed` | Tutto come oggi: membri, bacheca, corse, chat (membri) | **"Chiedi di entrare"** → approva owner/admin |
| **Verificata** | `has_manager`, `verified` | Come la gestita + badge | Identica: il badge non dà vantaggi |
| **Informativa** (importata, senza proprietario) | `NOT has_manager`, `unclaimed`, `visibility='directory'` | Nome, città, ritrovo, link a sito/Instagram, pin grigio. **Niente** membri, chat, richieste. Nota: *"Scheda informativa: la crew non è ancora su Vieni a correre. Dati pubblici non confermati dalla crew"* | Apri sito/Instagram · **"Avvisami quando arriva su Vieni a correre"** · **"È la tua crew? Rivendicala sul sito"** · "Segnala" |
| **In rivendicazione** | come informativa + richiesta aperta | Come informativa, con "proprietà in verifica" | Come informativa, senza il tasto di rivendicazione |

Perché non si usa lo stesso "Chiedi di entrare": una scheda senza proprietario non ha nessuno
che approvi (l'utente aspetterebbe per sempre) e farebbe credere che la crew sia d'accordo.

**Dopo la rivendicazione** (percorso A: subito; percorso B: dopo l'approvazione admin) la
scheda diventa *gestita*: `visibility` → `public`, `trust_level='claimed'`, richieste di
ingresso attive.

### 2.5 "Avvisami quando arriva su Vieni a correre" (`crew_interests`)

Sulle schede informative. L'utente loggato registra il proprio interesse; quando la crew viene
rivendicata, chi aveva chiesto riceve una notifica (e può chiedere di entrare). All'admin
serve da **domanda misurata**: "12 runner aspettano questa crew", utile per contattare il club.

- Tabella privata: una riga per `(crew_id, user_id)`; ognuno vede/crea/toglie solo le proprie.
- Il **conteggio** passa da una RPC `crew_interest_count(crew_id)` (SECURITY DEFINER): mai
  l'elenco degli utenti. In app/sito il numero compare solo **da una soglia** (proposta: ≥ 5);
  l'admin lo vede sempre.
- Nessun dato nuovo oltre a `user_id`: già coperto dall'informativa; ricordare l'eliminazione
  account (cascata su `profiles`).

---

## 3. Modello dati (bozze)

Tabella unica `crews` (come già usata ovunque), con `owner_id` **nullable** per le schede
non reclamate. Prima di rendere `owner_id` nullable va fatto un **audit** di tutti i punti che
lo assumono non nullo: `types.ts`, `crews_insert/update/delete`, `delete-account`,
pagine `src/app/crew/**`, `crew_stats`, `crew_impact_stats`, e il **trigger di creazione**
(`crews.sql` aggiunge `NEW.owner_id` come membro `owner`: con `owner_id` nullo va saltato).
Nell'app il tipo `Crew.owner_id` è `string` ma la scheda già tollera `owner = null`.

### 3.1 SQL #49 — `crew-map.sql` (Fase 1)

```
crews  + lat double precision, lng double precision      -- GIÀ arrotondate (vedi §4.2)
       + pin_precision text  default 'area'  check in ('exact','area','city')
       + show_on_map  boolean default false               -- OPT-IN
       + meeting_point text                               -- descrizione del ritrovo (testo)
       + website_url, instagram_url text                  -- link pubblici di scheda
```

Più: trigger `crews_round_coords` (BEFORE INSERT/UPDATE), RPC `crews_in_bbox(...)`,
indice su `(lat, lng) where show_on_map`.

### 3.2 SQL #50 — `crew-directory.sql` (Fase 2a: schede non reclamate + admin)

> **Stato (22/11/2026):** il file `supabase/crew-directory.sql` realizza **solo il primo pezzo**:
> colonne di fiducia/moderazione, `owner_id` nullable, `visibility='directory'`, `crew_contacts`,
> `find_duplicate_crews`, trigger di protezione e `crews_in_bbox` con le schede informative.
> `crew_interests`, `crew_suggestions` e le RPC `crew_*` qui sotto andranno in **file SQL successivi**
> (numerati quando scritti, spostando in avanti claims/admin/verifica). Valori reali di
> `moderation_status`: `published/pending/rejected/hidden`.

```
crews  + visibility check estesa: ('public','private','directory')   -- 'directory' = scheda informativa
       + moderation_status text default 'published'
       + trust_level text default 'claimed'
       + source text default 'utente'  check in ('editoriale','utente')
       + created_by uuid references profiles       -- chi ha inserito/segnalato
       + schedule_text text                         -- giorni/orari in testo libero (facoltativo)
       + activity_status text default 'active'  check in ('active','inactive')
                                                    -- 'inactive' = non più attiva: fuori da mappa e liste, resta nello storico
       + last_confirmed_at timestamptz              -- "Dati controllati il ..." (gestore o admin)
       + owner_id → NULLABLE
       trigger di creazione: aggiunge l'owner come membro SOLO se owner_id non è nullo
       trigger BEFORE UPDATE: trust_level, moderation_status, source, verified_* e il passaggio
         da/verso visibility='directory' solo per service_role / is_admin_aal2 / RPC di rivendicazione

crew_contacts   crew_id (PK→crews), email, origin ('pubblica'|'dichiarata'), created_at
                -- PRIVATA: nessuna policy per anon/authenticated (solo service-role + admin AAL2)

crew_interests  crew_id, user_id, created_at   PK(crew_id, user_id)
                -- RLS: ognuno vede/inserisce/cancella solo le proprie righe

crew_suggestions id, crew_id, user_id, kind ('field'|'links'|'inactive'|'other'),
                field text, proposed_value text,        -- field: solo campi in whitelist (§5.6)
                note text, evidence_url text,
                status ('pending'|'accepted'|'rejected'|'expired') default 'pending',
                reviewed_by, reviewed_at, review_note, created_at
                -- RLS: l'utente vede/crea solo i propri; i gestori leggono TRAMITE RPC che NON
                --   restituisce user_id (la RLS è per riga: niente accesso diretto alla tabella)
                -- unique parziale: un solo suggerimento aperto per (crew_id, user_id, field)

RPC crew_apply_suggestion(p_id)                -- SECURITY DEFINER: owner/admin della crew o admin AAL2;
                                               --   applica SOLO i campi in whitelist, valida i link http(s)
RPC crew_suggestions_for_manager(p_crew_id)    -- elenco senza l'identità di chi ha suggerito
RPC find_duplicate_crews(p_name, p_city)       -- pg_trgm/ilike, sul modello di find_duplicate_races
RPC crew_interest_count(p_crew_id)             -- SECURITY DEFINER, solo il numero
```

`crews_select` va esteso: oggi mostra le crew `public`; le schede `directory` si leggono **solo**
tramite RPC/policy dedicate (sito, nuova app, admin). L'app 1.0.x non le vede mai (§8).

### 3.3 SQL #51 — `crew-claims.sql` (Fase 2b)

```
crew_claims     id, crew_id, user_id, path ('A'|'B'),
                claimant_email, evidence_url, evidence_note,
                code_hash, code_expires_at, attempts int default 0, email_verified_at,
                status ('email_pending'|'pending_review'|'approved'|'rejected'|'cancelled'|'expired'),
                reviewed_by, reviewed_at, review_note, created_at
                -- unique parziale: una sola richiesta aperta per (crew_id, user_id)
```

Alla conferma: `owner_id`, `crew_members(owner)`, `visibility='public'`, `trust_level='claimed'`,
notifica agli utenti di `crew_interests` (nuovo tipo `crew_claimed`, §8.5).

### 3.4 SQL #52 — `crew-admin.sql` (Fase 3, area gestori)

```
crew_audit      id, crew_id, actor_id, action, metadata jsonb, created_at
                -- scritta da RPC/trigger, leggibile da owner/admin della crew
RPC crew_transfer_ownership(p_crew_id, p_new_owner)   -- SECURITY DEFINER, §7.4
```

### 3.5 SQL #53 — `crew-verification.sql` (Fase 4)

```
crews  + verified_at timestamptz, verified_by uuid, verified_until date
crew_verification_events  id, crew_id, kind ('requested'|'approved'|'rejected'|'revoked'|'renewed'),
                          by_user, checklist jsonb, note, created_at
view v_verified_runs
job pg_cron mensile: segnala le verifiche in scadenza (+ promemoria al gestore)
```

Ogni azione admin scrive anche in **`admin_actions`** (`action_type` tipo
`crew.create`, `crew.import`, `crew.claim.approve`, `crew.verify`, `crew.revoke`, `crew.merge`).

Se una tabella usa Realtime ricordare `ALTER PUBLICATION supabase_realtime ADD TABLE ...`
(non previsto per queste).

---

## 4. Sicurezza e privacy (punti critici emersi dalla lettura del codice)

### 4.1 L'owner non deve potersi auto-verificare
`crews_update` (`crews.sql`) consente `UPDATE` all'**owner su tutta la riga**. Quindi
`trust_level`, `moderation_status`, `source`, `verified_*` **non possono** essere semplici
colonne scrivibili dal client. Soluzione: trigger `BEFORE UPDATE` che rifiuta la modifica di
queste colonne a meno che il chiamante sia `service_role` o `is_admin_aal2()`.

### 4.2 Coordinate: arrotondate alla scrittura
La RLS è per riga: chi legge una crew pubblica legge tutte le sue colonne, **app mobile
compresa** (legge Supabase direttamente). Quindi **non si salva mai la coordinata esatta**
in `crews`:

| `pin_precision` | Coordinate salvate |
|---|---|
| `exact` | ritrovo (arrotondato a ~5 decimali) |
| `area` (**default**) | arrotondate a 2 decimali (~1 km) |
| `city` | centroide della città |

Il trigger arrotonda in base a `pin_precision`: il valore esatto non viene mai persistito.
Se in futuro serve il punto esatto solo ai membri → tabella separata con RLS membri.
Per le schede importate il default è `city` (o `area` se il ritrovo è un luogo pubblico noto).

### 4.3 Email di contatto mai in `crews`
`crews` è leggibile da tutti. Le email stanno in `crew_contacts` (nessuna policy pubblica).
La UI mostra l'indirizzo **mascherato** (`m***@club.it`).

### 4.4 RLS di lettura da estendere
`crews_select` oggi mostra tutte le crew `public`. Va aggiunto: per i non-owner/non-membri
solo `moderation_status = 'published'` (altrimenti le schede `pending` sarebbero leggibili).
Le schede **`directory`** non sono mai `public`: si leggono con RPC/policy dedicate, così
l'app 1.0.x (che filtra `visibility = 'public'`) non le mostra (§8).

### 4.5 Hardening ruoli (verificare prima di scrivere)
La policy `crew_members_update` in `crews.sql` permette a owner **e admin** di aggiornare
`role` dei membri: un admin potrebbe forse assegnarsi `role='owner'`. Controllare lo stato
reale dopo `crews-fix-rls.sql` e, se confermato, vietare la modifica a `owner` fuori dalla RPC
`crew_transfer_ownership`.

### 4.6 Dati di terzi nelle schede non reclamate
Pubblicare solo dati già pubblici e relativi a **organizzazioni**: nome, città, ritrovo,
link a sito/Instagram. **Mai** telefoni o nominativi di persone. Ogni scheda richiede **almeno
un link pubblico** (anche negli import: le righe senza link vengono segnalate in anteprima). Serve
una **procedura di rimozione** chiara (pulsante "Segnala/Rimuovi" + indirizzo
`info@vieniacorrere.it`), con evasione rapida; la rimozione imposta
`moderation_status='hidden'` e non cancella nulla per anti-riapparizione.
Aggiornare `privacy` e `docs/APP-STORE-PRIVACY.md`.

### 4.7 Gruppi informali
Ammessi in mappa **solo** per iscrizione propria con `show_on_map=true` e precisione scelta.
Default `area`. Nessuna scheda non reclamata per gruppi senza presenza pubblica.

---

## 5. Flussi

### 5.1 Inserimento di una scheda
Due fonti, stesso risultato (scheda non reclamata, `owner_id=NULL`, `visibility='directory'`):

- **Admin** (§9): "Nuova crew" a mano o "Importa" da file. `source='editoriale'`, `created_by`=admin.
- **Utente:** `/crew/segnala` (come `/calendario-gare/proponi`, **Fase 2b**): nome, città, ritrovo,
  **almeno un link pubblico**, eventuale email pubblica di contatto. `source='utente'`,
  `moderation_status='pending'`. Approvazione in `/admin/crew`. Anti-spam: limite per utente al giorno.

### 5.2 Rivendicazione ("Questa è la mia crew")

| | Percorso A (forte) | Percorso B |
|---|---|---|
| Quando | La scheda ha un'email di contatto **pubblica** (`crew_contacts.origin='pubblica'`) | Nessuna email pubblica |
| Cosa succede | Codice a 6 cifre inviato **a quell'indirizzo** (mascherato in UI) | L'utente indica la sua email + **link pubblico** dove compare (IG/sito) + nota |
| Esito | Codice corretto → `claimed` **subito**, utente diventa owner | Richiesta in `pending_review` → `claimed` **solo** dopo approvazione admin |

Dettagli OTP: salvato **hash**, scadenza breve (es. 30 min), **max 5 tentativi**, rate-limit per
utente e per crew, invio da **API route Next** con Resend (`RESEND_API_KEY` già su Vercel) e
scritture con service-role. Una mail dimostra il controllo della casella, non l'identità:
per questo la **verifica resta un passo separato e umano**.

Alla conferma: `crews.owner_id = user`, riga `crew_members` con `role='owner', status='active'`,
`trust_level='claimed'`, `visibility='public'`, `crew_audit` + notifica al nuovo owner e agli
utenti in `crew_interests`.

### 5.3 Duplicati (punto fragile)
In `/crew/nuova` aggiungere il passo **"Esiste già una scheda simile: è la tua?"** con match su
nome + città (`find_duplicate_crews`). Se sì → flusso §5.2 invece di creare. In admin: azione
**"Unisci"** (sposta membri, corse, post, interessi sulla scheda principale; la secondaria diventa
`hidden` con redirect dello slug).

### 5.4 Verifica
1. Il gestore (owner) completa la checklist della scheda e preme **"Richiedi la verifica"**.
2. Admin valuta in `/admin/crew` con la **checklist**:
   - email confermata (A) o contatto coerente con i canali pubblici (B);
   - presenza pubblica verificabile e coerente (sito/IG attivo, nome uguale);
   - attività recente (corse pubblicate o ritrovo documentato);
   - scheda completa (descrizione, ritrovo, giorni);
   - nessuna segnalazione aperta, nessun dubbio di identità o conflitto di proprietà.
3. Esito: `verified` (con `verified_until` = +12 mesi) oppure rifiuto motivato.

**Gruppi informali (deciso):** non avendo presenza pubblica, il criterio 2 è sostituito da:
contatto email confermato + almeno **3 uscite** organizzate in piattaforma con conferme di
presenza (`run_confirmations`). La soglia si rivede dopo i primi casi reali.

### 5.5 Revoca, contestazione, rinnovo
- **Revoca** (admin): riporta a `claimed`, motivo obbligatorio, evento + `admin_actions`.
- **Contestazione proprietà** (qualcuno dice "la crew è mia"): pulsante dedicato → crea una
  `reports` e blocca eventuali trasferimenti finché non risolta.
- **Rinnovo**: il job mensile segnala le verifiche in scadenza; il gestore riceve il
  promemoria e conferma i dati; un admin rinnova con un click.

### 5.6 Suggerimenti di modifica degli utenti (22/11/2026)

Pulsante **"Suggerisci una modifica"** nella scheda (sito; app dalla nuova versione). Solo
**utenti registrati**.

**Cosa si può suggerire**

| Tipo | Contenuto |
|---|---|
| **Dati cambiati** (`field`) | un campo della whitelist + il nuovo valore: nome, descrizione, città, zona, ritrovo, giorni/orari (`schedule_text`), sito, Instagram. **Mai** il link WhatsApp (privato) |
| **Link** (`links`) | sito/Instagram cambiato o non più valido (solo `http(s)`) |
| **Non più attiva** (`inactive`) | nota facoltativa + link che lo dimostri |
| **Altro** | testo libero; per abusi e contenuti scorretti resta la **segnalazione** (`reports`) |

Telefoni e dati di persone **non si accettano** né nei campi né nelle note (§4.6).

**Chi decide**
- **Crew con un gestore:** owner/admin della crew ricevono la notifica e **accettano** (la modifica si
  applica) o **rifiutano**. Dopo **14 giorni** senza risposta passa all'admin della piattaforma.
- **Scheda informativa (senza gestore):** decide l'admin della piattaforma (`/admin/crew` → Suggerimenti).
- L'admin della piattaforma può sempre intervenire. **Applicare è sempre un passo umano.**
- Prima della Fase 3 (area gestione): il gestore riceve la notifica, ma a decidere è l'admin.

**"Non più attiva"** non nasconde la scheda subito (una crew può essere in pausa o aggiornare poco i social):
- le segnalazioni di **utenti diversi** si sommano; con **3** la scheda mostra *"Potrebbe non essere più
  attiva"* e sale in cima alla coda dell'admin;
- gestore o admin **conferma** → `activity_status='inactive'` (fuori da mappa e liste, resta nello storico);
- il gestore **smentisce** → `last_confirmed_at = now()` ("Dati controllati il …") e le segnalazioni si chiudono.

`last_confirmed_at` serve anche al **promemoria annuale** ai gestori e si lega al rinnovo della verifica (§5.5).

**Protezioni:** solo registrati; limite giornaliero per utente; un solo suggerimento aperto per
(crew, utente, campo); link solo `http(s)`; testi con lunghezza massima; i suggerimenti ignorati
**scadono**; **l'identità di chi suggerisce la vede solo chi revisiona**, non la crew (evita ritorsioni);
l'abuso del modulo si gestisce con la moderazione utenti esistente.

**Notifiche:** nuovo tipo `crew_suggestion` per i gestori (va aggiunto a `send-push` solo se si vuole la
push) e **email allo staff** per le schede senza gestore, sul modello di `notify-report`.
**Compatibilità:** l'app 1.0.x deve tollerare un tipo di notifica sconosciuto (§8, punto 6).

---

## 6. Mappa, SEO e RPC

- **Route:** `/crew/mappa` (toggle lista/mappa anche in `/crew`). Leaflet è già nello stack:
  aggiungere **clustering** (es. `leaflet.markercluster`). Pin distinti per `verified`, gestita e
  **informativa** (grigio neutro).
- **RPC `crews_in_bbox(min_lat, min_lng, max_lat, max_lng, ...)`**: restituisce solo campi
  pubblici (id, slug, nome, `trust_level`, **`has_manager`**, lat/lng arrotondati, city,
  `crew_type`, avatar). È **lo stesso contratto** per sito e app. Filtri su `show_on_map`,
  `published`, `public` **o** `directory`, e (dalla Fase 2a) `activity_status = 'active'`: le crew
  segnate "non più attive" escono da mappa e liste. È una modifica al **corpo** della funzione, la
  firma e le colonne restituite non cambiano.
- **Lista (sito e app):** ordinata per distanza/pertinenza, **mai per verifica**. Una sezione
  "Su Vieni a correre" (gestite: si può chiedere di entrare) e una "Nella tua zona" (informative),
  oppure un filtro: la separazione è funzionale, non un ranking. *(Proposta, da confermare: §11.)*
- **Pagine per città** `/crew/citta/[city]` (SSR, indicizzabili) + voci in `sitemap.ts`;
  JSON-LD sulla scheda (`SportsOrganization`/`SportsClub`, da valutare). Le schede informative
  hanno `noindex`? *(da decidere: §11)*.
- **Geocoding:** riusare `src/lib/geocoding.ts` (verificare provider e limiti per i batch di
  import: Nominatim ~1 richiesta/secondo).
- Le crew **esistenti** non compaiono finché l'owner non attiva `show_on_map` (opt-in):
  prevedere una **notifica/email agli owner** per invitarli ad attivarlo.

### 6.1 Ordine di visualizzazione delle liste — **deciso nelle linee generali il 22/11/2026**; i dettagli (r, s, t) si rivedono con dati reali

Vale per Scopri (`/crew`), le pagine città e la lista in app. Oggi `/crew` ordina per data di creazione
(più recenti prima). Direzione indicata dal titolare: dare più visibilità alle **crew create dagli
utenti con almeno 5 membri** (indicato prima 10, abbassato a 5 il 22/11/2026 perché 10 era troppo alto) e alle **crew create dall'admin**.

**Principi (non cambiano):** la verifica **non** incide sull'ordine; niente ordine acquistabile (premium
incluso); la regola è **deterministica e documentata**, non una scelta caso per caso.

**Ordine, in questa sequenza**
1. **Geografia prima di tutto:** se l'utente cerca una città/zona (o ha una città nel profilo), contano prima
   le crew di quella città, poi le vicine. Una crew di 40 persone a 300 km serve meno di una di 6 sotto casa.
2. **Poi, dentro lo stesso livello geografico: prima le gestite, poi le non gestite** (deciso il 22/11/2026):
   - **Crew gestite** (hanno un proprietario: ci si può iscrivere):
     - **A. In evidenza:** con **≥ 5 membri attivi**; vi rientrano anche le crew **gestite create dall'admin**.
     - **B. Le altre crew gestite**, per attività (prossima uscita più vicina, poi le più recenti).
   - **Crew non gestite** (schede informative, nessuno approva richieste):
     - **C. Quelle create/importate dall'admin** (editoriali), prima;
     - **D. Quelle segnalate dagli utenti**, dopo.
   Le non gestite compaiono **sempre dopo** le gestite, in una sezione a parte ("Nella tua zona"), così chi cerca
   un gruppo vede prima quelli a cui può unirsi.
3. **Dentro ogni gruppo:** attività recente (uscite in programma o svolte negli ultimi 30 giorni), poi numero
   di membri, poi nome. Nessun elemento casuale.

**Come si conta "5 membri":** membri **attivi** (`crew_members.status='active'`), **proprietario compreso**
(è il numero che si vede nella scheda: oggi "Atleti"),
con profilo non sospeso o bannato. Serve una funzione di lettura (`crews_discover`, additiva) che restituisce
la lista già ordinata con `member_count`, stesso contratto per sito e app.

**Punti da decidere**
| # | Punto | Proposta |
|---|---|---|
| p | "Create dall'admin": schede importate o crew gestite? | **Deciso il 22/11/2026: prima le gestite, poi le non gestite.** Le importate senza gestore stanno sempre dopo le gestite (gruppo C, in cima alle non gestite); le crew gestite create dall'admin entrano nel gruppo A |
| q | Soglia di membri | **5** (deciso il 22/11/2026, abbassata da 10 perché troppo alta). Da rivedere con dati reali: più è bassa, più è facile salire con membri fittizi, quindi conta l'anti-abuso (r) |
| r | Anti-abuso | Conteggio solo di membri attivi con profilo valido; l'admin vede in lista i salti anomali di membri in pochi giorni |
| s | Etichetta "In evidenza" visibile? | No: l'ordine si spiega in una pagina informativa, senza badge |
| t | Crew nuove | Una fascia "Nuove crew" (ultime 4 settimane) per non seppellirle, anche sotto soglia |

*Nota:* "più membri" e "admin" sono un vantaggio di posizione diverso dalla verifica (§1: nessun vantaggio di
ranking alla verifica). Se si volesse un giorno premiare anche altro, va scritto qui, non nel codice.

---

## 7. Area di gestione crew (web)

### 7.1 Struttura

Oggi: `/crew/[id]/gestisci` (membri, invito, elimina) e `/crew/[id]/modifica`. Si passa a un
**layout unico** `/crew/[id]/gestione` con navigazione laterale (desktop) / tab (mobile web),
con il ruolo verificato **una volta** nel layout. Le vecchie route fanno redirect.

| Sezione | Contenuto |
|---|---|
| **Panoramica** | Stato di verifica, checklist "completa la scheda" (onboarding post-rivendicazione), indicatori (riusa `crew_impact_stats` / `crew_stats`), prossime uscite |
| **Scheda e mappa** | Profilo, link social, ritrovo, `show_on_map`, **precisione pin** con anteprima, geocoding |
| **Membri e inviti** | Contenuto attuale di `gestisci` + richieste in sospeso |
| **Corse** | Corse e serie della crew, presenze, creazione con `crew_id` |
| **Comunicazione** | Bacheca (`crew_posts`), moderazione di `crew_chat` |
| **Verifica** | Stato, richiesta, rinnovo, storico eventi |
| **Impostazioni** | Visibilità, **trasferimento proprietà**, chiusura crew, registro attività (`crew_audit`) |

### 7.2 Distinzione dai pannelli admin
Due livelli ben separati nel naming e nelle route:
**gestori crew** → `/crew/[id]/gestione` (RLS per ruolo di crew);
**admin piattaforma** → `/admin/...` (gate AAL2/MFA già esistente).

### 7.3 Permessi (default: tre ruoli attuali)

| Azione | owner | admin | member |
|---|:-:|:-:|:-:|
| Modificare scheda e mappa | ✅ | ✅ | — |
| Gestire membri e inviti | ✅ | ✅ | — |
| Creare/gestire corse della crew | ✅ | ✅ | — |
| Bacheca e moderazione chat | ✅ | ✅ | — |
| Richiedere verifica / rinnovo | ✅ | — | — |
| Trasferire proprietà, chiudere crew | ✅ | — | — |

*Se servisse un ruolo intermedio (es. "coach": solo corse e bacheca) va aggiunto a
`crew_members.role` con migrazione additiva — decisione rimandata.*

### 7.4 Trasferimento di proprietà
Necessario subito, perché `delete-account` rifiuta chi possiede crew con altri membri attivi.
RPC `crew_transfer_ownership(p_crew_id, p_new_owner)`, `SECURITY DEFINER`: il chiamante deve
essere owner, il destinatario **membro attivo**; aggiorna `crews.owner_id` e i due `role`,
scrive `crew_audit`, notifica entrambi. Bloccata se c'è una contestazione aperta.

### 7.5 Predisposizione premium
Le sezioni restano separate (es. statistiche) così potranno essere vincolate in futuro,
senza costruire ora alcun meccanismo di piano.

---

## 8. Contratto per l'app mobile (`vieniacorrere-app`)

Stesso Supabase; l'app **non si aggiorna in tempo reale** (review store) → regole:

1. **Modifiche solo additive.** Mai rinominare/rimuovere colonne o RPC già usate dall'app.
2. **Valori sconosciuti tolleranti:** un `trust_level` o `moderation_status` non riconosciuto
   si tratta come "non verificata"/non mostrata. Avvisare quando si aggiungono valori.
3. L'app usa `crews_in_bbox`, la scheda crew, `v_verified_runs` e il join già esistente.
   Mappa nativa (libreria RN), non Leaflet (**nuova dipendenza nativa → nuova build**: chiedere
   prima, es. `react-native-maps`).
4. **Niente rivendicazione/verifica/gestione in app**: al massimo link "Gestisci la crew sul
   sito" / "Rivendica sul sito".
5. **Segnalazioni:** estendere il meccanismo `reports` a schede e crew (requisito Apple per
   i contenuti generati dagli utenti); riusare `user_blocks` ove sensato.
6. **Push e notifiche:** `crew_new_run` esiste già; il nuovo tipo `crew_claimed` (per chi ha
   usato "Avvisami") va aggiunto a `send-push` e ripubblicato; **verificare che l'app 1.0.x
   tolleri un tipo di notifica sconosciuto** prima di inviarlo.
7. **Premium (futuro):** acquisti **solo sul web**, l'app non li promuove — vendere abbonamenti
   dentro l'app attiverebbe le regole di in-app purchase di Apple/Google.
8. **Suggerimenti di modifica (§5.6):** nell'app solo il **modulo** "Suggerisci una modifica" (tipo,
   campo, nuovo valore, nota), che scrive in `crew_suggestions`; la revisione resta sul sito. Le crew
   con `activity_status='inactive'` non arrivano all'app (la RPC le esclude). Se la scheda mostra
   "Potrebbe non essere più attiva", l'app mostra la stessa nota.

### 8.1 Compatibilità con l'app già pubblicata (1.0.x) — verificata sul codice (22/11/2026)

Lo Scopri dell'app 1.0.x legge **tutte** le crew con `visibility = 'public'`
(`src/lib/crews.ts`) e il pulsante **"Chiedi di entrare"** non controlla se esiste un
proprietario: inserisce `crew_members(status='pending')`. Se le schede importate fossero
`public`, chi ha l'app attuale le vedrebbe e invierebbe richieste che nessuno approva.
La scheda dettaglio tollera già `owner = null`, ma il pulsante no.

Per questo le schede senza proprietario sono **`visibility='directory'`** (§3.2): l'app 1.0.x
non le legge e il problema non esiste. Diventano `public` **solo** a rivendicazione avvenuta,
quando c'è un owner e "Chiedi di entrare" funziona. Nell'app nuova (versione con la mappa)
Scopri le mostra tramite la RPC, con le quattro situazioni di §2.4.

### 8.2 Lavoro nell'app (nuova versione)
- Scopri: lista + mappa, sezioni "Su Vieni a correre" / "Nella tua zona", card per le 4 situazioni.
- Scheda informativa: link esterni, "Avvisami", "Rivendica sul sito", "Segnala"; **nascondere**
  "Chiedi di entrare" quando `has_manager` è falso.
- Badge "verificata" e "corsa verificata".
- Modulo "Suggerisci una modifica" (§5.6, §8 punto 8).

---

## 9. Pannello admin piattaforma (`/admin/crew`)

Nel gruppo `src/app/(admin)/admin/` esistente (MFA AAL2), accanto a `gare`/`segnalazioni`
(aggiungere la voce `Crew` a `NAV` in `layout.tsx`).

### 9.1 Aggiungere e importare (richiesto il 22/11/2026)
Segue il flusso già usato per il calendario gare (`/api/calendario/importa/analizza` →
revisione → `/salva`; `find_duplicate_races`; `guardAdminApi`):

1. **Nuova crew** (singola): nome, città, tipo, ritrovo, `schedule_text`, sito, Instagram,
   descrizione breve, precisione pin, eventuale email pubblica (→ `crew_contacts`) e **link del
   logo** facoltativo (→ `avatar_url`, solo http/https, mostrato senza referrer).
   Colonne del CSV (alias accettati): `name, city, zone, crew_type, meeting_point, schedule_text,
   website_url, instagram_url, description, contact_email, avatar_url` (`logo`, `link_logo`,
   `link_del_logo`…). Obbligatori: nome, città e almeno un link pubblico; numeri di telefono rifiutati.
2. **Importa** (batch): CSV o tabella incollata → **analisi senza scrivere** (valida i campi,
   **geocoding** in blocco, controllo doppioni con `find_duplicate_crews`, segnala righe senza
   link pubblico) → anteprima modificabile → **salvataggio** come scheda non reclamata
   (`source='editoriale'`, `visibility='directory'`, `trust_level='unclaimed'`).
3. **Pubblicazione (deciso il 22/11/2026):** le schede create o importate dall'admin vanno online
   **subito**; resta l'opzione "salva in attesa" (`moderation_status`) per le revisioni. Import e
   pubblicazione richiedono il **livello base** (`guardAdminApi(false)`, AAL1), come l'import del
   calendario gare.
4. **Modifica / nascondi / unisci / elimina** una scheda (l'eliminazione è un `hidden`, mai
   una cancellazione, per l'anti-riapparizione).
5. Il parser è condiviso (`src/lib/crews/import.ts`) tra la pagina admin e lo script
   `npm run seed:crews` (utile in CI o per caricare un file curato a mano).

Regole degli import: solo dati pubblici di **organizzazioni** (§4.6); nessun elenco acquisito da
fonti esterne senza aver letto le loro condizioni d'uso, valutato **caso per caso**.

### 9.2 Altre sezioni
- **Nuove schede** (`pending`): approva/rifiuta/modifica.
- **Rivendicazioni** (`pending_review`): vedi evidenze, approva/rifiuta con nota.
- **Richieste di verifica**: checklist §5.4, esito.
- **Duplicati**: ricerca e "Unisci".
- **Interessi**: per ogni scheda informativa il numero di "Avvisami" (anche sotto soglia), utile
  per contattare il club.
- **Suggerimenti** (§5.6): coda dei suggerimenti di modifica (accetta/rifiuta con nota, applicazione
  con `crew_apply_suggestion`), le crew con segnalazioni di "non più attiva" in evidenza e le schede
  informative senza gestore (decide l'admin). Email allo staff per i nuovi suggerimenti su schede senza
  gestore. Ogni azione in `admin_actions` (`crew.suggestion.accept`, `crew.suggestion.reject`,
  `crew.deactivate`).
- **Scadenze**: verifiche in scadenza, revoche.

Ogni azione → `admin_actions`. Lo staff riceve già un'email per le segnalazioni
(`notify-report`): valutare lo stesso avviso per nuove richieste di rivendicazione.

---

## 10. Fasi

| # | Fase | Deliverable | SQL |
|---|---|---|---|
| 1 | **Mappa delle crew esistenti** | Colonne mappa + trigger arrotondamento + RPC `crews_in_bbox`; `/crew/mappa` con clustering; impostazioni "Mostra sulla mappa" e precisione pin; pagine città; invito agli owner | #49 |
| 2a | **Directory e import admin** | `visibility='directory'`, `trust_level`/`moderation_status`/`source`, `owner_id` nullable (dopo audit), `crew_contacts`, `crew_interests` ("Avvisami"), `find_duplicate_crews`; **`/admin/crew` con Nuova crew e Importa**; schede informative sul sito; **suggerimenti di modifica** (`crew_suggestions`, modulo per gli utenti, revisione dell'admin, "non più attiva", §5.6). **Riempie la mappa** | #50 |
| 2b | **Segnalazione e rivendicazione** | `crew_claims`, OTP via email, `/crew/segnala`, "Questa è la mia crew", match duplicati in `/crew/nuova`, notifica a chi ha usato "Avvisami" | #51 |
| 3 | **Area di gestione crew** | Layout `/crew/[id]/gestione`, sezioni §7, `crew_audit`, trasferimento proprietà, hardening ruoli, **revisione dei suggerimenti da parte del gestore** (sezione "Comunicazione" o dedicata) | #52 |
| 4 | **Verifica e badge** | Richiesta, checklist admin, badge su scheda/pin/corse, `v_verified_runs`, rinnovo annuale, revoca | #53 |
| 5 | **Premium** | *Lontano — non pianificato* | — |
| App | **Nuova versione dell'app** | Mappa nativa, Scopri con le 4 situazioni, "Avvisami", badge, modulo "Suggerisci una modifica" (§8.2) | — |

Ordine consigliato: 1 → 2a → 2b → 3 → 4. La **2a prima della 2b** perché senza schede la mappa
è quasi vuota (oggi le crew esistenti sono poche e si attivano per opt-in) e così si può
popolare a mano mentre si costruisce la rivendicazione. La Fase 3 viene **prima** della verifica
perché il primo passaggio di un nuovo owner è la Panoramica con checklist, da cui parte la
richiesta. L'app segue il sito: finché non esce la nuova versione, le schede `directory` restano
invisibili in app (voluto, §8.1).

**Prima di ogni push:** `npm run build` pulito, test mobile (Chrome + Safari), documentare
l'SQL e aggiornare `PROJECT_STATUS.md` (convenzioni di `CLAUDE.md`).

---

## 11. Decisioni e domande aperte

### Decisioni (21/11/2026)
1. **Ruoli:** restano `owner/admin/member`. Un ruolo intermedio si aggiunge in futuro con
   migrazione additiva (§7.3).
2. **Gruppi informali:** verifica con email confermata + almeno **3 uscite** in piattaforma
   con conferme di presenza; soglia da rivedere dopo i primi casi (§5.4).
3. **Durata verifica:** **12 mesi**, promemoria al gestore e rinnovo da un admin (§5.5).
4. **Seed editoriale:** **solo manuale** (schede inserite da un admin e segnalazioni utenti),
   nessun import automatico da fonti esterne. Eventuali elenchi pubblici di società/ASD si
   valutano uno alla volta, controllando prima le condizioni d'uso.
5. **Incentivo a farsi verificare:** badge su scheda, pin e corse, senza vantaggi di ranking.
   Dopo qualche mese si controlla solo se le crew si fanno verificare; la regola sul ranking
   non cambia.

### Decisioni (22/11/2026)
6. **Admin aggiunge e importa** le crew dalla propria area (§9.1).
7. **Schede importate = `directory`**, comportamento in base a "ha un gestore" (§2.4, §8.1).
8. **"Avvisami"** sulle schede informative (§2.5).
9. **Fase 2 divisa** in 2a (directory + admin) e 2b (rivendicazione) (§10).
10. **Suggerimenti di modifica** degli utenti alle schede, con revisione umana e percorso dedicato per
    "non più attiva" (§5.6). Le proposte di §5.6 sono **adottate** e da rivedere dopo i primi casi reali.
11. **Admin: aggiunta e import delle crew** (domande a–d, deciso il 22/11/2026): **(a)** le schede
    dell'admin vanno online **subito**, con opzione "in attesa"; **(b)** import e pubblicazione col
    **livello base** (AAL1), non AAL2; **(c)** formato: **CSV e tabella incollata** (da Excel si esporta in
    CSV); l'import da URL non è previsto, eventuali fonti web si valutano caso per caso; **(d)** giorni e
    orari delle uscite: sì, come testo libero facoltativo (`schedule_text`).
12. **Ordine delle liste** (§6.1, 22/11/2026): geografia prima; poi **prima le crew gestite, poi le non
    gestite**. Tra le gestite vengono prima quelle con **≥ 5 membri attivi** (anche se create dall'admin);
    tra le non gestite prima le schede dell'admin, poi quelle segnalate dagli utenti. La verifica non incide.

### Domande aperte (con la proposta) — **a–d decise il 22/11/2026** (decisione 11); **f** e l'ordine delle liste: §6.1
| # | Domanda | Proposta |
|---|---|---|
| a | Le schede dell'admin vanno online **subito** o in attesa? | L'admin con MFA può pubblicare subito, con opzione "salva in attesa" |
| b | Livello di sicurezza per import e pubblicazione | **AAL2** per pubblicare, AAL1 per salvare in attesa (il calendario usa AAL1) |
| c | Formato dell'import | CSV e tabella incollata; **import da URL solo caso per caso** |
| d | Giorni/orari delle uscite | Campo testo libero `schedule_text`, facoltativo |
| e | Contatore "Avvisami" visibile agli utenti? | Visibile da **5** interessati; l'admin lo vede sempre |
| f | Lista unica con sezioni o filtro? | Sezioni "Su Vieni a correre" / "Nella tua zona" |
| g | Le schede informative sono indicizzabili (SEO)? | Sì le pagine città; la singola scheda informativa **noindex** finché non è rivendicata |
| h | Dopo la rivendicazione la crew è subito "gestita" o serve un controllo? | Percorso A subito, percorso B dopo approvazione (come in §5.2) |

**Suggerimenti di modifica (§5.6) — proposte adottate il 22/11/2026, da rivedere dopo i primi casi:**

| # | Domanda | Scelta adottata |
|---|---|---|
| i | Per le crew con gestore decide prima il gestore o sempre l'admin? | **Prima il gestore**; dopo **14 giorni** senza risposta passa all'admin. Fino alla Fase 3 decide l'admin e il gestore è solo avvisato |
| l | Soglia per "non più attiva" | **3 utenti diversi** per l'avviso pubblico; la conferma resta di gestore o admin |
| m | L'identità di chi suggerisce è visibile al gestore? | **No**: la vede solo chi revisiona (admin) |
| n | Chi può suggerire? | **Solo utenti registrati**, con limite giornaliero |
| o | Campi suggeribili | Nome, descrizione, città, zona, ritrovo, giorni/orari, sito, Instagram. **Non** il link WhatsApp (privato) |
