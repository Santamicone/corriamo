import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase con service-role: bypassa la RLS. Uso ESCLUSIVO server-side
 * (API route admin). Non importare mai in codice client.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata')
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
