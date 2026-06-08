# PROJECT_STATUS.md — Vieni a correre?

> Documento di stato del progetto per il ripristino del contesto in una nuova sessione Claude Code.  
> Aggiornato al: **giugno 2026** — ultima sessione: sistema affidabilità organizzatori

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
| 18 | `supabase/reliability.sql` | ⏳ DA ESEGUIRE | Tabella `run_confirmations` + colonne `reliability_*` su `profiles` + funzione score + 4 trigger |
| 19 | `supabase/crews.sql` | ⏳ DA ESEGUIRE | Tabelle `crews` + `crew_members` + RLS + 4 trigger + colonne `crew_id`, `run_visibility` su `runs` |
| 20 | `supabase/crew-invites.sql` | ⏳ DA ESEGUIRE | Tabella `crew_invites` + RLS |

### Schema tabelle aggiornato

```
profiles         id, full_name, city, level, pace_min, pace_max, bio,
                 strava_url, garmin_url, instagram_url, avatar_url,
                 age, why_i_run text[], pb_5k, pb_10k, pb_21k, pb_42k,
                 filter_by_city boolean,
                 reliability_score numeric(5,2), reliability_eligible numeric(5,2),
                 reliability_confirmed numeric(5,2)

runs             id, organizer_id, series_id, title, description, date, time,
                 location, city, lat, lng, distance_km, pace_target, level,
                 max_participants, status, is_no_drop, is_spot, tags text[],
                 type (allenamento|gara), race_name, race_distance (5k|10k|21k|42k),
                 race_target_time, race_registered, looking_for text[],
                 location_public boolean

series           id, organizer_id, title, description, location, city,
                 recurrence_type, recurrence_day, recurrence_time, start_date,
                 distance_km, pace_target, level, max_participants, is_no_drop, tags text[]

participations   id, run_id, user_id, status (in_attesa|approvata|rifiutata), message

interests        id, run_id, user_id, created_at — UNIQUE(run_id, user_id)

messages         id, run_id, sender_id, recipient_id, body, read_at

reviews          id, run_id, reviewer_id, reviewed_id, rating (1-5), body,
                 UNIQUE(run_id, reviewer_id)

notifications    id, user_id, type, title, body, run_id, actor_id, read, show_after

momenti          id, run_id, author_id, photo_url, body, UNIQUE(run_id, author_id)

run_chat         id, run_id, author_id, body, created_at

check_ins        id, run_id, user_id, checked_in_at, UNIQUE(run_id, user_id)

run_confirmations id, run_id, user_id, confirmed boolean, created_at,
                  UNIQUE(run_id, user_id)

crews            id, name, description, avatar_url, owner_id,
                 crew_type (training_group|running_club|friends),
                 visibility (public|private), whatsapp_group_link, created_at

crew_members     id, crew_id, user_id, role (owner|admin|member),
                 status (active|pending|rejected), joined_at,
                 UNIQUE(crew_id, user_id)

crew_invites     id, crew_id, invited_by, token uuid, max_uses, use_count,
                 expires_at, created_at

runs             + crew_id → crews.id (nullable)
                 + run_visibility (public|crew_only|invite_only) default 'public'
```

### Storage bucket
- `avatars` — foto profilo utente
- `momenti` — foto post-run

