# Configurazione manuale Supabase Dashboard

Queste impostazioni vanno applicate manualmente su https://supabase.com → progetto `corriamo`.

---

## 1. URL Configuration

**Authentication → URL Configuration**

| Campo | Valore |
|---|---|
| Site URL | `https://corriamo.vercel.app` |
| Redirect URLs | `https://corriamo.vercel.app/**` |

> Su localhost il redirect funziona grazie al fallback nel codice.
> Supabase usa il Site URL come base per i link nelle email.

---

## 2. Email Templates

**Authentication → Email Templates**

Copia il contenuto HTML dei file in `supabase/email-templates/` nei rispettivi template.

### Confirm signup → `confirm-signup.html`

**Subject:**
```
Conferma la tua iscrizione a Vieni a correre?
```

**Body:** copia il contenuto di `supabase/email-templates/confirm-signup.html`

---

### Reset password → `reset-password.html`

**Subject:**
```
Reimposta la password di Vieni a correre?
```

**Body:** copia il contenuto di `supabase/email-templates/reset-password.html`

---

### Magic link → `magic-link.html`

**Subject:**
```
Il tuo link di accesso a Vieni a correre?
```

**Body:** copia il contenuto di `supabase/email-templates/magic-link.html`

---

### Change email → `change-email.html`

**Subject:**
```
Conferma il nuovo indirizzo email — Vieni a correre?
```

**Body:** copia il contenuto di `supabase/email-templates/change-email.html`

---

## 3. Variabili ambiente su Vercel

**Vercel → progetto corriamo → Settings → Environment Variables**

Aggiungere:

| Nome | Valore | Environment |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://corriamo.vercel.app` | Production |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wshjtgtmxbxhpdqtxpiq.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | All |

---

## 5. SQL aggiuntivi da eseguire

Oltre allo schema base, esegui questi file nell'SQL Editor nell'ordine indicato:

| Ordine | File | Contenuto |
|---|---|---|
| 1 | `supabase/schema.sql` | Schema principale |
| 2 | `supabase/trigger-new-user.sql` | Trigger profilo automatico |
| 3 | `supabase/messages.sql` | Tabella messaggistica |
| 4 | `supabase/reviews.sql` | Tabella recensioni |
| 5 | `supabase/add-coordinates.sql` | Colonne lat/lng su runs |
| 6 | `supabase/storage-avatars.sql` | Bucket Storage per avatar |

## 6. Storage bucket avatars

Dopo aver eseguito `storage-avatars.sql`, verifica in **Storage → Buckets** che:
- Il bucket `avatars` esista
- Sia impostato come **Public**
- Le 4 policy RLS siano presenti

Il path di upload è `avatars/{user_id}/avatar.{ext}` — ogni utente scrive solo nella propria cartella.

---

## 4. Come funziona il flusso di conferma email

1. Utente si registra → `signUp` con `emailRedirectTo: https://corriamo.vercel.app/auth/callback`
2. Supabase invia email con link → `https://corriamo.vercel.app/auth/callback?code=xxx`
3. La route `/auth/callback` scambia il `code` per una sessione Supabase
4. Redirect finale a `/bacheca`
