import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/email/token'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/unsubscribe?token=...
 * Disabilita tutte le email per l'utente senza richiedere login.
 * Reindirizza a una pagina di conferma.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.vieniacorrere.it'

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/login?error=invalid_unsubscribe`)
  }

  const userId = await verifyUnsubscribeToken(token)
  if (!userId) {
    return NextResponse.redirect(`${siteUrl}/login?error=invalid_unsubscribe`)
  }

  const supabase = await createClient()

  await supabase
    .from('profiles')
    .update({
      email_prefs: { immediate: false, digest: false, reminders: false },
    })
    .eq('id', userId)

  // Redirect a pagina profilo con messaggio di conferma
  return NextResponse.redirect(
    `${siteUrl}/profilo/modifica?unsubscribed=1`
  )
}
