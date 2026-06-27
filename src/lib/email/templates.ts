const SITE_URL    = 'https://app.vieniacorrere.it'
const PRIMARY     = '#EA580C'
const BG          = '#FAFAF9'

function base(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vieni a correre?</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:${PRIMARY};padding:20px 32px;">
            <a href="${SITE_URL}" style="text-decoration:none;">
              <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">🏃 Vieni a correre?</span>
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              Hai ricevuto questa email perché sei iscritto a Vieni a correre?.
              <br>
              <a href="${SITE_URL}/profilo/modifica" style="color:#9ca3af;">Gestisci le preferenze email</a>
              &nbsp;·&nbsp;
              <a href="${unsubscribeUrl}" style="color:#9ca3af;">Disiscriviti da tutto</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:${PRIMARY};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:50px;">${label}</a>`
}

function runDetails(date: string, time: string, city: string): string {
  const d = new Date(`${date}T${time}`).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const t = time.slice(0, 5)
  return `<p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.7;">
    📅 ${d} alle ${t}<br>📍 ${city}
  </p>`
}

// ── Template 1: richiesta approvata ──────────────────────────────────────────
export function emailRichiestaApprovata(opts: {
  recipientName: string
  organizerName: string
  runTitle: string
  runDate: string
  runTime: string
  runCity: string
  runId: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `✅ Sei nella corsa! "${opts.runTitle}"`
  const runUrl  = `${SITE_URL}/corse/${opts.runId}`
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Sei iscritto! 🎉</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
      Ciao <strong>${opts.recipientName}</strong>,<br>
      <strong>${opts.organizerName}</strong> ha approvato la tua richiesta per:
    </p>
    <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${opts.runTitle}</p>
    ${runDetails(opts.runDate, opts.runTime, opts.runCity)}
    ${cta('Vai alla corsa →', runUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Puoi chattare con gli altri partecipanti direttamente nella pagina della corsa.
    </p>
  `, opts.unsubscribeUrl)
  return { subject, html }
}

// ── Template 2: corsa annullata ───────────────────────────────────────────────
export function emailCorsaAnnullata(opts: {
  recipientName: string
  organizerName: string
  runTitle: string
  runDate: string
  runTime: string
  runCity: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `⚠️ Corsa annullata: "${opts.runTitle}"`
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Corsa annullata</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
      Ciao <strong>${opts.recipientName}</strong>,<br>
      purtroppo <strong>${opts.organizerName}</strong> ha annullato la corsa a cui eri iscritto/a.
    </p>
    <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${opts.runTitle}</p>
    ${runDetails(opts.runDate, opts.runTime, opts.runCity)}
    ${cta('Cerca altre corse →', `${SITE_URL}/bacheca`)}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Ci dispiace per il disagio. Troverai altri runner sulla bacheca!
    </p>
  `, opts.unsubscribeUrl)
  return { subject, html }
}

// ── Template 3: corsa modificata ──────────────────────────────────────────────
export function emailCorsaModificata(opts: {
  recipientName: string
  organizerName: string
  runTitle: string
  runDate: string
  runTime: string
  runCity: string
  runId: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `📝 "${opts.runTitle}" è stata modificata`
  const runUrl  = `${SITE_URL}/corse/${opts.runId}`
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Aggiornamento corsa</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
      Ciao <strong>${opts.recipientName}</strong>,<br>
      <strong>${opts.organizerName}</strong> ha modificato i dettagli di una corsa a cui sei iscritto/a.
    </p>
    <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${opts.runTitle}</p>
    ${runDetails(opts.runDate, opts.runTime, opts.runCity)}
    ${cta('Guarda le novità →', runUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Controlla data, orario e luogo aggiornati prima di presentarti.
    </p>
  `, opts.unsubscribeUrl)
  return { subject, html }
}

// ── Template 4: promemoria corsa ──────────────────────────────────────────────
export function emailPromemoria(opts: {
  recipientName: string
  organizerName: string
  runTitle: string
  runDate: string
  runTime: string
  runCity: string
  runLocation: string
  runId: string
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const subject = `🏃 Domani corri con ${opts.organizerName}!`
  const runUrl  = `${SITE_URL}/corse/${opts.runId}`
  const t = opts.runTime.slice(0, 5)
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">A domani sulle strade! 🏃</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
      Ciao <strong>${opts.recipientName}</strong>,<br>
      ricorda che domani corri con <strong>${opts.organizerName}</strong>.
    </p>
    <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#111827;">${opts.runTitle}</p>
    <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.8;">
      🕐 Ore ${t}<br>
      📍 ${opts.runLocation}, ${opts.runCity}
    </p>
    ${cta('Apri la corsa →', runUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Usa il <strong>Purple Screen</strong> per riconoscervi al punto di ritrovo.
    </p>
  `, opts.unsubscribeUrl)
  return { subject, html }
}

// ── Template 5: digest (richieste + messaggi non letti) ───────────────────────
export interface DigestItem {
  type: 'nuova_richiesta' | 'nuovo_messaggio'
  title: string
  body: string | null
  runId: string | null
}

export function emailDigest(opts: {
  recipientName: string
  items: DigestItem[]
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const n = opts.items.length
  const subject = `📬 ${n} aggiornament${n === 1 ? 'o' : 'i'} da Vieni a correre?`

  const rows = opts.items.map(item => {
    const icon = item.type === 'nuova_richiesta' ? '👤' : '💬'
    const href = item.runId ? `${SITE_URL}/corse/${item.runId}` : SITE_URL
    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${icon} ${item.title}</p>
        ${item.body ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${item.body}</p>` : ''}
        <a href="${href}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:${PRIMARY};text-decoration:none;">Vedi →</a>
      </td>
    </tr>`
  }).join('')

  const html = base(`
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">
      Hai ${n} aggiornament${n === 1 ? 'o' : 'i'}
    </h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      Ciao <strong>${opts.recipientName}</strong>, ecco cosa ti sei perso/a.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
    ${cta('Vai all\'app →', SITE_URL)}
  `, opts.unsubscribeUrl)
  return { subject, html }
}
