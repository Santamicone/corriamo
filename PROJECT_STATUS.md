# PROJECT_STATUS.md — Vieni a correre?

> Documento di stato del progetto per il ripristino del contesto in una nuova sessione Claude Code.  
> Aggiornato al: **giugno 2026**

---

## 1. Panoramica

**App:** Vieni a correre? — web app per runner che vogliono proporre corse, trovare compagni e gestire appuntamenti singoli o ricorrenti.  
**URL produzione:** https://www.vieniacorrere.it  
**Repository:** https://github.com/Santamicone/corriamo  
**Branch attivo:** `feat/ui-ux-redesign` (tutto lo sviluppo avviene qui, non ancora mergiato su `main`)

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
```

---

## 4. Database Supabase

**Progetto:** `corriamo`  
**Ref:** `wshjtgtmxbxhpdqtxpiq`

### Ordine esecuzione SQL (eseguire tutti in sequenza su Supabase Dashboard → SQL Editor)

| # | File | Stato | Contenuto |
|---|---|---|---|
| 1 | `supabase/schema.sql` | ✅ Eseguito | `profiles`, `runs`, `series`, `participations` + RLS |
| 2 | `supabase/trigger-new-user.sql` | ✅ Eseguito | Trigger auto-crea profilo alla registrazione |
| 3 | `supabase/messages.sql` | ✅ Eseguito | Tabella `messages` + RLS |
| 4 | `supabase/reviews.sql` | ✅ Eseguito | Tabella `reviews` + RLS + trigger updated_at |
| 5 | `supabase/add-coordinates.sql` | ✅ Eseguito | Colonne `lat`, `lng` su `runs` |
| 6 | `supabase/storage-avatars.sql` | ✅ Eseguito | Bucket `avatars` + RLS policies |
| 7 | `supabase/notifications.sql` | ✅ Eseguito | Tabella `notifications` + 4 trigger automatici |
| 8 | `supabase/add-spot.sql` | ✅ Eseguito | Colonna `is_spot boolean` su `runs` |
| 9 | `supabase/momenti.sql` | ✅ Eseguito | Tabella `momenti` + bucket `momenti` Storage |
| 10 | `supabase/add-tags.sql` | ✅ Eseguito | Colonna `tags text[]` su `runs` e `series` |

### Tabelle principali

```
profiles         id, full_name, city, level, pace_min, pace_max, bio,
                 strava_url, garmin_url, instagram_url, avatar_url

runs             id, organizer_id, series_id, title, description, date, time,
                 location, city, lat, lng, distance_km, pace_target, level,
                 max_participants, status, is_no_drop, is_spot, tags text[],
                 type ('allenamento'|'gara' — NON ANCORA AGGIUNTO, vedi §8)

series           id, organizer_id, title, description, location, city,
                 recurrence_type, recurrence_day, recurrence_time, start_date,
                 distance_km, pace_target, level, max_participants, is_no_drop,
                 tags text[]

participations   id, run_id, user_id, status (in_attesa|approvata|rifiutata),
                 message

messages         id, run_id, sender_id, recipient_id, body, read_at

reviews          id, run_id, reviewer_id, reviewed_id, rating (1-5), body,
                 UNIQUE(run_id, reviewer_id)

notifications    id, user_id, type, title, body, run_id, actor_id, read,
                 show_after (per promemoria schedulati)

momenti          id, run_id, author_id, photo_url, body, UNIQUE(run_id, author_id)
```

### Storage bucket
- `avatars` — foto profilo utente (`avatars/{user_id}/avatar.{ext}`)
- `momenti` — foto post-run (`momenti/{user_id}/{run_id}.{ext}`)

### Configurazione Dashboard Supabase (manuale)
- **Authentication → URL Configuration:** Site URL = `https://vieniacorrere.it`, Redirect URLs = `https://vieniacorrere.it/**`
- **Authentication → Email Templates:** 4 template HTML in italiano in `supabase/email-templates/`
- **Database → Replication:** abilitare `notifications` per INSERT e UPDATE (per Realtime badge)

---

## 5. Struttura file sorgente

