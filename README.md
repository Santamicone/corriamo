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
| Framework | Next.js App Router | 16.2.7 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 (CSS-based, `@theme` in globals.css) | 4.x |
| Database / Auth | Supabase (PostgreSQL + RLS + Realtime) | 2.107.x |
| Auth helpers | @supabase/ssr | 0.10.x |
| Mappa | Leaflet + React-Leaflet | 1.9 / 5.0 |
| OG Images | next/og (ImageResponse) | built-in |
| Date | date-fns | 4.x |
| Icons | Material Symbols Outlined (Google Fonts CDN) | — |
| Font | Plus Jakarta Sans (Google Fonts CDN) | — |
| Hosting | Vercel | — |

> ⚠️ **Attenzione:** Next.js 16 ha breaking changes rispetto alle versioni precedenti. Leggere `node_modules/next/dist/docs/` prima di modificare API o convenzioni. L'auth proxy si chiama `src/proxy.ts` (non `middleware.ts`).

---

## 2. Struttura del progetto

```
corriamo/
├── public/
│   ├── hero.png / hero.mp4 / hero1.png
│   ├── noi.jpeg                   # Foto fondatori (homepage)
│   ├── logo_vieniacorrere.png
│   ├── robots.txt
│   └── caratteri/                 # 9 personaggi illustrati per avatar
│       └── carattere1-9.png
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             Root layout + metadata globale
│   │   ├── globals.css            Design tokens Tailwind v4
│   │   ├── icon.svg               Favicon SVG
│   │   ├── sitemap.ts             Sitemap.xml dinamico
│   │   ├── page.tsx               Homepage
│   │   ├── come-funziona/         Guida funzionalità (6 sezioni)
│   │   ├── privacy/               Privacy Policy GDPR
│   │   ├── termini/               Termini di Servizio
│   │   ├── auth/callback/         Handler OAuth/email Supabase
│   │   ├── bacheca/               Lista corse: tab Corse + Gare
│   │   ├── corse/[id]/            Dettaglio corsa
│   │   │   ├── chat/              Chat di gruppo (Realtime)
│   │   │   └── ritrovo/           Purple Screen — "Sono qui"
│   │   ├── gare/                  Hub + [id] dettaglio gara
│   │   ├── serie/[id]/            Dettaglio serie ricorrente
│   │   ├── nuova-corsa/           Form corsa (singola o serie)
│   │   ├── nuova-corsa-spot/      Form corsa spot rapido
│   │   ├── nuova-gara/            Form post compagni di gara
│   │   ├── nuova-serie/           → redirect a /nuova-corsa
│   │   ├── profilo/[id]/          Profilo pubblico runner
│   │   ├── profilo/modifica/      Modifica profilo (auth)
│   │   ├── area-personale/        Dashboard utente
│   │   ├── messaggi/              Inbox + thread conversazione
│   │   ├── notifiche/             Notification center
│   │   ├── login/ + registrati/
│   │   └── api/og/corse/[id]/     OG Image dinamica
│   │
│   ├── components/
│   │   ├── Header.tsx             Nav + menu mobile overlay (no duplicati)
│   │   ├── Footer.tsx
│   │   ├── RunCard.tsx            Card corsa (badge interessi, luogo privato)
│   │   ├── GaraCard.tsx           Card gara (accent indigo)
│   │   ├── SeriesCard.tsx
│   │   ├── SpotRunsStrip.tsx      Striscia "Adesso" con geoloc
│   │   ├── ReviewCard.tsx
│   │   ├── MomentoCard.tsx
│   │   ├── LocationPreviewMap.tsx Mini-mappa con pin draggabile
│   │   ├── RunMap.tsx             Mappa bacheca multi-pin
│   │   ├── RunMapWrapper.tsx
│   │   └── ui/
│   │       ├── Avatar.tsx         Foto / 9 personaggi / 6 icone colorate
│   │       ├── AvatarLightbox.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx / Select.tsx / Textarea.tsx
│   │       ├── Stars.tsx
│   │       ├── TagBadge.tsx / TagPicker.tsx
│   │       ├── ReliabilityBadge.tsx    Badge affidabilità organizzatore
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── types.ts               Tipi TS (Profile, Run, Series, Interest, CheckIn, RunConfirmation...)
│   │   ├── utils.ts               cn, formatDate, parseRunDateTime, runRitrovoColor...
│   │   ├── tags.ts                18 tag + helpers
│   │   ├── compatibility.ts       Scoring compatibilità (supporta nuovi livelli profilo)
│   │   ├── geocoding.ts           Nominatim + fallback città
│   │   ├── reliability.ts         getReliabilityBadge() — score affidabilità organizzatore
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   │
│   └── proxy.ts                   Auth guard (Next.js 16 convention)
│
├── supabase/                      File SQL + email templates
└── Vieni_a_correre_Documentazione.docx
```

