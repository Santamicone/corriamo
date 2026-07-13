# Calendario gare (`/calendario-gare`)

Documentazione completa della funzionalità **Calendario gare** — sezione Extra che
offre un catalogo di **eventi reali** (maratone e mezze in Italia e in Europa,
World Marathon Majors e SuperHalfs), un tool "Trova la tua gara ideale" e un ponte
con la community "Cerca compagni".

> Stato: **completata e in produzione** (PR #106–#109). Unico passo manuale residuo:
> applicare `supabase/races-moderation.sql` in Supabase (vedi §7).

---

## 1. Concetto chiave — `races` ≠ post `type='gara'`

Nell'app esistono **due cose diverse** che non vanno confuse:

| Cosa | Tabella | Significato |
|---|---|---|
| **Evento reale** (es. Maratona di Roma 2027) | **`races`** | Scheda anagrafica dell'evento (il catalogo) |
| **Post community** ("cerco pacer per Roma") | `runs` (`type='gara'`) | Annuncio di un utente |

Il ponte tra i due è la colonna **`runs.race_id`** (nullable): un post community può
essere collegato a una scheda del catalogo, così la scheda mostra "Chi ci va?".

---

## 2. Schema DB

### `races` — `supabase/races.sql` (SQL #25)

```
id, slug (unique), name, city, region, country (ISO-2, default 'IT'),
event_date, end_date,
distances text[]        -- 5k|10k|21k|42k|trail|ultra|other
race_type               -- competitiva|non_competitiva|federale|internazionale|charity
level_hint, elevation_m, course_profile text[], participants_est,
official_url,
registration_status     -- aperte|chiuse|da_verificare
circuit                 -- major|superhalfs|wa_label|aims
tags text[], gpx_path, featured bool,
source                  -- editoriale|utente|aims|fidal
external_ref            -- UID AIMS / id costante (dedup import)
status                  -- published|pending|rejected
created_by, created_at, updated_at
```

- **RLS**: lettura pubblica solo `status='published'`; utenti loggati possono
  inserire solo `status='pending'` + `source='utente'` + `created_by=auth.uid()`.
- **Unique** `(source, external_ref) where external_ref is not null` → idempotenza import.
- Trigger `set_updated_at` (riuso da `reviews.sql`).

### `runs.race_id` — `supabase/add-race-id.sql` (SQL #26)

```sql
alter table public.runs add column race_id uuid references public.races(id) on delete set null;
```

### Moderazione — `supabase/races-moderation.sql` (SQL #27) ⚠️ **da applicare**

- `profiles.is_admin boolean not null default false`
- policy `"Admins can manage races"` (for all): gli admin vedono/gestiscono anche le `pending`
- nomina admin l'owner (`m.santamicone@gmail.com`)

### Dedup potenziato — `supabase/races-dedup.sql` (SQL #28) ⚠️ **da applicare**

Affianca al match `country + data + distanza` una **similarità sul nome** (`pg_trgm`)
per segnalare i doppioni cross-fonte (mai fusi/eliminati in automatico).

- `create extension pg_trgm` + indice trigram `races_name_trgm_idx` su `name`.
- `race_not_duplicates(race_a<race_b)` — coppie marcate "non è un doppione" (RLS: solo admin).
- vista `race_duplicate_candidates` — coppie candidate (stesso paese, data ±3 g,
  `similarity(name) ≥ 0.35`, distanze compatibili), escluse quelle già scartate.
- funzione `find_duplicate_races(nome, data, paese, distanze, …)` — riutilizzabile
  dall'ingestione AI (#3) per controllare un candidato prima di inserirlo.

Pagina admin: **`/calendario-gare/duplicati`** (solo `is_admin`, linkata da `/modera`) →
per ogni coppia: *Elimina la 1ª / Elimina la 2ª* oppure *Non è un doppione*.

Realtime: **non** usato (il catalogo non è live).

---

## 3. I motori d'import

| Motore | Copre | Comando | Frequenza | `source` |
|---|---|---|---|---|
| **AIMS ICS** | Maratone/mezze europee + principali internazionali | `npm run import:aims` (o GitHub Action) | **settimanale automatico** | `aims` |
| **Podisti.Net REST** | Gare su strada italiane (long-tail), solo competitive | `npm run import:podisti` (o GitHub Action) | **settimanale automatico** | `podisti` |
| **Costanti circuiti** | 7 Major + 6 SuperHalfs | `npm run seed:circuits` | 1×/anno (aggiornare date) | `editoriale` |
| **Segnalazioni utenti** | Long-tail (italiane e non) | form `/proponi` + moderazione | continuo | `utente` |

Gli script richiedono in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` (le righe non-`utente` non sono inseribili con anon key).
Girano con `node --env-file=.env.local`.

**Ordine di esecuzione consigliato:** prima `import:aims`, poi `seed:circuits`
(il seed marca `circuit`/`featured` sulle righe AIMS già presenti via dedup
`country + event_date + distanza`, evitando duplicati).

### AIMS — `scripts/import-aims.mjs`
- Feed: `https://aims-worldrunning.org/events.ics` (iCalendar pubblico, ~400 VEVENT).
- Mapping: `UID`→`external_ref`, `SUMMARY`→`name` + distanza (Marathon→42k, Half→21k),
  `LOCATION`→`country` (solo il **paese**), `DTSTART`→`event_date`, `URL`→`official_url`.
- Filtri: solo Europa (mappa `EUROPE`) e solo maratone/mezze. ~80 gare importate.
- **Città best-effort**: `LOCATION` AIMS contiene solo il paese, quindi la città è
  dedotta dal `SUMMARY` rimuovendo distanza, sponsor (`SPONSORS`), ordinali e numeri
  romani. Il `name` conserva lo sponsor; la `city` è pulita. Editabile a mano.
- Upsert idempotente per `(source, external_ref)` → preserva gli id (non rompe `runs.race_id`).

### Podisti.Net — `scripts/import-podisti.mjs`
- Fonte: `https://calendario.podisti.net/wp-json/wp/v2/gara` — **REST API pubblica di
  WordPress** (il custom post type `gara` è esposto via `show_in_rest`, con campi ACF
  strutturati: `data_gara`, `localita`, `competitiva`, `distanze_percorsi`, `link_evento`,
  coordinate, contatti…). Nessuno scraping HTML.
- **Perimetro** (deciso col committente): solo le categorie **su strada** (id 392),
  **mezza maratona** (6) e **maratona** (5) — escluse trail/skyrace/vertical, ultra,
  campestre, in montagna, pista, staffetta, corsa a tappe; solo gare **competitive**
  (`acf.competitiva === true`); solo i **prossimi 12 mesi**. I filtri competitiva +
  finestra sono lato script (la REST non filtra i campi ACF).
- **Slug nostro**: `slugify(nome + città)-anno` — non riusiamo il permalink di Podisti.Net
  (originalità SEO + igiene legale). Lo slug non viene toccato in update (permalink stabile).
- Mapping: `title`→`name` (entità HTML decodificate), `localita`→`city` (provincia tra
  parentesi rimossa) + regione dalla `class_list` (`localita_gara-<regione>`),
  `distanze_percorsi`→`distances[]` (bucket 5k/10k/21k/42k; virgola = decimale italiano),
  `link_evento`/`link_iscrizione`→`official_url`, `race_type='competitiva'`, `country='IT'`.
- Upsert idempotente per `(source='podisti', external_ref = id WordPress)` → preserva gli
  id (non rompe `runs.race_id`). Slug reso univoco per i soli nuovi inserimenti.
- **Dry run**: `node scripts/import-podisti.mjs --dry-run` — solo fetch+mapping, nessuna
  scrittura, non servono credenziali. Utile per validare il mapping su dati reali.
- Nota volume: a inizio stagione il numero è basso (es. ~180 a metà luglio) perché il
  grosso del calendario è non-competitivo o già passato; cresce settimanalmente.
- **Dedup cross-fonte**: l'import è isolato (come AIMS). Un eventuale doppione con la
  stessa maratona italiana già presente via AIMS/editoriale sarà gestito dal dedup
  potenziato (`pg_trgm`), non da questo script — vedi §10.

### Costanti — `scripts/seed-circuits.mjs`
- 7 Major + 6 SuperHalfs come costanti (nome, città, `circuit`, `official_url`, data).
- **Manutenzione**: aggiornare le `date:` nell'array `CIRCUITS` a inizio stagione.
  Le edizioni passate usano già la prossima; le date 2027 non ufficiali sono marcate
  `registration_status='da_verificare'`.
- Dedup: se una gara è già in tabella (match country+data+distanza) la **marca**
  invece di duplicarla; altrimenti la inserisce con `external_ref` stabile.

### FIDAL — **scartato** (non fattibile)
`calendario.php` ignora del tutto i parametri querystring (testato: GET/POST, cookie,
UA/Referer, `livello` valorizzato, endpoint alternativi) e restituisce **sempre** solo
il mese corrente. Il filtro mese/regione è JS-only, replicabile solo con browser
headless (fragile + più esposto sul piano *sui generis* del diritto banca dati).
**Decisione**: il long-tail italiano è ora coperto da **Podisti.Net** (REST pulita),
oltre alle principali maratone/mezze IT già presenti via AIMS e alle segnalazioni utenti.

### Altre fonti valutate e scartate
- **podistiche.it** — aggregatore Laravel/Livewire **derivato da Podisti.Net** (stessi
  slug), niente API JSON pulita (solo HTML/JSON-LD da scrapare) e testo editoriale
  proprio protetto. Fonte di secondo grado: nessun dato in più rispetto a Podisti.Net.
- **running.life** — Laravel/Livewire internazionale; esiste un GeoJSON su `/it/map/…`
  ma è **`Disallow` in robots.txt**, con dato "in prosa" (descrizioni originali protette)
  e copertura minore/sbilanciata sul trail. Scartato.
- Verdetto: **Podisti.Net resta l'unica fonte primaria** italiana sensata.

---

## 4. Pagine e componenti

Tutto nel route group **`(public)`** (niente auth per le pagine pubbliche, SSR
indicizzabile). `calendario-gare/layout.tsx` fornisce Header/Footer + metadata a
tutte le sotto-pagine.

```
src/app/(public)/calendario-gare/
├── layout.tsx                 Guscio + SEO
├── page.tsx                   Lista: hero, filtri (q/distanza/area/circuito),
│                              "In evidenza" (featured), lista per mese,
│                              filtro orizzonte 15 mesi, CTA "Proponi una gara"
├── [slug]/page.tsx            Scheda: dettagli, CTA sito ufficiale, "Studia il
│                              percorso" (se gpx), sezione "Chi ci va?" (post runs
│                              con race_id) + CTA precompilata, JSON-LD SportsEvent
├── proponi/
│   ├── page.tsx               Server (auth) → redirect /login se non loggato
│   └── ProponiGaraForm.tsx    Client: inserisce gara pending (source='utente')
├── modera/
│   ├── page.tsx               Server: solo profiles.is_admin (else notFound)
│   └── ModeraActions.tsx      Client: Approva (published) / Rifiuta (rejected)
├── duplicati/                 Revisione doppioni cross-fonte (solo is_admin)
│   ├── page.tsx               Server: legge la vista race_duplicate_candidates
│   └── DuplicatiActions.tsx   Client: Elimina 1ª/2ª · "Non è un doppione"
└── importa/                   Ingestione AI da fonti grezze (solo is_admin)
    ├── page.tsx               Server: gate is_admin
    └── ImportaForm.tsx        Client: testo/volantini/URL/xls-csv → analizza → salva

src/lib/calendario/ingest.ts                   Estrazione Claude + normalizzazione + slug
src/app/api/calendario/importa/analizza/route.ts  POST: estrae + dedup (find_duplicate_races)
src/app/api/calendario/importa/salva/route.ts     POST: inserisce come pending (source='editoriale')

src/app/(public)/tools/gara-ideale/page.tsx   Tool "gara ideale" (server: carica catalogo)
src/components/RaceCard.tsx                    Card gara (+ export countryLabel ISO→bandiera)
src/components/tools/RaceMatcherTool.tsx       Form + shortlist (client)
src/lib/running/raceMatcher.ts                 matchRaces/scoreRace (calcolo puro)
```

Tipi in `src/lib/types.ts`: `Race`, `CatalogDistance`, `RaceType`, `RaceRegistration`,
`RaceCircuit`, `RaceSource`, `RaceStatus`; `Run.race_id`; `Profile.is_admin`.

Voce menu: `Header.tsx` → `extraLinks` ("Calendario gare").

---

## 5. Tool "Trova la tua gara ideale" (`/tools/gara-ideale`)

- Motore puro `raceMatcher.ts` (stessa filosofia degli altri tool, nessuna API esterna).
- `matchRaces(races, prefs)`: vincoli **netti** (distanza, area, orizzonte mesi) →
  `scoreRace()` punteggio pesato su **obiettivo** (finire/pb/esperienza/viaggio/prep_maratona)
  e **preferenze** (pianura, clima_fresco, gara_grande, gara_piccola). Indulgente sui
  dati parziali. Restituisce top 5 con motivazioni leggibili.
- La pagina server carica il catalogo pubblicato e lo passa come prop al client.

---

## 6. Ponte community

- Scheda gara → CTA **"Cerca compagni per questa gara"** → `/nuova-gara?race=<slug>`.
- `nuova-gara/page.tsx` legge `?race=<slug>`, carica la gara e passa un `GaraPrefill`
  a `NuovaGaraForm` (nome/distanza/città/data precompilati + `race_id`); banner di conferma.
- Il post creato ha `race_id` valorizzato → compare nella sezione **"Chi ci va?"**
  della scheda (avatar + cosa cerca ciascuno, link al post `/gare/[id]`).

---

## 7. Flusso segnalazione + moderazione

1. Utente loggato → "Proponi una gara" (in lista) → `/calendario-gare/proponi` →
   invia → gara `source='utente'`, `status='pending'` (RLS lo impone).
2. Admin → `/calendario-gare/modera` (URL diretto, **non** linkato nel menu; visibile
   solo se `profiles.is_admin`) → **Pubblica** o **Rifiuta**.

**Prerequisito**: eseguire `supabase/races-moderation.sql` in Supabase (aggiunge
`is_admin`, la policy admin e nomina admin l'owner). Il form di proposta funziona
anche prima; solo la pagina `modera` richiede la migrazione.

---

## 8. Decisioni architetturali

| Decisione | Scelta | Motivazione |
|---|---|---|
| Catalogo gare | Nuova tabella `races` | Anagrafica evento ≠ post community |
| Ponte community | `runs.race_id` nullable | Riusa post gara/interessi/messaggi |
| Collocazione | Route group `(public)` | SEO + design system, come `/tools` |
| Import | AIMS ICS + Podisti.Net REST + costanti circuiti + segnalazioni utenti | Copre IT (long-tail) + Europa + Major/SuperHalfs |
| Fonte long-tail IT | Podisti.Net REST API (`gara` via `show_in_rest`) | Feed strutturato pulito; no scraping. FIDAL/podistiche.it/running.life scartate |
| Slug gare Podisti | Permalink nostro, non ereditato | Originalità SEO + igiene legale |
| Dedup import | `(source, external_ref)` + match country+data+distanza | Idempotenza, no duplicati multi-fonte |
| Tool "gara ideale" | Calcolo puro `raceMatcher.ts` | Coerente con gli altri tool, zero API esterne |
| Orizzonte lista | Massimo 15 mesi | Nasconde le edizioni AIMS molto lontane |
| Moderazione | `profiles.is_admin` + policy RLS admin | Nessun ruolo admin di sito preesistente |

---

## 9. Manutenzione ricorrente

- **Catalogo AIMS**: aggiornato **in automatico ogni lunedì** dalla GitHub Action
  `.github/workflows/import-aims.yml` (o a mano con `npm run import:aims`; trigger
  manuale anche da Actions → "Run workflow"). Idempotente; aggiorna anche le città
  rifinite. **Prerequisito**: i secret repo `NEXT_PUBLIC_SUPABASE_URL` e
  `SUPABASE_SERVICE_ROLE_KEY` (Settings → Secrets and variables → Actions). Lo script
  CI è `npm run import:aims:ci` (legge le env dai secret, senza `--env-file`).
- **Catalogo Podisti.Net**: aggiornato **in automatico ogni lunedì (05:30 UTC)** dalla
  GitHub Action `.github/workflows/import-podisti.yml` (o a mano con
  `npm run import:podisti`; dry-run con `node scripts/import-podisti.mjs --dry-run`).
  Idempotente, stessi secret di AIMS. Lo script CI è `npm run import:podisti:ci`.
  Per cambiare il perimetro (categorie, competitive, mesi) modificare le costanti in
  testa a `scripts/import-podisti.mjs`.
- **Aggiornare le date dei circuiti** (1×/anno): modificare l'array `CIRCUITS` in
  `scripts/seed-circuits.mjs`, poi rilanciare con `npm run seed:circuits` **oppure**
  dalla GitHub Action manuale `.github/workflows/seed-circuits.yml` (Actions → "Seed
  circuiti" → Run workflow; usa `npm run seed:circuits:ci`).
- **Moderare le segnalazioni**: `/calendario-gare/modera`.
- **Rifinire una città AIMS sbagliata**: modificarla a mano in Supabase (verrà
  sovrascritta solo se cambia il `name` a monte nel feed).

## 10. Roadmap

1. ✅ **Import Podisti.Net** (`scripts/import-podisti.mjs`) — fatto.
2. ✅ **Dedup potenziato cross-fonte** (`supabase/races-dedup.sql` + pagina
   `/calendario-gare/duplicati`) — `pg_trgm` + similarità sul nome affiancata al match
   `country + data + distanza`; le coppie candidate sono **segnalate** all'admin, mai
   fuse/scartate in automatico. Funzione `find_duplicate_races()` pronta per il #3.
   ⚠️ Prerequisito: eseguire `supabase/races-dedup.sql` in Supabase.
3. ✅ **Ingestione fonti grezze + AI** — pagina admin `/calendario-gare/importa`
   (`is_admin`, linkata da `/modera`) che accetta **testo incollato, volantini (jpg/pdf),
   elenchi di URL, xls/csv** e usa Claude (`claude-opus-4-8` vision per volantini/PDF,
   `claude-sonnet-5` per testo/URL/CSV) per estrarre **una o più gare** strutturate →
   dedup via `find_duplicate_races()` (#2) → salvataggio `status='pending'` con provenienza
   **indistinguibile** (`source='editoriale'`) → revisione/pubblicazione in `/modera`.
   Dai volantini si estraggono i **fatti** e si genera una scheda nostra (niente
   ripubblicazione dell'immagine altrui).
   ⚠️ Prerequisito runtime: variabile d'ambiente **`ANTHROPIC_API_KEY`** (Vercel +
   `.env.local`). Dipendenze: `@anthropic-ai/sdk`, `exceljs` (parsing xls/csv;
   scelto al posto di `xlsx` che ha una vulnerabilità high senza fix su npm).
   Estrazione via `client.messages.parse()` con schema Zod (structured outputs).

Altre idee minori:
- Link "Modera" nel menu (solo admin) invece dell'URL diretto.
- Notifiche "iscrizioni aperte", filtro per circuito dedicato, export.
- Collegamento `gpx_path` → catalogo percorsi del tool Strategia gara.
- Le coordinate (`latitudine`/`longitudine`) di Podisti.Net non sono ancora salvate
  (la tabella non ha colonne geo): utili per una futura vista mappa.

## Nota legale (Podisti.Net / fonti terze)

L'accesso è via REST API pubblica, ma non è un'API ufficiale per terzi: i **dati di
fatto** (data, luogo, distanza) restano estratti dal loro database → prima della messa
in produzione **concordare con Podisti.Net l'ok al riuso e l'attribuzione** ("Fonte:
Calendario Podisti.Net" + link). Le **locandine** sono opere di terzi protette da
copyright: non vanno ribattute — o si linka l'originale o si genera una grafica propria
dai dati.
