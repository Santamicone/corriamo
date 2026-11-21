# Vieni a correre? — bozza schede privacy e note per gli store

> **BOZZA da rivedere.** Le dichiarazioni che inserisci in App Store Connect e Google Play Console
> sono dichiarazioni del titolare del trattamento: leggi ogni riga e correggi ciò che non corrisponde
> alla realtà. Compilata il 06/11/2026 sulla base del codice dell'app mobile (`vieniacorrere-app`)
> e dello schema del database. Le righe marcate **DA DECIDERE** richiedono una tua scelta.

## 1. Inventario: cosa raccoglie davvero l'app

| Dato | Da dove nasce | Obbligatorio | Visibile ad altri utenti | Dove va |
|---|---|---|---|---|
| Email | Registrazione | Sì | No | Supabase (autenticazione) |
| Password | Registrazione | Sì | No | Supabase (solo hash, mai in chiaro) |
| Nome e cognome | Registrazione | Sì | Sì | Supabase |
| Città | Registrazione / Profilo | No | Sì | Supabase |
| Età, livello, bio, "perché corri", personal best, link Strava/Garmin/Instagram | Profilo | No | Sì (profilo) | Supabase |
| Foto profilo | Profilo (galleria del telefono) | No | Sì | Supabase Storage |
| Corse: titolo, descrizione, luogo di ritrovo, orario, **coordinate del luogo** | Creazione corsa | — | Sì (il luogo può essere riservato ai partecipanti) | Supabase; l'indirizzo scritto è inviato a **OpenStreetMap Nominatim** per ricavare le coordinate |
| Richieste di partecipazione e messaggio di presentazione | Dettaglio corsa | — | All'organizzatore | Supabase |
| Messaggi della chat di una corsa | Chat | — | Ai partecipanti approvati e all'organizzatore | Supabase |
| Segnalazioni e blocchi | Segnala / Blocca | — | Allo staff (segnalazioni); solo a te (blocchi) | Supabase; email allo staff via Resend |
| Presenza ("Sono qui", conferma della corsa) | Ritrovo | — | Ai partecipanti (conteggio) | Supabase |
| Token per le notifiche push | Permesso notifiche | No | No | Supabase; relay tramite Expo Push Service (Apple/Google) |
| Identificativo utente | Account | Sì | No | Supabase |

**Cosa l'app NON fa:** non legge la posizione GPS del telefono, non usa fotocamera né microfono, non
legge i contatti, non include SDK di analisi, pubblicità o rilevazione crash, non mostra pubblicità,
non ha acquisti. Le ricerche in Bacheca sono elaborate al momento e non vengono salvate.

Permessi richiesti all'utente: **foto** (solo per scegliere l'immagine del profilo, tramite il selettore
di sistema) e **notifiche**.

## 2. Apple — "App Privacy" (App Store Connect)

**Tracciamento ("Data used to track you"):** **Nessuno.** L'app non traccia gli utenti tra app e siti di
altre aziende, non usa pubblicità: non serve il prompt "App Tracking Transparency".

Per ogni dato qui sotto la risposta è: *raccolto*, *collegato all'identità dell'utente*, *non usato per tracciare*.