### Configurazione Dashboard Supabase (manuale)
- **Authentication → URL Configuration:** Site URL = `https://vieniacorrere.it`
- **Database → Replication (via SQL):** Abilitare Realtime con:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.run_chat;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.run_confirmations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
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
│   ├── come-funziona/page.tsx        Guida funzionalità (6 sezioni incl. Purple Screen)
│   ├── privacy/page.tsx              Privacy Policy GDPR
│   ├── termini/page.tsx              Termini di Servizio
│   ├── auth/callback/route.ts
│   ├── bacheca/page.tsx              2 tab: Corse (singole+serie) | Gare
│   ├── corse/[id]/
│   │   ├── page.tsx                  Dettaglio + OG + "Sono qui" button in sidebar
│   │   ├── JoinButton.tsx            "Mi interessa" + "Partecipa" (due flussi)
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
│   ├── profilo/
│   │   ├── [id]/page.tsx             Profilo: età, perché corri, PB, momenti, recensioni
│   │   └── modifica/
│   │       ├── page.tsx
│   │       └── EditProfileForm.tsx   Avatar (9 personaggi+lightbox), età, PB, perché corri,
│   │                                 filtro città automatico
│   ├── area-personale/page.tsx
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
│   ├── registrati/page.tsx
│   └── api/og/corse/[id]/route.tsx
│
├── components/
│   ├── Header.tsx                    Mobile overlay menu (mobileOpen/userOpen separati)
│   ├── Footer.tsx                    Link reali: Privacy, Termini, Contatti
│   ├── RunCard.tsx                   Badge interessi, luogo privato, compatibilità
│   ├── GaraCard.tsx                  Card gara con accent indigo
│   ├── SeriesCard.tsx
│   ├── SpotRunsStrip.tsx             parseRunDateTime per fuso orario corretto
│   ├── ReviewCard.tsx
│   ├── MomentoCard.tsx
│   ├── LocationPreviewMap.tsx
│   ├── RunMap.tsx                    Pin grigio tratteggiato per luogo privato
│   ├── RunMapWrapper.tsx
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
│   ├── types.ts                      Profile (nuovi campi + reliability_*), Run (gara, location_public...),
│   │                                 Interest, CheckIn, RunChatMessage, RunConfirmation, ProfileLevel
│   ├── utils.ts                      + parseRunDateTime (fuso Europe/Rome)
│   │                                 + runRitrovoColor (Purple Screen)
│   ├── tags.ts
│   ├── compatibility.ts              Supporto nuovi livelli profilo (amatore_gare, atleta)
│   ├── geocoding.ts
│   ├── reliability.ts                getReliabilityBadge() → 'affidabile' | 'organizzatore' | null
│   └── supabase/
│       ├── client.ts
│       └── server.ts
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
- ⏳ **`supabase/reliability.sql` ancora da eseguire su Supabase**

### SEO (Sprint 1 completato)
- [x] robots.txt, sitemap.xml dinamico, favicon SVG
- [x] generateMetadata su tutte le pagine pubbliche (canonical, OG, Twitter card)
- [x] noindex su tutte le pagine private
- [x] OG image dinamica per ogni corsa
- [x] Privacy Policy e Termini di Servizio

### UX
- [x] Design system Tailwind v4: palette arancio/verde, Plus Jakarta Sans
- [x] Homepage: hero video/img + "Perché Vieni a correre?" con foto fondatori
- [x] Pagina "Come funziona" con 6 sezioni inclusa Purple Screen
- [x] Menu mobile: overlay full-height, no voci duplicate, nessun overlap
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

---

## 8. Problemi noti / aree da migliorare

| Problema | Priorità | Note |
|---|---|---|
| **`supabase/reliability.sql` da eseguire** | **Alta** | Senza questo le colonne `reliability_*` non esistono in produzione |
| Form "modifica corsa" non esiste | Media | Si può solo annullare, non editare dopo la pubblicazione |
| Corse esistenti senza coordinate | Bassa | Non appaiono sulla mappa; backfill SQL in DASHBOARD-CONFIG.md |
| SEO Sprint 2 non ancora fatto | Media | Schema.org JSON-LD (Event, Person, WebSite) |
| Push notifications via email | Bassa | Supabase Edge Functions per promemoria critici |

---

## 9. Prossimi task (in ordine di priorità)

### Urgente (pre-merge)
1. **Eseguire `supabase/reliability.sql`** su Supabase Dashboard → SQL Editor

### Alta priorità
2. **Merge `feat/ui-ux-redesign` → `main`** — il branch è stabile e gira in produzione

### Media priorità
3. **Form modifica corsa** — data/orario/luogo modificabili dopo la pubblicazione
4. **SEO Sprint 2** — Schema.org JSON-LD: Event su corse, Person su profili, WebSite su homepage
5. **SEO Sprint 3** — Migrazione a `next/font`, ottimizzazione keyword, OG image per bacheca

### Bassa priorità / idee future
6. **GPS condiviso durante la corsa** — tracker posizione in tempo reale per il gruppo
7. **Push notifications** — invio email da Supabase Edge Functions
8. **Backfill coordinate corse esistenti** — geocodificare le corse create prima della mappa

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