---

## 3. Setup locale

### Prerequisiti
- Node.js >= 20
- npm >= 10

### Installazione

```bash
git clone https://github.com/Santamicone/corriamo.git
cd corriamo
git checkout feat/ui-ux-redesign
npm install
# Configura .env.local (vedi sezione 4)
npm run dev   # → http://localhost:3000
```

### Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il server di sviluppo con hot reload |
| `npm run build` | Build di produzione |
| `npm run lint` | Esegue ESLint |

---

## 4. Variabili d'ambiente

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://wshjtgtmxbxhpdqtxpiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In produzione (Vercel) `NEXT_PUBLIC_SITE_URL` → `https://vieniacorrere.it`

---

## 5. Database Supabase

**Ref:** `wshjtgtmxbxhpdqtxpiq`

### SQL da eseguire (in ordine, su Supabase Dashboard → SQL Editor)

| # | File |
|---|---|
| 1 | `supabase/schema.sql` |
| 2 | `supabase/trigger-new-user.sql` |
| 3 | `supabase/messages.sql` |
| 4 | `supabase/reviews.sql` |
| 5 | `supabase/add-coordinates.sql` |
| 6 | `supabase/storage-avatars.sql` |
| 7 | `supabase/notifications.sql` |
| 8 | `supabase/add-spot.sql` |
| 9 | `supabase/momenti.sql` |
| 10 | `supabase/add-tags.sql` |
| 11 | `supabase/add-gara.sql` |
| 12 | `supabase/add-profile-fields.sql` |
| 13 | `supabase/run-chat.sql` |
| 14 | `supabase/check-ins.sql` |
| 15 | `supabase/add-interests.sql` |
| 16 | `supabase/add-location-public.sql` |
| 17 | `supabase/add-filter-by-city.sql` |
| 18 | `supabase/reliability.sql` |

### Abilitare Realtime (SQL Editor)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_confirmations;
```

### Configurazione Dashboard
- **Authentication → URL Configuration:** Site URL = `https://vieniacorrere.it`, Redirect URLs = `https://vieniacorrere.it/**`
- **Authentication → Email Templates:** 4 template in `supabase/email-templates/`

---

## 6. Deploy su Vercel

Ogni push su `main` triggera automaticamente il deploy. Preview su ogni branch.

```bash
git add .
git commit -m "feat: descrizione"
git push origin main
# → Deploy automatico in ~1-2 minuti
```

Dashboard: https://vercel.com/santamicone/corriamo

---

## 7. Workflow di sviluppo

```
main                    ← produzione
  └── feat/ui-ux-redesign  ← branch attivo
        └── feat/nome-feature
```

### Conventional Commits

| Prefisso | Uso |
|---|---|
| `feat:` | Nuova funzionalità |
| `fix:` | Bug fix |
| `chore:` | Dipendenze, config |
| `assets:` | File statici |
| `docs:` | Solo documentazione |
| `refactor:` | Refactoring |
| `style:` | CSS/styling |

### Checklist PR
- [ ] `npm run build` passa senza errori TypeScript
- [ ] Testato su Chrome e Safari mobile
- [ ] Se modifiche al DB: SQL eseguito e documentato

---

## 8. Funzionalità implementate

### Autenticazione & Profilo
- Registrazione/login email + conferma
- Avatar: foto caricata, 9 personaggi illustrati con lightbox, 6 icone colorate
- Livelli: Principiante → Atleta agonista (5 opzioni)
- Età, Bio, Personal Best (5K/10K/21K/42K), "Perché corri?" (7 chip)
- Filtro bacheca automatico per città del profilo

### Bacheca
- Tab **Corse** (singole + serie nella stessa vista) e tab **Gare**
- Filtri: testo, città, livello, data, 18 tag in 5 categorie
- Vista Lista e Vista Mappa toggle
- Striscia "Adesso": corse <3h con geolocalizzazione
- Filtro automatico città dal profilo (chip rimovibile)

### Creazione corse
- Form unificato con selettore tipo (singola | serie ricorrente)
- Geocoding live Nominatim + mappa con pin draggabile
- Luogo pubblico o privato (coordinate arrotondate + pin grigio per non-approvati)
- Corsa spot rapida (<30 secondi)

