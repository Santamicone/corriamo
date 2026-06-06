## Summary

Questa PR consolida tutto lo sviluppo del branch `feat/ui-ux-redesign`.

## Funzionalità principali

### Chat di gruppo per corsa (`/corse/[id]/chat`)
- Chat real-time accessibile solo a organizzatore e partecipanti approvati
- Messaggi stile iMessage (bolle arancio/bianco), separatori data, raggruppamento per autore
- Delete su hover dei propri messaggi, scroll auto-bottom intelligente
- Card di accesso nella sidebar del dettaglio corsa

### Tab Gare + hub dedicato (`/gare`)
- Pagina hub con hero descrittivo, spiegazione 3-step, filtri, lista GaraCard
- Bacheca: tab Gare in sola lettura, tab Serie assorbito in Corse
- Form nuova corsa con selettore tipo singola/serie (nuova-serie eliminata come route separata)
- Menu: aggiunto "Cerca compagni di gara" in stile indigo

### Profilo runner arricchito
- 9 personaggi illustrati selezionabili con lightbox ingrandimento
- Età, "Perché corri?" (7 chip), Personal Best (5K/10K/21K/42K)
- Nuovi livelli: amatore_gare, atleta
- Rimosso ritmo min/max

### SEO Sprint 1
- robots.txt, sitemap.xml dinamico, favicon SVG
- generateMetadata su tutte le pagine pubbliche con canonical + OG
- noindex su 8 pagine private
- Privacy Policy (GDPR) e Termini di Servizio
- Footer con link reali

## Azioni manuali richieste (Supabase SQL Editor — nell'ordine)

1. `supabase/add-gara.sql`
2. `supabase/add-profile-fields.sql`
3. `supabase/run-chat.sql`

Poi in **Database → Replication**: abilitare `run_chat` per INSERT e DELETE (Realtime chat).

## Test plan

- [ ] SQL eseguiti sul DB
- [ ] `/nuova-corsa` selettore singola/serie funziona, serie genera appuntamenti
- [ ] `/gare` hub page visibile e filtri funzionanti
- [ ] `/corse/[id]` card chat visibile solo agli approvati
- [ ] `/corse/[id]/chat` chat real-time funzionante
- [ ] `/profilo/modifica` personaggi selezionabili con lightbox
- [ ] `/robots.txt` e `/sitemap.xml` rispondono correttamente
- [ ] `npm run build` passa (verificato in sessione)
