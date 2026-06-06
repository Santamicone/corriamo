## Summary

- Aggiunge un **terzo tab "Gare"** in bacheca per trovare runner cercando compagni su gare già esistenti (maratone, mezze, 10K, 5K)
- Nuovo form `nuova-gara` e pagina dettaglio `gare/[id]` con UX dedicata (accent indigo, no JoinButton)
- Filtri distanza (5K/10K/Mezza/Maratona) e "cerco" (pacer/compagno/supporter) nella bacheca

## Cosa è cambiato

### Nuovo
- `supabase/add-gara.sql` — 6 colonne su `runs` (type, race_name, race_distance, race_target_time, race_registered, looking_for) + 2 indici
- `src/components/GaraCard.tsx` — card con accent indigo, badge distanza, chip looking_for
- `src/app/nuova-gara/` — form dedicato: nome gara, distanza, città, data, obiettivo, looking_for (multi-check), note
- `src/app/gare/[id]/page.tsx` — dettaglio gara: solo ContactButton (no JoinButton, no ParticipantsList, no ReviewForm)

### Modificato
- `src/app/bacheca/page.tsx` — terzo tab, query separata con filtro type='gara', filtri distanza/cerco, EmptyState aggiornato
- `src/lib/types.ts` — RunType, RaceDistance, campi gara opzionali su Run
- `src/proxy.ts` — nuova-gara aggiunto alle route protette

## Azione manuale richiesta prima del deploy

Eseguire `supabase/add-gara.sql` nel **Supabase Dashboard → SQL Editor** per aggiungere le colonne al DB di produzione.

## Test plan

- [ ] Eseguire `supabase/add-gara.sql` sul DB
- [ ] `nuova-gara` — form compila e salva correttamente, title auto-generato
- [ ] `bacheca?tab=gare` — tab visibile, filtri distanza e cerco funzionanti
- [ ] `gare/[id]` — dettaglio si apre, ContactButton presente, JoinButton assente
- [ ] `npm run build` passa (già verificato in sessione)

Generated with [Claude Code](https://claude.com/claude-code)