| Categoria Apple | Tipo | Dichiarare? | Finalità |
|---|---|---|---|
| Contact Info | Email Address | **Sì** | App Functionality |
| Contact Info | Name | **Sì** | App Functionality |
| Contact Info | Phone / Physical Address / Other | No | — |
| User Content | Photos or Videos | **Sì** (foto profilo) | App Functionality |
| User Content | Other User Content | **Sì** (corse, messaggi, richieste, recensioni, bio) | App Functionality |
| User Content | Customer Support | No (le email al supporto non passano dall'app) | — |
| Identifiers | User ID | **Sì** | App Functionality |
| Identifiers | Device ID | **Sì** (token push) | App Functionality |
| Location | Coarse Location | **Sì** (deciso il 21/11/2026) — vedi nota A | App Functionality |
| Location | Precise Location | No (nessun accesso al GPS) | — |
| Usage Data | Other Usage Data | **Consigliato** — i punteggi di affidabilità/presenza derivano dall'attività dell'utente | App Functionality |
| Usage Data | Product Interaction / Advertising Data | No | — |
| Health & Fitness | Fitness | **Sì, facoltativo** (deciso il 21/11/2026) — vedi nota B | App Functionality |
| Diagnostics | Crash / Performance / Other | No (nessun SDK) | — |
| Sensitive Info, Financial Info, Contacts, Browsing History, Search History, Purchases | — | No | — |

**Nota A (città e luoghi).** La città del profilo e il luogo di ritrovo sono scritti dall'utente, non
letti dal telefono. Sono comunque informazioni geografiche mostrate ad altri: la scelta prudente è
dichiarare **Coarse Location**, collegata all'utente, per App Functionality.

**Nota B (Strava).** Il collegamento con Strava (distanza, passo, frequenza cardiaca) oggi si fa dal
**sito**, non dall'app. Se in futuro l'app lo offrirà, o se vuoi essere cautelativo perché lo stesso
account contiene quei dati, dichiara **Fitness** come dato *facoltativo*.

**Nota C (email di riepilogo).** Il digest settimanale delle corse vicine è una comunicazione del
servizio con disattivazione dalle preferenze. Se lo consideri promozionale, aggiungi per *Email
Address* anche la finalità **Developer's Advertising or Marketing**. **Deciso il 21/11/2026: lo
trattiamo come comunicazione di servizio, NON marketing** (nessuna finalità aggiuntiva).

**Eliminazione dati:** l'utente può eliminare account e dati **dall'app** (Profilo → Elimina account) e
dalla pagina `https://app.vieniacorrere.it/elimina-account`.

## 3. Google Play — "Data safety"

| Sezione Play | Tipo | Raccolto | Condiviso con terzi | Facoltativo | Finalità |
|---|---|---|---|---|---|
| Personal info | Name | Sì | No | No | Funzionalità dell'app, gestione account |
| Personal info | Email address | Sì | No | No | Funzionalità dell'app, gestione account |
| Personal info | Altro (età, bio) | Sì | No | Sì | Funzionalità dell'app |
| Location | Approximate location | **Sì** (deciso il 21/11/2026, nota A) | No | Sì | Funzionalità dell'app |
| Photos and videos | Photos | Sì | No | Sì | Funzionalità dell'app |
| Messages | Other in-app messages | Sì | No | No | Funzionalità dell'app |
| App activity | Other user-generated content | Sì | No | No | Funzionalità dell'app |
| Device or other IDs | Device or other IDs | Sì (token push) | No | Sì | Funzionalità dell'app |
| Health and fitness | Fitness info | **Sì, facoltativo** (deciso il 21/11/2026, nota B) | No | Sì | Funzionalità dell'app |

- **"Condiviso"**: *No*. Supabase, Expo, Resend e Vercel agiscono come fornitori per tuo conto e, per le regole di Google, non contano come condivisione. OpenStreetMap Nominatim riceve solo l'indirizzo dei luoghi di ritrovo scritto dall'utente.
- **Dati cifrati in transito**: *Sì* (HTTPS).
- **Gli utenti possono chiedere la cancellazione**: *Sì*. URL richiesto da Google: `https://app.vieniacorrere.it/elimina-account`.
- **Pubblicità, acquisti, SDK di terzi di analisi**: nessuno.

## 4. Questionari su età e contenuti degli utenti

- Contenuti generati dagli utenti: **sì** (corse, descrizioni, messaggi, foto profilo).
- Chat/messaggi tra utenti: **sì**.
- Moderazione presente: **sì** — segnalazione di corse e messaggi, blocco utenti, sospensione/ban da parte dello staff, eliminazione dei contenuti segnalati, contatto di supporto `info@vieniacorrere.it`.
- La fascia d'età la calcola il questionario di Apple/Google: con messaggi tra utenti, aspettati una fascia **12+/13+ o superiore**.
- Acquisti in-app: **nessuno**. Accesso web non filtrato: **no**. Gioco d'azzardo, armi, alcol/tabacco, contenuti sessuali: **no**.

## 5. Indirizzi da inserire nelle schede

| Campo | Valore |
|---|---|
| Privacy Policy URL | `https://app.vieniacorrere.it/privacy` |
| Termini | `https://app.vieniacorrere.it/termini` |
| Eliminazione account (Google Play) | `https://app.vieniacorrere.it/elimina-account` (**da pubblicare**: pagina pronta in `src/app/elimina-account/`) |
| Support URL / contatto | `info@vieniacorrere.it` (oppure `https://www.vieniacorrere.it`) |
| Marketing URL | `https://www.vieniacorrere.it` |

## 6. Note per i revisori Apple (da incollare in "App Review Information")

> Vieni a correre? è una community di runner: si propongono corse, si chiede di partecipare e si
> chatta con il gruppo di una corsa. Per usarla serve un account (email e password); allego un
> account di prova.
>
> **Account di prova:** `<EMAIL DEMO>` / `<PASSWORD DEMO>`
>
> **Contenuti degli utenti — come li gestiamo:**
> - *Segnalare*: nel dettaglio di una corsa "Segnala questa corsa"; nella chat, pressione lunga su un messaggio altrui → "Segnala messaggio". Le segnalazioni arrivano via email al nostro staff e si gestiscono entro 24 ore dalla sezione amministrazione.
> - *Bloccare*: "Blocca l'organizzatore" nel dettaglio corsa, o pressione lunga su un messaggio → "Blocca". L'elenco è in Profilo → Utenti bloccati.
> - *Eliminare l'account*: Profilo → Elimina account (richiede la password).
> - I Termini vietano contenuti offensivi, discriminatori o illeciti; lo staff può sospendere o bannare gli account.
> - Supporto: info@vieniacorrere.it.
>
> **Permessi:** foto (solo per scegliere l'immagine del profilo, con il selettore di sistema) e notifiche. L'app non usa la posizione del dispositivo, non ha acquisti né pubblicità.

**Da preparare:** un account demo con qualche corsa e un messaggio d'esempio, così il revisore vede chat, segnalazione e blocco senza dover creare nulla.

## 7. Cose da allineare nelle pagine legali del sito

**Privacy Policy** (`src/app/privacy/page.tsx`, ultimo aggiornamento "giugno 2026"):
- Elenco dati: aggiungere i **token per le notifiche push**, le **coordinate dei luoghi di ritrovo** e i dati di **segnalazioni e blocchi**.
- Sub-responsabili: oggi solo Supabase e Vercel. Aggiungere **Expo** (relay delle push), **Resend** (email), **OpenStreetMap Nominatim** (ricerca indirizzi) e, per chi la usa, **Strava**.
- Sezione 5/7: citare che l'account si elimina **anche dall'app** (Profilo → Elimina account) e dalla pagina `/elimina-account`.
- Sezione 3: parla di "analisi aggregata dell'utilizzo": se non c'è alcuno strumento di analisi, conviene chiarirlo o toglierla, per coerenza con la scheda privacy.
- **Età minima**: né la Privacy né i Termini indicano un'età minima per registrarsi. Gli store la chiedono: fai valutare quale indicare (per il consenso digitale in Italia la soglia è 14 anni).

**Termini** (`src/app/termini/page.tsx`):
- La sezione 6 dice che l'account si cancella "dalla pagina del profilo" del sito: **sul sito questa funzione non esiste** (oggi c'è solo nell'app). Aggiungere il pulsante sul sito, oppure correggere la frase.
- Rendere esplicito il divieto di contenuti offensivi (c'è alla sezione 4) e il meccanismo di segnalazione, blocco e sospensione.

## 8. Stato di preparazione alla pubblicazione

| Voce | Stato |
|---|---|
| Eliminazione account in app | Codice pronto · funzione `delete-account` **da pubblicare** |
| Segnala / Blocca in app | Codice pronto · SQL #42 **da applicare** |
| Avviso email allo staff | Codice pronto · `notify-report`, SQL #43 e `STAFF_ALERT_EMAIL` **da fare** |
| Permessi inutilizzati (Android: fotocamera, microfono, archiviazione; iOS: Face ID) | **Rimossi** da `app.json` · efficace dalla prossima build |
| Pagina `/elimina-account` | Pronta in `corriamo` · **da pubblicare** su Vercel |
| Account demo per i revisori | **Da creare** |
| Aggiornamento Privacy e Termini | **Scritto il 21/11/2026** in `src/app/privacy` e `src/app/termini` (età minima **14 anni**, push, coordinate, segnalazioni/blocchi, Strava, sub-responsabili Expo/Resend/Nominatim/Strava, eliminazione dall'app, tolta l'"analisi aggregata"; sezione 6 dei Termini corretta). **Va online col push su `main`**; le frasi legali vanno fatte leggere a chi segue la parte legale |
| Push: `aps-environment` in produzione | **Da verificare** nella prima build di produzione (oggi `development`) |
| Android: Firebase / FCM, `google-services.json` | **Da fare** |
| Screenshot, descrizione, parole chiave | **Da preparare** |
