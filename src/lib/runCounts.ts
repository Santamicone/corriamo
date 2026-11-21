import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Numero di partecipanti approvati per corsa.
 *
 * La RLS di `participations` mostra le righe solo al partecipante e
 * all'organizzatore: un conteggio diretto è parziale per tutti gli altri (e
 * sempre 0 per i visitatori anonimi, come nella landing di condivisione e
 * nell'immagine OG). La funzione SECURITY DEFINER `run_participant_counts`
 * (SQL #45, supabase/run-counts-reminders.sql) restituisce solo i numeri.
 * Finché la funzione non esiste sul database si ricade sul conteggio diretto.
 */
export async function fetchApprovedCounts(
  supabase: SupabaseClient,
  runIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (runIds.length === 0) return map

  const { data, error } = await supabase.rpc('run_participant_counts', { p_run_ids: runIds })
  if (!error && Array.isArray(data)) {
    for (const r of data as { run_id: string; approved_count: number }[]) map.set(r.run_id, r.approved_count)
    return map
  }

  const { data: rows } = await supabase
    .from('participations')
    .select('run_id')
    .eq('status', 'approvata')
    .in('run_id', runIds)
  for (const r of rows ?? []) map.set(r.run_id, (map.get(r.run_id) ?? 0) + 1)
  return map
}
