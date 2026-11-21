import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/auth/next'

/** Un account creato da meno di così, al primo accesso, è "nuovo" (registrazione via OAuth). */
const NEW_USER_WINDOW_MS = 60_000

/** Aggiunge ?welcome=1 alla bacheca per i nuovi utenti (il banner di benvenuto vive lì). */
function withWelcome(next: string): string {
  const url = new URL(next, 'http://local')
  if (url.pathname !== '/bacheca' || url.searchParams.has('welcome')) return next
  url.searchParams.set('welcome', '1')
  return `${url.pathname}${url.search}`
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Solo percorsi interni: `next` arriva dall'URL e non va mai usato come destinazione grezza
  const next = safeNextPath(searchParams.get('next'))
  // Usa il site URL configurato in produzione, fallback all'origin locale
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  // Il provider ha rimandato un errore (utente che annulla, permessi negati, email assente…)
  const providerError = searchParams.get('error')
  if (providerError && !code) {
    const description = (searchParams.get('error_description') ?? '').toLowerCase()
    const reason = providerError === 'access_denied'
      ? 'oauth_cancelled'
      : description.includes('email')
        ? 'oauth_no_email'
        : 'auth_callback_failed'
    return NextResponse.redirect(`${siteUrl}/login?error=${reason}`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let destination = next
      if (data.user) {
        // Aggiorna last_seen_at per la logica anti-spam digest email
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', data.user.id)

        // Primo accesso (registrazione con Google/Facebook): mostra il benvenuto
        const created = Date.parse(data.user.created_at)
        const lastSignIn = Date.parse(data.user.last_sign_in_at ?? data.user.created_at)
        if (Number.isFinite(created) && Math.abs(lastSignIn - created) < NEW_USER_WINDOW_MS) {
          destination = withWelcome(next)
        }
      }
      return NextResponse.redirect(`${siteUrl}${destination}`)
    }
  }

  // Redirect a pagina di errore se qualcosa va storto
  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`)
}