```
src/
├── app/
│   ├── layout.tsx                    Root layout (font Google Fonts nel <head>)
│   ├── globals.css                   Design tokens Tailwind v4 + gradient body
│   ├── page.tsx                      Homepage: hero video/immagine, How it works, Why different
│   ├── auth/callback/route.ts        Handler conferma email Supabase
│   ├── bacheca/page.tsx              Lista corse con filtri, mappa, striscia Spot, tag
│   ├── corse/[id]/
│   │   ├── page.tsx                  Dettaglio corsa + generateMetadata OG
│   │   ├── JoinButton.tsx            Iscrizione corsa (client)
│   │   ├── ParticipantsList.tsx      Approvazione richieste (client)
│   │   ├── ContactButton.tsx         Form messaggio all'organizzatore (client)
│   │   ├── ReviewForm.tsx            Form recensione post-corsa (client)
│   │   ├── MomentoSection.tsx        Form + lista Momenti (client)
│   │   ├── CancelRunButton.tsx       Annullamento corsa con conferma (client)
│   │   ├── ShareButton.tsx           Dropdown condivisione: copy/WhatsApp/WebShare (client)
│   │   └── ShareLanding.tsx          Layout pulito per visitatori da link condiviso
│   ├── serie/[id]/page.tsx           Dettaglio serie ricorrente
│   ├── nuova-corsa/
│   │   ├── page.tsx
│   │   └── NuovaCorsaForm.tsx        Form con geocoding live, mappa draggable, TagPicker
│   ├── nuova-corsa-spot/
│   │   ├── page.tsx                  Dark hero, forma rapida
│   │   └── SpotForm.tsx              Form minimo pre-compilato (orario = adesso+30min)
│   ├── nuova-serie/
│   │   ├── page.tsx
│   │   └── NuovaSerieForm.tsx        Form con TagPicker + generazione automatica eventi
│   ├── profilo/
│   │   ├── [id]/page.tsx             Profilo pubblico: info, momenti, recensioni
│   │   └── modifica/
│   │       ├── page.tsx
│   │       └── EditProfileForm.tsx   Upload avatar + 3 preset icone + campi profilo
│   ├── area-personale/page.tsx       Dashboard: corse, serie, iscrizioni, messaggi
│   ├── messaggi/
│   │   ├── page.tsx                  Inbox conversazioni raggruppate
│   │   └── [runId]/[otherId]/
│   │       ├── page.tsx              Thread iMessage-style
│   │       ├── ReplyForm.tsx         Barra reply sticky (client)
│   │       └── MarkReadTrigger.tsx   Segna come letti on mount (client)
│   ├── notifiche/
│   │   ├── page.tsx                  Notification center raggruppato per data
│   │   └── MarkNotificationsRead.tsx (client)
│   ├── login/page.tsx
│   ├── registrati/page.tsx           Registrazione con emailRedirectTo
│   └── api/og/corse/[id]/route.tsx   OG Image dinamica 1200×630 (ImageResponse)
│
├── components/
│   ├── Header.tsx                    Sticky header: nav, bell notifiche, dropdown utente
│   ├── Footer.tsx
│   ├── RunCard.tsx                   Card corsa: badge spot, momento, compatibilità
│   ├── SeriesCard.tsx                Card serie
│   ├── SpotRunsStrip.tsx             Striscia "Adesso" corse <3h (client, geoloc)
│   ├── ReviewCard.tsx                Card recensione (sm=griglia, md=full)
│   ├── MomentoCard.tsx               Card momento (sm=griglia, md=full)
│   ├── LocationPreviewMap.tsx        Mini-mappa form con pin draggabile (dynamic)
│   ├── RunMap.tsx                    Mappa bacheca multi-pin (dynamic, no SSR)
│   ├── RunMapWrapper.tsx             Wrapper dynamic import per RunMap
│   └── ui/
│       ├── Avatar.tsx                Initials / immagine / preset icone runner
│       ├── AvatarLightbox.tsx        Lightbox foto profilo al click (client)
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Stars.tsx                 StarsDisplay, StarsInput, RatingBadge
│       ├── TagBadge.tsx              TagBadge, TagBadgeList
│       ├── TagPicker.tsx             Picker chip toggle raggruppato per categoria (client)
│       └── Textarea.tsx
│
├── lib/
│   ├── types.ts                      Tutti i tipi TypeScript (Profile, Run, Series, ...)
│   ├── utils.ts                      cn, formatDate, formatPace, formatPaceTarget, ...
│   ├── tags.ts                       18 tag definitioni + helpers
│   ├── compatibility.ts              Algoritmo scoring compatibilità 6 componenti
│   ├── geocoding.ts                  Nominatim geocoding + fallback città italiane
│   └── supabase/
│       ├── client.ts                 createBrowserClient
│       └── server.ts                 createServerClient (con cookies)
│
└── proxy.ts                          Auth guard (Next.js 16 "proxy" convention)
```

---

## 6. Funzionalità implementate ✅

