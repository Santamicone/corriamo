import { requireAdmin } from '@/lib/admin/guard'
import { Stub } from '../_Stub'

export default async function Page() {
  await requireAdmin()
  return <Stub title="Segnalazioni" note="Coda dei report inviati dagli utenti. In arrivo (PR-D)." />
}
