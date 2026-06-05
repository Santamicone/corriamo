# Vieni a correre?

Web app per runner che vogliono proporre corse, trovare compagni di allenamento e gestire appuntamenti singoli o ricorrenti.

**URL produzione:** https://www.vieniacorrere.it  
**Repository:** https://github.com/Santamicone/corriamo  
**Branch principale:** `main`  
**Branch di sviluppo attivo:** `feat/ui-ux-redesign`

---

## Indice

1. [Stack tecnologico](#1-stack-tecnologico)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Setup locale](#3-setup-locale)
4. [Variabili d'ambiente](#4-variabili-dambiente)
5. [Database Supabase](#5-database-supabase)
6. [Deploy su Vercel](#6-deploy-su-vercel)
7. [Workflow di sviluppo](#7-workflow-di-sviluppo)
8. [Funzionalità implementate](#8-funzionalità-implementate)
9. [Design system](#9-design-system)
10. [Procedure operative](#10-procedure-operative)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Stack tecnologico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.7 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database / Auth | Supabase (PostgreSQL + RLS) | 2.107.0 |
| Auth helpers | @supabase/ssr | 0.10.x |
| Mappa | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| Date | date-fns | 4.x |
| Icons | Material Symbols Outlined (Google Fonts) | — |
| Font | Plus Jakarta Sans (Google Fonts) | — |
| Hosting | Vercel | — |

---

## 2. Struttura del progetto

```
corriamo/
├── public/
│   ├── hero.png           # Immagine hero (fallback mobile)
│   ├── hero.mp4           # Video hero (solo desktop)
│   ├── hero1.png          # Thumbnail nella hero card
│   └── logo_vieniacorrere.png
│
├── src/
│   ├── app/               # App Router — pagine e route
│   │   ├── layout.tsx         # Root layout (fonts, metadata)
│   │   ├── globals.css        # Design tokens Tailwind v4 + stili globali
│   │   ├── page.tsx           # Homepage (hero, come funziona, ecc.)
│   │   ├── auth/callback/     # Handler OAuth/email confirm Supabase
│   │   ├── bacheca/           # Lista corse con filtri e mappa
│   │   ├── corse/[id]/        # Dettaglio corsa + iscrizione + recensione
│   │   ├── serie/[id]/        # Dettaglio serie ricorrente
│   │   ├── nuova-corsa/       # Form creazione corsa
│   │   ├── nuova-serie/       # Form creazione serie
│   │   ├── profilo/[id]/      # Profilo pubblico runner
│   │   ├── profilo/modifica/  # Modifica profilo (auth)
│   │   ├── area-personale/    # Dashboard utente
│   │   ├── messaggi/          # Inbox messaggi
│   │   ├── messaggi/[runId]/[otherId]/ # Thread conversazione
│   │   ├── login/             # Pagina di accesso
│   │   └── registrati/        # Registrazione nuovo utente
│   │
│   ├── components/
│   │   ├── Header.tsx         # Header con nav, menu utente, badge messaggi
│   │   ├── Footer.tsx         # Footer con link
│   │   ├── RunCard.tsx        # Card corsa per la bacheca
│   │   ├── SeriesCard.tsx     # Card serie ricorrente
│   │   ├── ReviewCard.tsx     # Singola recensione
│   │   ├── RunMap.tsx         # Mappa Leaflet (client, no SSR)
│   │   ├── RunMapWrapper.tsx  # Wrapper dynamic import per RunMap
│   │   └── ui/
│   │       ├── Avatar.tsx     # Avatar con iniziali o immagine
│   │       ├── Badge.tsx      # Badge/pill colorato
│   │       ├── Button.tsx     # Bottone con varianti
│   │       ├── Input.tsx      # Campo testo con label/errore
│   │       ├── Select.tsx     # Select con label
│   │       ├── Stars.tsx      # Stelle (display + input interattivo)
│   │       └── Textarea.tsx   # Textarea con label
│   │
│   ├── lib/
│   │   ├── types.ts           # Tipi TypeScript condivisi
│   │   ├── utils.ts           # Utility (cn, formatDate, formatPace, ecc.)
│   │   ├── geocoding.ts       # Nominatim geocoding + fallback città
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client (browser)
│   │       └── server.ts      # Supabase client (server/SSR)
│   │
│   └── proxy.ts               # Auth middleware (route protection)
│
├── supabase/
│   ├── schema.sql             # Schema completo DB (tabelle + RLS)
│   ├── trigger-new-user.sql   # Trigger creazione profilo automatica
│   ├── messages.sql           # Tabella messaggistica
│   ├── reviews.sql            # Tabella recensioni
│   ├── add-coordinates.sql    # Colonne lat/lng su runs
│   ├── run-schema.cjs         # Script Node per eseguire lo schema
│   ├── DASHBOARD-CONFIG.md    # Guida configurazione Supabase Dashboard
│   └── email-templates/       # Template email in italiano
│       ├── confirm-signup.html
│       ├── reset-password.html
│       ├── magic-link.html
│       └── change-email.html
│
├── .env.local                 # Variabili locali (non nel repo)
├── next.config.ts
├── tailwind.config.ts         # (Tailwind v4 usa globals.css invece)
└── tsconfig.json
```

---

## 3. Setup locale

### Prerequisiti

- Node.js >= 20
- npm >= 10
- Account Supabase (gratuito su supabase.com)
- Git

### Installazione

```bash
# 1. Clona il repository
git clone https://github.com/Santamicone/corriamo.git
cd corriamo

# 2. Installa le dipendenze
npm install

# 3. Crea il file di variabili d'ambiente
cp .env.local.example .env.local
# oppure crea manualmente .env.local (vedi sezione 4)

# 4. Avvia il server di sviluppo
npm run dev
```

Apri **http://localhost:3000**.

### Comandi disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il server di sviluppo con hot reload |
| `npm run build` | Build di produzione |
| `npm run start` | Avvia il server di produzione (dopo build) |
| `npm run lint` | Esegue ESLint |

---

## 4. Variabili d'ambiente

### `.env.local` (sviluppo locale)

```env
NEXT_PUBLIC_SUPABASE_URL=https://wshjtgtmxbxhpdqtxpiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Variabili su Vercel (produzione)

Vai su **Vercel → progetto corriamo → Settings → Environment Variables** e aggiungi:

| Nome | Valore | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wshjtgtmxbxhpdqtxpiq.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | All |
| `NEXT_PUBLIC_SITE_URL` | `https://corriamo.vercel.app` | Production |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Development |

> **Nota:** `NEXT_PUBLIC_SITE_URL` viene usato per costruire il link nelle email di conferma registrazione. In produzione deve puntare al dominio pubblico.

---

## 5. Database Supabase

### Configurazione iniziale (primo setup)

Esegui i file SQL nell'ordine indicato da **Supabase Dashboard → SQL Editor → New query**:

| Ordine | File | Contenuto |
|---|---|---|
| 1 | `supabase/schema.sql` | Tabelle principali: `profiles`, `runs`, `series`, `participations` + RLS + indici |
| 2 | `supabase/trigger-new-user.sql` | Trigger che crea automaticamente il profilo alla registrazione |
| 3 | `supabase/messages.sql` | Tabella `messages` per la messaggistica interna |
| 4 | `supabase/reviews.sql` | Tabella `reviews` per le recensioni organizzatori |
| 5 | `supabase/add-coordinates.sql` | Aggiunge `lat` e `lng` alla tabella `runs` |

### Schema del database

#### `profiles`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid (PK) | Corrisponde a `auth.users.id` |
| `full_name` | text | Nome completo |
| `city` | text | Città |
| `level` | text | `principiante`, `intermedio`, `avanzato`, `tutti` |
| `pace_min` | numeric | Ritmo minimo in min/km (es. 4.5 = 4:30) |
| `pace_max` | numeric | Ritmo massimo |
| `bio` | text | Breve descrizione |
| `strava_url` | text | Link profilo Strava |
| `garmin_url` | text | Link profilo Garmin |
| `instagram_url` | text | Link Instagram |
| `avatar_url` | text | URL immagine profilo |

#### `runs`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid (PK) | |
| `organizer_id` | uuid (FK → profiles) | |
| `series_id` | uuid (FK → series) | Nullable |
| `title` | text | |
| `description` | text | Nullable |
| `date` | date | |
| `time` | time | |
| `location` | text | Punto di ritrovo (testo) |
| `city` | text | |
| `distance_km` | numeric | Nullable |
| `pace_target` | text | Testo libero es. "5:30/km" |
| `level` | text | |
| `max_participants` | integer | Nullable |
| `status` | text | `aperta`, `completa`, `annullata` |
| `is_no_drop` | boolean | |
| `lat` | numeric(10,7) | Latitudine (geocoding Nominatim) |
| `lng` | numeric(10,7) | Longitudine |

#### `series`
Stessa struttura di `runs` ma senza `date`/`time` — ha invece `recurrence_type` (`settimanale`, `bisettimanale`, `mensile`), `recurrence_day` (0-6), `recurrence_time`, `start_date`, `end_date`.

#### `participations`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid (PK) | |
| `run_id` | uuid (FK → runs) | |
| `user_id` | uuid (FK → profiles) | |
| `status` | text | `in_attesa`, `approvata`, `rifiutata` |
| `message` | text | Messaggio opzionale all'organizzatore |

#### `messages`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid (PK) | |
| `run_id` | uuid (FK → runs) | Contesto corsa (nullable) |
| `sender_id` | uuid (FK → profiles) | |
| `recipient_id` | uuid (FK → profiles) | |
| `body` | text | |
| `read_at` | timestamptz | Nullable — null = non letto |

#### `reviews`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid (PK) | |
| `run_id` | uuid (FK → runs) | |
| `reviewer_id` | uuid (FK → profiles) | |
| `reviewed_id` | uuid (FK → profiles) | Organizzatore recensito |
| `rating` | integer | 1–5 |
| `body` | text | Nullable, max 1000 caratteri |
| `unique(run_id, reviewer_id)` | — | Una sola recensione per corsa per reviewer |

### Configurazione Supabase Dashboard

Vedi `supabase/DASHBOARD-CONFIG.md` per la procedura completa. In sintesi:

**Authentication → URL Configuration:**
- Site URL: `https://corriamo.vercel.app`
- Redirect URLs: `https://corriamo.vercel.app/**`

**Authentication → Email Templates:**  
Sostituire i 4 template con i file HTML in `supabase/email-templates/` (soggetti e corpo in italiano, branded "Vieni a correre?").

---

## 6. Deploy su Vercel

### Primo deploy

```bash
# 1. Assicurati che il codice sia su GitHub
git push origin main

# 2. Vai su vercel.com → New Project → Import da GitHub
# 3. Seleziona il repo "corriamo"
# 4. Framework: Next.js (rilevato automaticamente)
# 5. Aggiungi le variabili d'ambiente (vedi sezione 4)
# 6. Deploy
```

### Deploy aggiornamenti

Ogni `push` sul branch `main` triggera automaticamente un nuovo deploy su Vercel.

```bash
# Workflow standard
git add .
git commit -m "feat: descrizione della modifica"
git push origin main
# → Vercel fa il deploy automaticamente in ~1-2 minuti
```

### Deploy da PR

I push su branch diversi da `main` creano un **Preview Deployment** su Vercel con URL temporaneo (es. `corriamo-git-feat-xyz.vercel.app`). Utile per testare prima di mergiare.

### Verificare lo stato del deploy

- Dashboard Vercel: https://vercel.com/santamicone/corriamo
- Log di build in real-time su Vercel → Deployments
- Rollback a deploy precedente: Vercel → Deployments → tre puntini → Promote to Production

---

## 7. Workflow di sviluppo

### Branch strategy

```
main                    ← produzione (deploy automatico su Vercel)
  └── feat/ui-ux-redesign  ← branch di sviluppo attivo
        └── feat/nome-feature  ← nuove feature
```

### Creare una nuova feature

```bash
# 1. Aggiorna il branch base
git checkout feat/ui-ux-redesign
git pull origin feat/ui-ux-redesign

# 2. Crea un branch per la feature
git checkout -b feat/nome-della-feature

# 3. Sviluppa e testa in locale
npm run dev

# 4. Verifica la build prima di committare
npm run build

# 5. Commit e push
git add .
git commit -m "feat: descrizione chiara"
git push origin feat/nome-della-feature

# 6. Apri una Pull Request su GitHub verso feat/ui-ux-redesign
```

### Convenzioni per i commit

Seguire il formato **Conventional Commits**:

| Prefisso | Quando usarlo |
|---|---|
| `feat:` | Nuova funzionalità |
| `fix:` | Correzione di un bug |
| `chore:` | Dipendenze, config, non tocca feature |
| `assets:` | Immagini, video, file statici |
| `docs:` | Solo documentazione |
| `refactor:` | Refactoring senza modifiche funzionali |
| `style:` | CSS/styling puro |

### Checklist prima di ogni PR

- [ ] `npm run build` passa senza errori
- [ ] `npm run lint` passa (o gli errori sono giustificati)
- [ ] Testato in locale su Chrome e Safari
- [ ] Testato su mobile (o con DevTools responsive)
- [ ] Se ci sono modifiche al DB: aggiornato `supabase/DASHBOARD-CONFIG.md`
- [ ] Nessuna credenziale o chiave API committata

---

## 8. Funzionalità implementate

### Autenticazione
- Registrazione con profilo runner completo (livello, ritmo, bio, link social)
- Login con email/password
- Conferma email con redirect corretto (`/auth/callback`)
- Protezione route tramite `proxy.ts` (ex-middleware)

### Bacheca delle corse (`/bacheca`)
- Lista corse con filtri: testo, città, livello
- Filtro per data: chip rapide (Oggi, Domani, Weekend, +7 giorni) + range personalizzato
- Vista Lista e Vista Mappa (toggle)
- Tab: Corse singole / Serie ricorrenti
- Contatore risultati e pill filtro data attivo

### Mappa (`?view=mappa`)
- Mappa OpenStreetMap (Leaflet, caricamento dinamico lato client)
- Pin colorati per livello, badge multiplo se più corse nella stessa posizione
- Popup con dettagli corsa e link "Vedi dettagli"
- Auto-fit bounds su tutti i pin visibili
- Geocoding automatico via Nominatim al momento della creazione corsa

### Dettaglio corsa (`/corse/[id]`)
- Informazioni complete: data, orario, luogo, distanza, ritmo
- Sezione partecipanti approvati
- Iscrizione con messaggio opzionale (JoinButton)
- Approvazione/rifiuto richieste (solo organizzatore)
- Contatta organizzatore (form di messaggio inline)
- Recensione post-corsa (solo partecipanti approvati, corsa passata)

### Serie ricorrenti (`/serie/[id]`)
- Dettaglio serie con frequenza e prossimi appuntamenti
- Generazione automatica degli eventi futuri (8 settimane) alla creazione

### Profilo runner (`/profilo/[id]`)
- Informazioni runner: livello, ritmo, bio
- Link verificati Strava, Garmin, Instagram
- Rating medio + distribuzione stelle + lista recensioni ricevute
- Corse organizzate future
- Modifica profilo (solo proprio profilo)

### Messaggistica (`/messaggi`)
- Inbox con lista conversazioni raggruppate per (corsa, interlocutore)
- Badge messaggi non letti in header (aggiornamento realtime via Supabase)
- Thread conversazione stile iMessage (bubble arancio = miei, bianco = dell'altro)
- Reply form sticky con invio via Invio
- Marcatura automatica come letto all'apertura del thread

### Recensioni
- Form stelle (1–5) + testo opzionale
- Visualizzabili solo da partecipanti approvati su corse passate
- Modifica e cancellazione della propria recensione
- Sezione profilo con media, distribuzione a barre, lista completa

### Area personale (`/area-personale`)
- Corse organizzate future
- Corse a cui si partecipa
- Serie create
- Richieste di iscrizione in attesa (con link diretto)
- Riepilogo messaggi non letti

---

## 9. Design system

### Palette colori (Tailwind v4 CSS custom properties)

| Token | Valore | Uso |
|---|---|---|
| `primary` | `#EA580C` | Arancio — CTA, bottoni, accenti |
| `primary-hover` | `#C2410C` | Hover sul primario |
| `tertiary` | `#16A34A` | Verde — conferme, no-drop, serie |
| `on-surface` | `#111827` | Testo principale |
| `on-surface-variant` | `#6B7280` | Testo secondario/muted |
| `background` | `#FAFAF9` | Sfondo pagina |
| `surface-container-lowest` | `#ffffff` | Sfondo card |
| `outline-variant` | `#E5E7EB` | Bordi card |

Il body ha un gradiente radiale decorativo:
```css
background-image:
  radial-gradient(circle at 10% 0%, rgba(234,88,12,0.10), transparent 30%),
  radial-gradient(circle at 90% 5%, rgba(22,163,74,0.07), transparent 28%);
```

### Font
- **Plus Jakarta Sans** — caricato via Google Fonts nel `<head>`
- **Material Symbols Outlined** — icone, stessa fonte

### Componenti UI riutilizzabili
Tutti in `src/components/ui/`:
- `Button` — varianti `primary`, `secondary`, `ghost`, `danger`
- `Input` — con label, errore, hint
- `Select` — con label, custom chevron
- `Textarea` — con label, errore
- `Avatar` — iniziali colorate o immagine
- `Badge` — pill con varianti colore
- `Stars` — `StarsDisplay` (read-only) e `StarsInput` (interattivo)

---

## 10. Procedure operative

### Aggiungere una nuova tabella al database

1. Scrivi il SQL in `supabase/nomefunzione.sql`
2. Eseguilo in Supabase Dashboard → SQL Editor
3. Aggiorna `src/lib/types.ts` con i nuovi tipi TypeScript
4. Aggiorna `supabase/DASHBOARD-CONFIG.md` nella sezione "SQL aggiuntivi"

### Modificare i template email

I template sono gestiti da Supabase Dashboard (non dal codice):

1. Vai su **Supabase → Authentication → Email Templates**
2. Seleziona il template da modificare
3. Il codice HTML di riferimento è in `supabase/email-templates/`
4. La variabile `{{ .ConfirmationURL }}` viene sostituita automaticamente da Supabase

### Aggiungere una nuova pagina

```bash
# Esempio: pagina /statistiche
mkdir src/app/statistiche
touch src/app/statistiche/page.tsx
```

La pagina deve includere `<Header />` e `<Footer />`. Se richiede autenticazione, aggiungere il path a `proxy.ts`:

```typescript
const protectedPaths = ['/area-personale', '/nuova-corsa', '/nuova-serie', '/profilo/modifica', '/statistiche']
```

### Aggiornare le dipendenze

```bash
# Controlla aggiornamenti disponibili
npm outdated

# Aggiorna una dipendenza specifica
npm install nome-pacchetto@latest

# Aggiorna tutto (attenzione: può introdurre breaking changes)
npm update

# Dopo l'aggiornamento, verifica sempre
npm run build
```

### Cambiare dominio personalizzato

1. **Vercel → progetto → Settings → Domains** — aggiungi/modifica dominio
2. **Supabase → Authentication → URL Configuration** — aggiorna Site URL e Redirect URLs
3. **Vercel → Environment Variables** — aggiorna `NEXT_PUBLIC_SITE_URL`
4. Aggiorna i template email se includono l'URL hardcoded

### Backfill coordinate per corse esistenti

Le corse create prima dell'implementazione della mappa non hanno lat/lng. Per aggiungere le coordinate in bulk:

```sql
-- Aggiorna tutte le corse di Perugia con le coordinate della città
UPDATE runs
SET lat = 43.1107, lng = 12.3908
WHERE city ILIKE '%perugia%' AND lat IS NULL;

-- Ripeti per altre città
UPDATE runs SET lat = 45.4654, lng = 9.1859 WHERE city ILIKE '%milano%' AND lat IS NULL;
UPDATE runs SET lat = 41.9028, lng = 12.4964 WHERE city ILIKE '%roma%' AND lat IS NULL;
```

Per un geocoding più preciso (usa il luogo di ritrovo), vedi `src/lib/geocoding.ts` — la funzione `geocodeAddress()` può essere usata in uno script Node.js separato.

---

## 11. Troubleshooting

### Build fallisce con errori TypeScript

```bash
# Controlla solo gli errori TS senza fare la build completa
npx tsc --noEmit -p tsconfig.json
```

### La mappa non appare

- Verifica che `supabase/add-coordinates.sql` sia stato eseguito
- Leaflet richiede il browser: assicurarsi che il componente sia wrapped in `RunMapWrapper` (che usa `dynamic` con `ssr: false`)
- Controlla che il CSS di Leaflet sia importato in `RunMap.tsx`: `import 'leaflet/dist/leaflet.css'`

### "Email not confirmed" al login

- L'utente deve cliccare il link nell'email di conferma
- Per ambiente di sviluppo: disabilita la conferma email in **Supabase → Authentication → Settings → Enable email confirmations → OFF**
- Se il link porta a `localhost` invece del dominio corretto, verifica `NEXT_PUBLIC_SITE_URL` e il Site URL in Supabase

### "new row violates row-level security policy"

- Solitamente accade su `profiles` durante la registrazione
- Verifica che `supabase/trigger-new-user.sql` sia stato eseguito — il trigger crea il profilo bypassando RLS

### I messaggi non si aggiornano in tempo reale

- Il realtime di Supabase deve essere abilitato per la tabella `messages`
- Vai su **Supabase → Database → Replication** e abilita `messages` per `INSERT` e `UPDATE`

### Le corse non appaiono sulla mappa

- Le corse devono avere `lat` e `lng` non null
- Le corse create prima di `add-coordinates.sql` non hanno coordinate — usa il backfill SQL (vedi sezione 10)
- Se Nominatim non riesce a geocodificare (timeout, indirizzo non trovato), la corsa si salva senza coordinate — è previsto

### Vercel deploy fallisce

1. Controlla i log di build su vercel.com → Deployments
2. Esegui `npm run build` in locale per riprodurre l'errore
3. Verifica che tutte le variabili d'ambiente siano configurate su Vercel
4. Assicurati che il branch pushato sia `main` (o il branch configurato per il deploy automatico)

---

## Licenza

Progetto privato — tutti i diritti riservati.
