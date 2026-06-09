# Runbook — sblocco debito produzione (reliability · crew · email)

Procedura prudente per applicare in produzione i file SQL #18–#24 e le Edge
Functions email. Eseguire **nell'ordine indicato**. Ogni step è verificabile e
gli script SQL sono idempotenti (ri-eseguibili senza danni).

> Prima di iniziare: fai un backup/snapshot dal Supabase Dashboard
> (Database → Backups). È la rete di sicurezza in caso di imprevisto.

---

## Step 1 — Schema (sicuro, nessun segreto)

Supabase Dashboard → **SQL Editor** → incolla ed esegui:

1. `supabase/apply-all-pending.sql`  ← migrazione consolidata e transazionale
2. `supabase/verify-pending.sql`     ← controllo: tutte le righe devono dire `OK`,
   e `trigger_attesi_9` deve valere **9**.

Se `apply-all-pending.sql` fallisce, la transazione fa **rollback automatico**:
il DB resta esattamente com'era. Leggi l'errore, correggi, riprova.

Copre i file: reliability (#18), edit-run (#22), crews (#19), crews-fix-rls (#21),
crew-invites (#20), email-notifications schema (#23).

A questo punto sono attive: **affidabilità organizzatori** e **crew**.

---

## Step 2 — Edge Functions email

Da terminale (richiede `supabase login` e progetto linkato):

```bash
supabase link --project-ref wshjtgtmxbxhpdqtxpiq
supabase secrets set RESEND_API_KEY=<chiave_resend>
supabase functions deploy send-immediate
supabase functions deploy send-digest
```

Verifica che entrambe compaiano in Dashboard → Edge Functions con stato deployed.

---

## Step 3 — Trigger email (#24) — ESEGUIRE PER ULTIMO

`supabase/email-triggers.sql` collega il DB alle Edge Functions. Va eseguito
**solo dopo** lo Step 2, altrimenti i trigger chiamano endpoint inesistenti.

⚠️ **Sicurezza:** il file incorpora la `service_role` key in chiaro dentro una
funzione SQL (`INCOLLA_QUI_SERVICE_ROLE_KEY`). La definizione di funzione è
leggibile da chiunque abbia accesso a `pg_proc` → è un segreto esposto.

**Raccomandato:** usare Supabase Vault invece dell'hardcoding:

```sql
-- una tantum
select vault.create_secret('<service_role_key>', 'service_role_key');
```

e nelle funzioni leggere la key con:

```sql
(select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
```

al posto della stringa `Bearer INCOLLA_QUI_SERVICE_ROLE_KEY`.

Se invece si procede con l'hardcoding (più rapido, meno sicuro): sostituire i
**due** placeholder `INCOLLA_QUI_SERVICE_ROLE_KEY` con la key reale prima di
eseguire, e non committare mai il file compilato.

---

## Rollback

- **Step 1:** transazionale, fallimento = nessuna modifica. Per annullare a
  posteriori servirebbero DROP mirati (le tabelle crews/crew_members contengono
  però dati utente: valutare con attenzione).
- **Step 3:** `DROP TRIGGER IF EXISTS trg_email_immediate ON public.notifications;`
  e `SELECT cron.unschedule('email-digest-every-30min');` disattivano l'invio.

---

## Note

I file originali #18–#24 restano nel repo come riferimento storico.
`apply-all-pending.sql` è la versione idempotente da usare per l'applicazione.
Dopo l'esecuzione, aggiornare lo stato in `PROJECT_STATUS.md` (§4 tabella SQL e §8).
