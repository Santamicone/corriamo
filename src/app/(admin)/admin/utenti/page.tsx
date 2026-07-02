import { requireAdmin } from '@/lib/admin/guard'
import { Stub } from '../_Stub'

export default async function Page() {
  await requireAdmin()
  return <Stub title="Utenti" note="Ricerca utenti, scheda con ammonizioni, sospensioni e ban. In arrivo (PR-B)." />
}
