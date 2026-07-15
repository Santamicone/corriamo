# Gamification dell'impatto sociale — Community Impact Score

> **Documento di design.** Definisce modello dati, formula, regole anti-gaming,
> badge/livelli, UI e piano di rilascio. Va letto insieme a `PROJECT_STATUS.md`
> (schema DB) e a `docs/STRAVA.md` (auto-conferma presenze, da cui questo sistema
> eredita i segnali verificati).
>
> **Stato implementazione.** La **Fase 1** (§7, "Runner ispirati") è realizzata in
> variante *"RPC al volo"*: le funzioni `crew_impact_stats` / `user_impact_stats`
> in `supabase/community-impact.sql` calcolano i contatori a load pagina dai
> segnali verificati esistenti, **senza** ancora le colonne materializzate `ci_*`
> né i trigger di §3.2/§9 (che restano per la Fase 2). La UI è il componente
> `src/components/ImpactCard.tsx`, montato su pagina crew e profilo.

## 1. Idea e posizionamento

Quasi tutte le app per runner premiano **quanto corri** (Strava → performance)
o **dove corri** (INTVL → territorio). *Vieni a correre?* misura una terza cosa,
oggi scoperta dal mercato: **quante persone riesci a far correre insieme.**

La domanda non è «quanti km hai fatto?» ma **«quante persone hai fatto uscire di
casa?»**. Non vince chi corre di più, ma chi **crea occasioni di incontro**.

**Perché è difendibile.** Un sistema del genere è credibile solo se i numeri non
si possono gonfiare a piacere. Qui abbiamo un vantaggio strutturale: l'app
**verifica già le presenze** con segnali passivi (check-in Purple Screen,
`run_confirmations`, match automatico con Strava) e calcola già `reliability_score`
e `attendance_score` da quei segnali. Non partiamo da autodichiarazioni. Un
competitor dovrebbe prima costruire quell'infrastruttura di verifica; noi la
riusiamo.

**Rischio di prodotto da tenere presente.** Un sistema così può far sentire
escluso chi organizza *tanto ma per un piccolo gruppo affiatato*. La correzione è
dare peso al **ritorno degli abituali**, non solo al volume di persone nuove:
tenere le persone che corrono è impatto quanto attirarne di nuove.

---

## 2. Principio di misura

Ogni componente del punteggio deve rispettare tre invarianti:

1. **Verificato, non dichiarato.** Un'uscita conta solo se è *avvenuta davvero*
   (stessa nozione di "eligible" della reliability: partecipanti approvati +
   corsa non annullata + passata da ≥24h + almeno un segnale di svolgimento).
   Un partecipante conta solo se **confermato** (`run_confirmations.confirmed`
   o check-in), non se semplicemente "approvato".
2. **Persone, non transazioni.** 20 persone diverse una volta sola ≪ 5 persone
   tornate 4 volte. Il *ritorno* e la *diversità* pesano più del volume grezzo.
3. **A maturazione ritardata dove serve.** I bonus che invitano al gaming (nuovo
   utente, mentor) non maturano all'iscrizione ma alla **permanenza** (es. ancora
   attivo a 30 giorni).

---

## 3. Modello dati

### 3.1 Segnali già presenti (nessuna nuova scrittura)

La maggior parte del sistema si calcola da tabelle esistenti:

| Segnale | Sorgente attuale |
|---|---|
| Eventi organizzati | `runs.organizer_id` (esclusi `status='annullata'`) |
| Partecipanti | `participations` (`status='approvata'`) |
| **Partecipante confermato** (verificato) | `run_confirmations.confirmed = true` o `check_ins` — già usati per reliability/attendance |
| Evento senza cancellazioni | `runs.status` + `reliability_score` |
| Corsa spot (peso 0.5) | `runs.is_spot` |
| Auto-conferma da Strava | `run_confirmations.source='strava'` (SQL #32, vedi `docs/STRAVA.md`) |
| Varietà luoghi/orari | `runs.lat/lng`, `runs.time` |

### 3.2 Cosa manca e va aggiunto

Due soli segnali non esistono ancora in forma persistente:

**a) Legame mentor (chi ha portato chi).** Oggi `crew_invites` traccia
`invited_by` e `use_count`, ma per l'**invito a una crew**, e non lascia una riga
permanente "l'utente X è arrivato sulla piattaforma grazie a Y". Serve una
tabella dedicata al referral a livello di *piattaforma*.