### Core MVP
- [x] Registrazione / Login / Logout con email
- [x] Conferma email con redirect corretto (`/auth/callback`)
- [x] Profilo runner: livello, ritmo, bio, Strava/Garmin/Instagram
- [x] Upload foto profilo o scelta tra 3 icone preset
- [x] Lightbox foto profilo al click
- [x] Creazione corsa singola con geocoding live + mappa draggabile
- [x] Creazione serie ricorrente con generazione automatica 8 settimane
- [x] Bacheca corse con filtri: testo, città, livello, data, tag
- [x] Vista lista e vista mappa (Leaflet, pin colorati per livello)
- [x] Filtro date: chip rapide (Oggi/Domani/Weekend/+7gg) + range personalizzato
- [x] Iscrizione corsa con messaggio opzionale
- [x] Approvazione / rifiuto richieste (organizzatore)
- [x] Area personale: corse organizzate, iscrizioni, serie, messaggi
- [x] Annullamento corsa (con notifica automatica ai partecipanti)

### Social & community
- [x] Messaggistica interna: inbox, thread iMessage-style, read receipts, realtime
- [x] Recensioni organizzatori (1-5 stelle + testo, solo post-corsa per partecipanti approvati)
- [x] Momenti post-run: foto + testo, griglia profilo, badge in card
- [x] Contatta organizzatore (prima di iscriversi)

### Discovery & engagement
- [x] Tag caratteristiche (18 tag in 5 gruppi, filtrabili in bacheca)
- [x] Compatibilità runner: badge "93% · Perfetta per te" calcolato server-side
- [x] Corse dell'ultimo momento (striscia "Adesso", geolocalizzazione, countdown live)
- [x] Form rapido corsa spot (`/nuova-corsa-spot`, 30 secondi, orario pre-compilato)

### Mappa & geolocalizzazione
- [x] Geocoding Nominatim (automatico alla creazione corsa, feedback live nel form)
- [x] Pin draggabile nel form per posizionamento preciso
- [x] Mappa bacheca con pin colorati per livello, popup con dettagli
- [x] Pin rosso per corse spot
- [x] Link "Apri su Google Maps" nel dettaglio corsa

### Condivisione
- [x] OG meta tags (titolo, descrizione, immagine) per ogni corsa
- [x] OG image dinamica 1200×630 (`/api/og/corse/[id]`)
- [x] ShareButton: copia link / WhatsApp / Web Share API nativa
- [x] Share landing pulita per visitatori non loggati (`?ref=share`)

### Notifiche
- [x] Badge notifiche realtime nell'header (campanella)
- [x] Notification center `/notifiche` raggruppato per data
- [x] Trigger automatici DB per: nuova richiesta, approvazione, rifiuto, nuovo messaggio, promemoria corsa (24h prima), corsa annullata

### UX & Design
- [x] Design system Tailwind v4: palette calda arancio/verde, Plus Jakarta Sans
- [x] Homepage con hero video (desktop) + immagine (mobile), sezioni How it works, Why different
- [x] Email template italiani per: conferma, reset password, magic link, cambio email

---

## 7. Funzionalità progettate ma NON ancora implementate 🏗️

### Tab "Gare" (progettazione completata in sessione, implementazione da fare)

**Concept:** tipologia di corsa per trovare pacer / compagni di gara su maratone, mezze, 10K.  
**Differenze chiave vs corse normali:**
- Non si "organizza" — si è entrambi iscritti a una gara di terzi
- Nessun JoinButton/ParticipantsList — solo ContactButton
- Campi specifici: nome gara, distanza (5K/10K/21K/42K), tempo obiettivo, "cerco:" (pacer/compagno/supporter)
- Accent visivo blu/indigo per distinguerle dalle corse normali

**SQL necessario:**
```sql
ALTER TABLE runs
  ADD COLUMN type text DEFAULT 'allenamento'
    CHECK (type IN ('allenamento', 'gara')),
  ADD COLUMN race_name text,
  ADD COLUMN race_distance text
    CHECK (race_distance IN ('5k','10k','21k','42k')),
  ADD COLUMN race_target_time text,
  ADD COLUMN race_registered boolean DEFAULT false,
  ADD COLUMN looking_for text[] DEFAULT '{}';
  -- looking_for values: 'pacer' | 'compagno' | 'supporter'
```

**File da creare:**
- `supabase/add-gara.sql`
- `src/components/GaraCard.tsx`
- `src/app/nuova-gara/page.tsx` + `NuovaGaraForm.tsx`
- `src/app/gare/[id]/page.tsx` (dettaglio gara, senza JoinButton)
- Update `src/app/bacheca/page.tsx` — aggiungere tab "Gare" + filtri distanza/cerco

