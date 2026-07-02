import { getAdminContext } from '@/lib/admin/guard'
import { MfaRecover } from './MfaRecover'

export default async function MfaRecoverPage() {
  await getAdminContext()
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Recupero 2FA</h1>
      <p className="text-sm text-gray-500 mb-6">
        Inserisci uno dei codici di recupero salvati alla configurazione. Verrà
        rimosso il dispositivo attuale: dovrai riconfigurare il 2FA subito dopo.
      </p>
      <MfaRecover />
    </div>
  )
}