### Partecipazioni
- **"Mi interessa"**: segnale automatico, no approvazione, no accesso chat
- **"Partecipa"**: richiesta formale → approvazione organizzatore
- Annullamento corsa con notifica automatica

### "Sono qui" — Purple Screen
- Ogni corsa ha un colore unico (hash deterministico, palette 18 colori)
- Attivabile −60min → +30min dall'orario di partenza
- Schermo full-color con counter live partecipanti (Realtime)
- Wake Lock API: schermo sempre acceso

### Chat di gruppo
- Solo organizzatore e partecipanti approvati
- iMessage style, Realtime, ottimizzato mobile

### Compagni di gara (/gare)
- Hub /gare con spiegazione, filtri, lista GaraCard
- Pacer / Compagno / Supporter
- Solo ContactButton (gara di terzi)

### Messaggistica 1-to-1
- Inbox per (corsa, interlocutore), thread iMessage, badge realtime

### Momenti & Recensioni
- Foto post-run nel profilo, stelle + testo, media con distribuzione

### Mappa
- Pin colorati per livello, grigio tratteggiato per luogo privato, rosso per spot
- Geocoding Nominatim automatico alla creazione

### Affidabilità organizzatori
- Badge **Affidabile** (verde, ≥3 corse, score ≥85%) e **Organizzatore** (blu, ≥1 corsa confermata)
- Score calcolato automaticamente da: check-in Purple Screen + recensioni + prompt post-run
- Prompt "La corsa si è svolta?" per partecipanti approvati tra 2h e 7gg dalla corsa
- Corse spot pesano 0.5; colonne materializzate su `profiles` aggiornate da trigger

### SEO
- robots.txt, sitemap.xml dinamico, favicon SVG
- Metadata dinamico su tutte le pagine pubbliche (canonical, OG, Twitter)
- Privacy Policy e Termini di Servizio

---

## 9. Design system

### Palette (Tailwind v4 CSS custom properties in `globals.css`)

| Token | Valore | Uso |
|---|---|---|
| `primary` | `#EA580C` | Arancio — CTA, bottoni, accenti |
| `primary-hover` | `#C2410C` | Hover |
| `tertiary` | `#16A34A` | Verde — no-drop, serie |
| `on-surface` | `#111827` | Testo principale |
| `on-surface-variant` | `#6B7280` | Testo secondario |
| `background` | `#FAFAF9` | Sfondo pagina |

### Font
- **Plus Jakarta Sans** — body e titoli
- **Material Symbols Outlined** — icone

---

## 10. Procedure operative

### Aggiungere una nuova tabella

1. Scrivi SQL in `supabase/nomefunzione.sql`
2. Esegui in Supabase Dashboard → SQL Editor
3. Aggiorna `src/lib/types.ts`
4. Se servono query Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.nome;`

### Modificare i template email

Gestiti da Supabase Dashboard → Authentication → Email Templates.  
Il codice HTML di riferimento è in `supabase/email-templates/`.

### Fuso orario

Tutti gli orari delle corse sono in **ora italiana (Europe/Rome)**. Usare sempre `parseRunDateTime(date, time)` da `@/lib/utils` — mai `new Date(`${date}T${time}`)` direttamente, che interpreta l'orario come UTC sul server Vercel.

---

## 11. Troubleshooting

### Build fallisce con errori TypeScript
```bash
npx tsc --noEmit -p tsconfig.json
```

### La mappa non appare
- Verificare che `supabase/add-coordinates.sql` sia stato eseguito
- Leaflet richiede `ssr: false` nel dynamic import

### "Email not confirmed" al login
- Disabilitare conferma email in Supabase Dashboard per dev locale

### Messaggi non si aggiornano in real-time
- Verificare che la tabella sia in `supabase_realtime` publication (SQL sopra)

### Badge affidabilità non appare
- Verificare che `supabase/reliability.sql` sia stato eseguito (aggiunge colonne `reliability_*` su `profiles`)
- I badge compaiono solo dopo che il trigger ha calcolato almeno 1 corsa eligible (passata da >24h con partecipanti approvati)

### Purple Screen non appare
- Verificare finestra temporale (−60 min → +30 min dall'orario corsa)
- Solo organizzatore e partecipanti **approvati** lo vedono
- Verificare che il fuso orario sia corretto (usare `parseRunDateTime`)

### Vercel deploy fallisce
1. Eseguire `npm run build` in locale
2. Verificare variabili d'ambiente su Vercel
3. Controllare log su vercel.com → Deployments

---

## Licenza

Progetto privato — tutti i diritti riservati.
