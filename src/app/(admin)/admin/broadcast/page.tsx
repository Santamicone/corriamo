import { requireAdmin } from '@/lib/admin/guard'
import { Stub } from '../_Stub'

export default async function Page() {
  await requireAdmin()
  return <Stub title="Broadcast" note="Annunci e messaggi a segmenti di utenti. In arrivo (PR-E)." />
}
