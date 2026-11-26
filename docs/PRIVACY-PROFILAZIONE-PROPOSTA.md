# Privacy: proposta per la frase "non profiliamo gli utenti"

**Stato:** bozza da sottoporre alla verifica legale (26/11/2026). Non pubblicata: la pagina `/privacy`
(`src/app/privacy/page.tsx`, sezione 3, ultima riga) dice ancora la frase originale.

## Il problema

La sezione 3 dell'informativa chiude con: *"Non utilizziamo strumenti di analisi del comportamento né
pubblicità, e non profiliamo gli utenti."*

La prima parte è vera. La seconda, detta così in assoluto, è **difficile da difendere**, perché il sito
calcola in automatico alcuni punteggi sulle persone a partire dai loro dati:

| Funzione | Dove | Cosa calcola | Con quali dati |
|---|---|---|---|
| Compatibilità con una corsa | `src/lib/compatibility.ts` (scheda corsa, bacheca) | Punteggio 0–100 ed etichetta ("Perfetta per te", "Molto compatibile") | Livello, ritmo, città e storico delle corse a cui hai partecipato |
| Compagni di corsa | `src/lib/matchmaking.ts`, `/compagni` | Punteggio di sintonia tra due profili, con i "motivi" del match | Livello, ritmo, città, motivazioni per cui corri (`why_i_run`) |
| Badge di affidabilità degli organizzatori | `src/lib/reliability.ts`, funzione SQL `update_reliability_score` | Percentuale di corse organizzate effettivamente svolte e badge "Affidabile" / "Organizzatore" | Check-in dell'organizzatore, conferme dei partecipanti, recensioni, presenza di partecipanti approvati |
| Riepilogo settimanale | email settimanale | Selezione delle corse vicine | Città del profilo |

Il GDPR (art. 4, punto 4) definisce **profilazione** qualsiasi trattamento automatizzato che valuti aspetti
personali (preferenze, interessi, affidabilità, comportamento). I primi tre rientrano plausibilmente in
questa definizione. Non producono effetti giuridici né incidono in modo analogo sulla persona (quindi
non scatta il divieto dell'art. 22), ma l'informativa deve **descriverli** (art. 13, par. 2, lett. f) e
non può negarli. Affermare "non profiliamo" rischia di rendere l'informativa inesatta.

## Proposta di testo

### Opzione A (consigliata): togliere la negazione e descrivere

Sostituire l'ultima riga della sezione 3 con:

> Non utilizziamo strumenti di analisi del comportamento né pubblicità. Usiamo però alcuni calcoli
> automatici, limitati al funzionamento del servizio, che non producono decisioni con effetti giuridici
> su di te:
>
> - **Compatibilità**: confrontiamo il livello, il ritmo, la città e le corse a cui hai partecipato con le
>   caratteristiche delle corse e degli altri profili, per mostrarti un punteggio di compatibilità e
>   suggerirti corse e compagni di corsa adatti.
> - **Affidabilità di chi organizza**: calcoliamo la percentuale di corse organizzate che risultano
>   effettivamente svolte (in base a check-in, conferme dei partecipanti e recensioni) e mostriamo un'etichetta ("Organizzatore", "Affidabile") sul profilo.
>
> Questi calcoli si basano sui dati del profilo e sull'attività sulla piattaforma. Non vengono venduti né
> ceduti a terzi e non servono a fini pubblicitari. Puoi lasciare vuoti i campi facoltativi del profilo
> (così il calcolo si basa su meno dati) oppure chiederci di non mostrare il tuo profilo nei suggerimenti
> scrivendo a info@vieniacorrere.it.

Da verificare con il legale: la base giuridica (esecuzione del contratto per la compatibilità; legittimo
interesse per l'affidabilità, che può richiedere una breve valutazione), e se l'ultima frase (opposizione
ai suggerimenti) è un impegno che vogliamo prenderci davvero: oggi **non esiste** un'impostazione per
uscire dai suggerimenti, andrebbe gestita a mano o aggiunta al prodotto.

### Opzione B (minima): attenuare la frase

> Non utilizziamo strumenti di analisi del comportamento né pubblicità, e non facciamo profilazione a
> fini commerciali o pubblicitari. I punteggi di compatibilità e di affidabilità mostrati nell'app sono
> calcolati in automatico dai dati del profilo e dall'attività sulla piattaforma, solo per il
> funzionamento del servizio.

Più breve, ma meno completa: non nomina quali dati entrano nel calcolo (art. 13 richiede informazioni
significative sulla logica).

## Cose da allineare se si cambia il testo

- **Sezione 2 (dati raccolti)**: citare che livello, ritmo, motivazioni e storico delle partecipazioni
  alimentano i suggerimenti. Oggi sono elencati come "dati di profilo (facoltativi)".
- **Base giuridica (sezione 4)**: oggi dice contratto, legittimo interesse per la sicurezza e consenso per i
  dati facoltativi. Valutare se aggiungere il legittimo interesse per l'affidabilità.
- **App Store / Google Play**: `docs/APP-STORE-PRIVACY.md` dichiara cosa si raccoglie e se i dati sono
  "usati per tracciare". I punteggi sono interni e non servono a tracciare tra app e siti di terzi, ma
  la scheda va riletta insieme al testo definitivo.
- **Registro dei trattamenti**, se tenuto, con le due finalità aggiunte.

## Cosa NON è profilazione (per chiarezza con il legale)

- Le notifiche di corsa, i promemoria e le email di servizio.
- Le statistiche aggregate della crew (conteggi per periodo, visibili ai membri; il dettaglio per
  membro è solo per i gestori e riguarda presenze alle corse della crew).
- Le segnalazioni e i blocchi.

## Prossimo passo

Dopo il parere, mi dici quale opzione (o quale testo) pubblicare e aggiorno `src/app/privacy/page.tsx`,
con data di ultimo aggiornamento. Se vuoi l'opposizione ai suggerimenti come funzione reale, è un lavoro
a parte: una colonna sul profilo e l'esclusione nelle liste di compatibilità e compagni.
