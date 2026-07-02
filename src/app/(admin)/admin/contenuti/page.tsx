import { requireAdmin } from '@/lib/admin/guard'
import { Stub } from '../_Stub'

export default async function Page() {
  await requireAdmin()
  return <Stub title="Contenuti" note="Nascondi o ripristina corse, serie, momenti e recensioni. In arrivo (PR-C)." />
}
