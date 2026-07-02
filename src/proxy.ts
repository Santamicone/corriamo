import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/area-personale', '/nuova-corsa', '/nuova-serie', '/nuova-corsa-spot', '/nuova-gara', '/profilo/modifica', '/admin']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Utenti sospesi/bannati: bloccati sui percorsi di scrittura, rediretti alla
  // pagina di stato. L'enforcement forte è comunque a livello DB (RLS is_active_user).
  if (user && isProtected && !request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles').select('moderation_status').eq('id', user.id).maybeSingle()
    if (profile && ['suspended', 'banned'].includes(profile.moderation_status ?? '')) {
      return NextResponse.redirect(new URL('/account-sospeso', request.url))
    }
  }

  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registrati') && user) {
    return NextResponse.redirect(new URL('/bacheca', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