**b) "Nuovo runner alla prima uscita."** È ricavabile (prima riga `confirmed` in
assoluto per un `user_id`), ma per performance e per il timing del bonus conviene
materializzarlo.

#### Nuova tabella `referrals`

```
referrals   id            uuid PK
            referrer_id   uuid → profiles(id)   -- il "mentor"
            referred_id   uuid → profiles(id)   -- il nuovo utente, UNIQUE
            source        text   -- 'crew_invite' | 'invite_link' | 'manual'
            created_at    timestamptz
            -- stati a maturazione ritardata (aggiornati da trigger/job):
            first_run_at  timestamptz  -- prima corsa confermata dell'invitato
            retained_at   timestamptz  -- confermato attivo a 30gg
            became_org_at timestamptz  -- l'invitato è diventato organizzatore
```

- **`UNIQUE(referred_id)`**: ogni utente ha **al più un** mentor (il primo che lo
  porta). Evita che più persone si attribuiscano lo stesso invitato.
- **Niente auto-referral**: `CHECK (referrer_id <> referred_id)`.
- Popolata al momento dell'accettazione invito / registrazione via link
  (`source`), con service-role (come per gli altri flussi sensibili). Vedi §6.

#### Colonne materializzate su `profiles`

Stesso pattern di `reliability_*` / `attendance_*` (colonne pre-calcolate,
aggiornate da trigger, `NULL` finché sotto soglia):

```
profiles  + community_score          numeric(6,2)   -- Community Impact Score (0–100), NULL < soglia
          + ci_events_verified       integer NOT NULL DEFAULT 0   -- eventi realizzati e verificati
          + ci_participations        integer NOT NULL DEFAULT 0   -- partecipazioni confermate generate
          + ci_distinct_people       integer NOT NULL DEFAULT 0   -- persone diverse coinvolte
          + ci_returning_people      integer NOT NULL DEFAULT 0   -- persone tornate ≥2 volte
          + ci_activated_newcomers   integer NOT NULL DEFAULT 0   -- prime uscite in assoluto ai propri eventi
          + ci_mentored_active       integer NOT NULL DEFAULT 0   -- invitati ancora attivi a 30gg
          + ci_reactivated           integer NOT NULL DEFAULT 0   -- riportati dopo >30gg di inattività
```

I contatori grezzi (`ci_*`) alimentano sia lo score sia la card "Runner ispirati"
(§7), che li mostra così come sono senza ricalcolo.

> **DB Realtime:** `referrals` **non** va aggiunta a `supabase_realtime` (nessun
> aggiornamento live in UI). Le colonne su `profiles` si leggono a load pagina.

---

## 4. Community Impact Score (CIS)

Un unico numero 0–100, materializzato in `profiles.community_score`, ricalcolato
dai trigger. `NULL` finché l'utente non ha **almeno 2 eventi verificati** (come la
reliability nasconde lo score sotto le 3 corse: evita numeri instabili su
campioni minuscoli).

### 4.1 Filosofia della formula

Non è una somma di punti "a gettone" — quella si rompe subito (creo eventi
fantasma, mi auto-invito con account finti, +200). È un **indice composito** con:

- **rendimenti decrescenti** sul volume (la 50ª partecipazione vale meno della 5ª);
- **peso maggiore** su diversità e ritorno rispetto al volume grezzo;
- un **fattore di affidabilità** che penalizza le cancellazioni (riusa
  `reliability_score`).

### 4.2 Componenti (indicativi, da tarare sui dati reali)

Ogni componente è normalizzato con una curva a saturazione
(`f(x) = x / (x + k)`, cresce e si appiattisce) così che nessuno domini per solo
volume:

| Componente | Peso | Note |
|---|---|---|
| **Persone diverse coinvolte** (`ci_distinct_people`) | 25 | il cuore: ampiezza della rete |
| **Persone tornate** (`ci_returning_people`) | 25 | il ritorno vale quanto la novità (anti-esclusione dei piccoli gruppi) |
| **Newcomer attivati** (`ci_activated_newcomers`) | 20 | prime uscite in assoluto, maturate (§2.3) |
| **Invitati mentor attivi a 30gg** (`ci_mentored_active`) | 15 | dalla tabella `referrals`, a maturazione ritardata |
| **Riattivati** (`ci_reactivated`) | 10 | tornati dopo >30gg di stop |
| **Eventi verificati** (`ci_events_verified`) | 5 | base, tenuto basso di proposito |
| **Fattore affidabilità** | ×0.5–1.0 | moltiplicatore finale = `reliability_score/100` clampato a [0.5, 1.0]: chi cancella spesso vede lo score compresso, ma non azzerato |

