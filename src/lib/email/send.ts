/**
 * Invio email transazionali via Resend dal lato server di Next.
 * Le edge function Supabase hanno il proprio invio inline; questo è per le
 * email innescate da API route (es. scheda ritmi dei tool).
 */

const FROM = 'Vieni a correre? <info@vieniacorrere.it>'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY non configurata')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err}`)
  }
}
