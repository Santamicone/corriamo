/**
 * Token HMAC-SHA256 per unsubscribe senza login.
 * Stateless — firmato con SUPABASE_SERVICE_ROLE_KEY.
 * Scadenza: 30 giorni.
 */

const EXPIRY_DAYS = 30

function getSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata')
  return key
}

export async function generateUnsubscribeToken(userId: string): Promise<string> {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  })
  const encoded = btoa(payload)
  const sig     = await hmacSign(encoded, getSecret())
  return `${encoded}.${sig}`
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null
  const expected = await hmacSign(encoded, getSecret())
  if (expected !== sig) return null
  try {
    const { uid, exp } = JSON.parse(atob(encoded))
    if (Date.now() > exp) return null
    return uid as string
  } catch {
    return null
  }
}

export function buildUnsubscribeUrl(userId: string, siteUrl: string): Promise<string> {
  return generateUnsubscribeToken(userId).then(
    token => `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`
  )
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc     = new TextEncoder()
  const key     = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuf  = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
}