> I pesi sommano 100 prima del fattore affidabilità. Sono un **punto di partenza**:
> vanno ritarati quando ci sono dati reali di distribuzione (evitare che il 90%
> degli utenti si accalchi in una fascia).

### 4.3 Definizioni operative dei contatori

- **Verificato / eligible**: identico alla reliability — corsa non annullata,
  passata da ≥24h, con ≥1 partecipante approvato, e con almeno un segnale di
  svolgimento (`check_in` dell'organizzatore **o** ≥1 `run_confirmations.confirmed`).
- **Partecipazione confermata**: riga `run_confirmations(confirmed=true)` (inclusa
  `source='strava'`) o `check_ins` del partecipante a un evento dell'organizzatore.
- **Persona diversa**: `COUNT(DISTINCT user_id)` tra le partecipazioni confermate
  ai propri eventi.
- **Persona tornata**: partecipante con ≥2 presenze confermate ai propri eventi.
- **Newcomer attivato**: la **prima** presenza confermata in assoluto di quel
  `user_id` (min `created_at` su tutte le sue `run_confirmations`) è avvenuta a un
  proprio evento **e** sono passati ≥30gg da quella data senza che l'utente sia
  sparito (retention, non solo iscrizione).
- **Riattivato**: partecipante la cui presenza confermata arriva dopo >30gg dalla
  precedente presenza confermata *qualsiasi*.

---

## 5. Regole anti-gaming (consolidate)

Sono il cuore della difendibilità del sistema. Ogni regola chiude un exploit
concreto:

| Exploit | Difesa |
|---|---|
| Creo eventi fantasma, +punti | **Verified-only**: un evento entra nello score solo se svolto (check-in/conferma), come per la reliability |
| Approvo 20 finti partecipanti | Conta solo il **confermato**, non l'approvato; la conferma passiva più forte è il **match Strava** (posizione+tempo+distanza), difficile da falsificare |
| Invito 100 amici usa-e-getta | Bonus mentor **a maturazione ritardata** (attivo a 30gg), non all'iscrizione |
| Un account finto mi "torna" ogni settimana | **Rendimenti decrescenti** per persona + peso su `DISTINCT people`; un solo account che torna sempre satura in fretta |
| Sybil: creo 5 account e mi seguo | Un account che ha **come unica storia** presenze a eventi di un solo organizzatore contribuisce con peso ridotto (contributo pesato sulla *diversità di organizzatori* frequentati dall'invitato — v. taratura) |
| Mi attribuisco l'invito di utenti già presenti | `referrals.UNIQUE(referred_id)` + il referral si registra **solo alla registrazione** del nuovo utente, mai retroattivamente |
| Auto-referral | `CHECK (referrer_id <> referred_id)` |
| Gonfio le cancellazioni degli altri | Le cancellazioni pesano **solo** sull'organizzatore che annulla (via `reliability_score`), non sui partecipanti |

---

## 6. Sistema mentor ("il genitore del runner")

L'effetto rete più forte: non "quante persone inviti" ma **"quante persone
diventano runner attivi grazie a te"**.

**Flusso.**
1. Marco invita Luca (link d'invito piattaforma, oppure invito a una crew di cui
   Marco è owner/admin). Alla **registrazione** di Luca, service-role inserisce
   `referrals(referrer_id=Marco, referred_id=Luca, source=...)`. È immutabile e
   unico per Luca.
2. **Prima uscita di Luca confermata** → `referrals.first_run_at` valorizzato +
   Marco ottiene credito "newcomer attivato" (che maturerà a 30gg).
3. **Luca ancora attivo a 30gg** → `referrals.retained_at` valorizzato →
   `profiles.ci_mentored_active` di Marco +1 → ricalcolo CIS.
4. **Luca diventa a sua volta organizzatore** (primo evento verificato) →
   `referrals.became_org_at` + badge/riconoscimento speciale per Marco
   (l'effetto rete di secondo livello: hai creato un *creatore di community*).

**Maturazione ritardata.** I passi 3–4 non sono eventi istantanei: dipendono dal
tempo trascorso. Si valorizzano:
- **reattivamente** quando arriva un segnale (Luca conferma una corsa → controllo
  se sono passati 30gg dalla prima), oppure
- **con un job periodico** giornaliero (`scheduled task` / cron) che scansiona i
  `referrals` con `first_run_at` maturo e retention verificata. *Decisione aperta*
  §11.

---

## 7. "Runner ispirati" — la card (Fase 1, zero rischio)

Prima di punti e badge, una card **read-only** nel profilo che aggrega i
contatori `ci_*` già materializzati. Nessuna nuova tabella scrivibile dal client,
nessuna esposizione al gaming: solo la narrazione.

Esempio di rendering (`/profilo/[id]`):

```
Runner ispirati
 18   uscite organizzate
142   partecipazioni generate
 27   persone diverse coinvolte
  9   persone alla loro prima corsa
  6   runner diventati abituali
```

Molto più significativa del chilometraggio, e da sola valida se la narrativa
risuona con gli utenti — senza costruire ancora l'impianto completo.

---

## 8. Badge e livelli

Come `getReliabilityBadge()` / `getAttendanceBadge()` in `src/lib/reliability.ts`:
funzioni **pure** che derivano label dai contatori materializzati, nessuna colonna
badge sul DB.

### 8.1 Badge (traguardi puntuali)

| Badge | Condizione (indicativa) |
|---|---|
| 🌱 **Primo runner coinvolto** | `ci_activated_newcomers ≥ 1` |
| 🤝 **Costruttore di community** | `ci_distinct_people ≥ 10` |
| 🎉 **Organizzatore instancabile** | `ci_events_verified ≥ 10` |
| 🌟 **Hai fatto iniziare 20 persone** | `ci_activated_newcomers ≥ 20` |
| 👥 **Grande raduno** | un evento con ≥ 30 partecipanti confermati |
| ❤️ **Hai riportato a correre 10 persone** | `ci_reactivated ≥ 10` |
| 🧭 **Mentor** | `ci_mentored_active ≥ 1` |
| 🏗️ **Hai creato un organizzatore** | almeno un `referrals.became_org_at` valorizzato |

### 8.2 Livelli (ruolo nella community)

Derivati dal `community_score` **e** da soglie sui contatori (un livello alto
richiede sia impatto ampio sia continuità), non dai km:

```
Esploratore        score sbloccato, primi eventi
Organizzatore      eventi verificati ricorrenti
Ambassador         persone diverse + newcomer attivati
Mentor             invitati attivi a 30gg (referrals)
Community Builder   rete ampia + ritorno alto + affidabilità
Legend             top di fascia su tutti i fattori
```

Le soglie esatte si fissano dopo aver visto la distribuzione reale dei punteggi
(evitare 1 solo Legend o metà utenti Ambassador). Helper proposto:
`src/lib/community.ts` → `getCommunityLevel(profile)` e `getCommunityBadges(profile)`.

---

## 9. Design SQL (bozza — futuro `supabase/gamification.sql`, SQL #36)

Ricalca fedelmente `reliability.sql`: colonne materializzate → funzione di calcolo
`SECURITY DEFINER` → trigger sui segnali. Bozza di struttura, **non definitiva**:

```sql
-- 1) Tabella referrals (immutabile, service-role per l'insert)
CREATE TABLE public.referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id   uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  source        text NOT NULL DEFAULT 'invite_link',
  created_at    timestamptz NOT NULL DEFAULT now(),
  first_run_at  timestamptz,
  retained_at   timestamptz,
  became_org_at timestamptz,
  CHECK (referrer_id <> referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- SELECT: l'interessato (referrer o referred) può leggere il proprio legame
CREATE POLICY "read own referral" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
-- Nessuna policy INSERT/UPDATE → solo service-role (come strava_connections)

-- 2) Colonne materializzate su profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_score        numeric(6,2),
  ADD COLUMN IF NOT EXISTS ci_events_verified     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_participations      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_distinct_people     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_returning_people    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_activated_newcomers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_mentored_active     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ci_reactivated         integer NOT NULL DEFAULT 0;

-- 3) update_community_score(p_organizer_id uuid): SECURITY DEFINER
--    - scandisce i propri eventi "eligible" (stessa logica di update_reliability_score)
--    - conta partecipazioni confermate, DISTINCT people, returning, newcomer, reattivati
--    - legge ci_mentored_active da referrals (retained_at IS NOT NULL)
--    - applica curve a saturazione + pesi §4.2 + fattore reliability
--    - scrive i contatori e community_score (NULL se ci_events_verified < 2)

-- 4) Trigger (riuso degli stessi segnali della reliability):
--    - AFTER INSERT/UPDATE ON run_confirmations
--    - AFTER INSERT ON check_ins
--    - AFTER UPDATE ON runs (status)
--    - AFTER UPDATE ON referrals (retained_at / became_org_at, dal job)
--    ognuno ricava l'organizer e fa PERFORM update_community_score(org).
```

**Nota performance.** `DISTINCT people` e "returning" possono diventare pesanti se
ricalcolati a ogni conferma. Se il volume cresce, valutare ricalcolo *debounced*
(job periodico invece che trigger sincrono) — vedi §11.

---

## 10. UI e collocazione

| Elemento | Dove |
|---|---|
| Card "Runner ispirati" (Fase 1) | `/profilo/[id]`, sotto/accanto ai badge reliability esistenti |
| Badge community + livello | riga badge del profilo e sidebar dettaglio corsa (come `ReliabilityBadge`) |
| Spiegazione narrativa | nuova sezione in `/come-funziona` ("Non quanto corri, ma quante persone fai correre") |
| Card mentor | `/area-personale`: "Hai portato N runner · M ancora attivi" + CTA link d'invito |
| Riconoscimento "hai creato un organizzatore" | notifica (`notifications`) quando un `referrals.became_org_at` si valorizza |

Componente riutilizzabile `CommunityBadge` sul modello di `ReliabilityBadge`
(varianti full/icon).

---

## 11. Decisioni aperte (da sciogliere prima dell'implementazione)

1. **Maturazione mentor/newcomer: trigger reattivo o job periodico?**
   Il "attivo a 30gg" dipende dal tempo, non da un evento. Opzioni: (a) job
   giornaliero (`mcp scheduled-tasks` / cron Supabase) che scansiona `referrals`;
   (b) calcolo lazy al primo segnale utile dopo i 30gg. Propendo per **(a)** per
   coerenza dei numeri.
2. **Ricalcolo score: sincrono nei trigger o debounced?** La reliability lo fa
   sincrono e va bene a questi volumi; il CIS ha query `DISTINCT`/returning più
   pesanti. Partire sincrono, passare a debounced se necessario.
3. **Score pubblico o privato?** Mostrare il numero 0–100 a tutti, o solo
   badge/livelli in pubblico e numero nel proprio profilo? Un numero esposto
   incentiva il confronto competitivo — che è esattamente ciò da cui vogliamo
   distinguerci. **Proposta:** in pubblico solo livello + badge + card "Runner
   ispirati" (fatti, non punteggio); il numero grezzo resta privato.
4. **Classifiche sì/no?** Una leaderboard globale reintroduce la logica
   competitiva di Strava. Se serve, meglio **per città/crew** e sul *ritorno*
   delle persone, non sul volume. Da valutare, non nell'MVP.
5. **Tarare pesi e soglie** (§4.2, §8.2) **sui dati reali** prima di esporre
   livelli, per evitare distribuzioni degeneri.
6. **Retroattività referral.** I referral partono da zero (solo nuovi utenti dopo
   il rilascio): non è ricostruibile chi ha portato chi in passato. Accettabile.

---

## 12. Piano di rilascio

**Fase 1 — "Runner ispirati" (read-only).**
Colonne `ci_*` + `update_community_score` (solo contatori, senza pubblicare il
punteggio) + card profilo. Nessuna tabella scrivibile dal client, nessun rischio
gaming. Valida la narrativa. → *Consigliata come primo passo concreto.*

**Fase 2 — Mentor + Community Impact Score.**
Tabella `referrals` agganciata al flusso invito/registrazione, job di maturazione
30gg, formula completa §4, badge e livelli (`src/lib/community.ts`), card mentor
in area personale, sezione in `/come-funziona`.

**Fase 3 — Rifiniture.**
Riconoscimento "hai creato un organizzatore", eventuali classifiche per
città/crew, tarature su dati reali, notifiche di traguardo.

---

## 13. In una riga

Strava misura la performance atletica, INTVL il controllo del territorio.
**Vieni a correre? misura l'impatto sociale: non quanto corri, ma quante persone
riesci a far correre insieme** — ed è credibile perché i numeri sono *verificati*,
non dichiarati.
```
