@AGENTS.md

# Vieni a correre? — Istruzioni di progetto

**Leggi sempre `PROJECT_STATUS.md` all'inizio di ogni sessione** per ripristinare il contesto completo. Contiene schema DB, struttura file, decisioni architetturali e prossimi task.

## Riferimenti rapidi

- **App in produzione:** https://app.vieniacorrere.it
- **Sito editoriale (magazine):** https://www.vieniacorrere.it
- **Branch attivo:** `feat/ui-ux-redesign` (tutto lo sviluppo avviene qui)
- **Stack:** Next.js 16.2.7 App Router · TypeScript · Tailwind v4 · Supabase · Vercel

## Convenzioni obbligatorie

- **Fuso orario:** usare sempre `parseRunDateTime(date, time)` da `@/lib/utils` — mai `new Date(`${date}T${time}`)` direttamente. Il server Vercel è UTC, le corse sono in ora italiana (Europe/Rome).
- **Auth proxy:** il file si chiama `src/proxy.ts`, non `middleware.ts` (rename Next.js 16).
- **Tailwind v4:** configurazione in `globals.css` con `@theme`, non in `tailwind.config.ts`.
- **Serie:** la route `/nuova-serie` è un redirect — la creazione serie avviene in `/nuova-corsa` con selettore tipo.
- **DB Realtime:** aggiungere sempre `ALTER PUBLICATION supabase_realtime ADD TABLE public.nome;` per nuove tabelle che usano Realtime.

## Prima di ogni PR

1. `npm run build` deve passare senza errori TypeScript
2. Testare su mobile (Chrome + Safari)
3. Se ci sono modifiche al DB: documentare il file SQL e aggiornare `PROJECT_STATUS.md`
