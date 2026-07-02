import { requireAdmin } from '@/lib/admin/guard'
import { BroadcastForm } from './BroadcastForm'

export default async function AdminBroadcastPage() {
  await requireAdmin()
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Broadcast</h1>
      <p className="text-sm text-gray-500 mb-5">
        Invia un annuncio in-app a tutti gli utenti o a una città. Gli utenti bloccati sono esclusi.
      </p>
      <BroadcastForm />
    </div>
  )
}