---

## 8. Decisioni architetturali prese

| Decisione | Scelta | Motivazione |
|---|---|---|
| Tailwind config | v4 CSS-based (`@theme` in globals.css) | Next.js 16 default |
| Auth proxy | `src/proxy.ts` (non `middleware.ts`) | Next.js 16 rename |
| Geocoding | Nominatim (OSM) | Gratuito, no API key |
| Mappa | Leaflet + dynamic import (no SSR) | Open source, zero costi |
| Notifiche | DB triggers + Supabase Realtime | Affidabile, no job schedulati |
| Serie → eventi | Generazione in-app (8 settimane) | Semplice, nessun cron job |
| Profilo creation | DB trigger `handle_new_user` | Bypassa RLS post-signUp |
| OG image | `next/og` ImageResponse | Built-in, zero dipendenze |
| Compatibilità | Calcolata server-side al load | Nessuna tabella extra |
| Tags | `text[]` su `runs`/`series` con GIN index | Semplice, query con `@>` |
| Messaggi | Thread `(run_id, sender, recipient)` | Contestuale alle corse |
| Gare (design) | `type='gara'` su tabella `runs` esistente | Riuso tabella, meno JOIN |

---

## 9. Problemi noti / aree da migliorare

| Problema | Priorità | Note |
|---|---|---|
| `NuovaSerieForm` usa ancora UI vecchia | Media | Stile form con `Input`/`Select` Tailwind v3, non le sezioni card del redesign |
| Form "modifica corsa" non esiste | Media | Si può solo annullare, non editare dopo la pubblicazione |
| Corse esistenti senza coordinate | Bassa | Non appaiono sulla mappa; backfill SQL in DASHBOARD-CONFIG.md |
| `MomentoCard` aggiunto 2 volte nel profilo durante refactoring | Risolto | Era un artefatto di sessioni precedenti, ora corretto |
| Notifiche: `supabase_realtime` pubblica | Da verificare | L'ultimo statement in notifications.sql potrebbe fallire se già configurato |
| Email confirmations | Config | Disabilitare in Supabase Dashboard per dev locale |

---

## 10. Prossimi task (in ordine di priorità)

### Alta priorità
1. **Implementare tab "Gare"** — design completato (§7), SQL + componenti + pagine da costruire
2. **Merge `feat/ui-ux-redesign` → `main`** — il branch è stabile e in produzione

### Media priorità
3. **Form modifica corsa** — attualmente si può solo annullare; utile avere modifica di data/orario/luogo
4. **Backfill coordinate corse esistenti** — script SQL o pagina admin per geocodificare le corse già create
5. **Migliorare `NuovaSerieForm`** — aggiornare stile al nuovo design system (sezioni card, helper text)

### Bassa priorità / idee future
6. **Feature #4 — Badge reputazione organizzatore** (progettata, non costruita)
7. **Feature #5 — GPS condiviso durante la corsa** (progettata, non costruita)
8. **Form modifica profilo runner** — più ricco (es. distanze preferite, percorsi abituali)
9. **Push notifications** — invio email da Supabase Edge Functions per promemoria e notifiche critiche
10. **SEO ottimizzazione** — structured data JSON-LD per le corse (schema.org/Event)

---

## 11. Come avviare il progetto in locale

```bash
# Clone e installa dipendenze
git clone https://github.com/Santamicone/corriamo.git
cd corriamo
git checkout feat/ui-ux-redesign
npm install

# Configura .env.local (vedi §3)
cp .env.local.example .env.local   # oppure crea manualmente

# Avvia
npm run dev   # → http://localhost:3000

# Build di produzione (verifica prima di push)
npm run build
```

---

## 12. Deployment

- **Piattaforma:** Vercel (deploy automatico a ogni push su `main`)
- **Preview:** ogni push su branch crea un preview URL temporaneo
- **Rollback:** Vercel → Deployments → promote to production

---

## 13. Repository e risorse

| Risorsa | URL |
|---|---|
| Repository | https://github.com/Santamicone/corriamo |
| Produzione | https://www.vieniacorrere.it |
| Supabase Dashboard | https://supabase.com/dashboard/project/wshjtgtmxbxhpdqtxpiq |
| Vercel Dashboard | https://vercel.com/santamicone/corriamo |
| Prototipo UX originale | `../stitch/` (nella stessa cartella Downloads) |
