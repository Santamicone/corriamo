import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditEntry {
  admin_id: string
  action_type: string
  entity_table?: string | null
  entity_id?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Registra un'azione admin in admin_actions. L'insert richiede una sessione
 * AAL2 (policy RLS "Admins write admin_actions"). Non solleva: un fallimento di
 * audit non deve bloccare l'operazione, ma va segnalato nei log server.
 */
export async function logAdminAction(supabase: SupabaseClient, entry: AuditEntry): Promise<void> {
  const { error } = await supabase.from('admin_actions').insert({
    admin_id: entry.admin_id,
    action_type: entry.action_type,
    entity_table: entry.entity_table ?? null,
    entity_id: entry.entity_id ?? null,
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? {},
  })
  if (error) console.error('[admin audit] insert failed:', error.message)
}
