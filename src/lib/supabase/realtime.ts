import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

/**
 * Si iscrive a un canale Realtime solo dopo aver caricato l'accesso dell'utente.
 *
 * A pagina appena caricata il token non è ancora disponibile: iscrivendosi subito, il canale parte
 * senza utente e le regole di sicurezza (RLS) scartano tutti gli eventi, finché non si naviga
 * altrove. `setAuth()` senza argomenti legge la sessione e lascia attivo il rinnovo del token.
 *
 * `build` crea il canale con i suoi `.on(...)`, senza chiamare `.subscribe()`.
 * Ritorna la funzione di pulizia da usare come cleanup di useEffect.
 */
export function subscribeWithAuth(supabase: SupabaseClient, build: () => RealtimeChannel): () => void {
  let channel: RealtimeChannel | null = null
  let cancelled = false

  supabase.realtime
    .setAuth()
    .catch((e) => console.warn('[realtime] accesso non caricato:', e))
    .then(() => {
      if (!cancelled) channel = build().subscribe()
    })

  return () => {
    cancelled = true
    if (channel) supabase.removeChannel(channel)
  }
}
