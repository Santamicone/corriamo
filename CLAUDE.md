@AGENTS.md

# Vieni a correre? — Istruzioni di progetto

**Leggi sempre `PROJECT_STATUS.md` all'inizio di ogni sessione** per ripristinare il contesto completo. Contiene schema DB, struttura file, decisioni architetturali e prossimi task.

## Riferimenti rapidi

- **App in produzione:** https://app.vieniacorrere.it
- **Sito editoriale (magazine):** https://www.vieniacorrere.it
- **Branch attivo:** `main`. **Workflow: push diretto su `main`** (deciso il 23/08/2026 — non più feature branch + PR, salvo diversa indicazione esplicita).
- **Stack:** Next.js 16.2.7 App Router · TypeScript · Tailwind v4 · Supabase · Vercel
- **Calendario gare:** doc completa in `docs/CALENDARIO-GARE.md` (catalogo `races`, import `npm run import:aims` + `npm run seed:circuits`, moderazione).
- **Mappa crew:** spec e stato in `docs/MAPPA-CREW.md`. Fasi 1, 2a-1 e 2a-2 fatte e applicate (SQL #49–#51: mappa, schede informative + admin `/admin/crew`, "Avvisami" + `crews_discover`); app 1.1.0 con mappa inviata ad Apple il 22/11/2026. **Sospesi:** rivendicazione, suggerimenti di modifica, area gestori, verifica (SQL #52 in poi).
- **Integrazione Strava:** RIMOSSA il 21/11/2026 (policy API Strava): vedi `docs/STRAVA.md` per motivi e procedura di chiusura. Non reintrodurre dati Strava visibili ad altri utenti.

## Convenzioni obbligatorie

- **Fuso orario:** usare sempre `parseRunDateTime(date, time)` da `@/lib/utils` — mai `new Date(`${date}T${time}`)` direttamente. Il server Vercel è UTC, le corse sono in ora italiana (Europe/Rome).
- **Auth proxy:** il file si chiama `src/proxy.ts`, non `middleware.ts` (rename Next.js 16).
- **Tailwind v4:** configurazione in `globals.css` con `@theme`, non in `tailwind.config.ts`.
- **Serie:** la route `/nuova-serie` è un redirect — la creazione serie avviene in `/nuova-corsa` con selettore tipo.
- **DB Realtime:** aggiungere sempre `ALTER PUBLICATION supabase_realtime ADD TABLE public.nome;` per nuove tabelle che usano Realtime.

## Prima di ogni push su main

1. `npm run build` deve passare senza errori TypeScript
2. Testare su mobile (Chrome + Safari)
3. Se ci sono modifiche al DB: documentare il file SQL e aggiornare `PROJECT_STATUS.md`
