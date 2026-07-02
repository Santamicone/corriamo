import { getAdminContext } from '@/lib/admin/guard'
import { MfaSetup } from './MfaSetup'

export default async function MfaSetupPage() {
  // Solo gate is_admin (dal layout). Qui NON serve AAL2: è la pagina che lo configura.
  await getAdminContext()
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Configura il 2FA</h1>
      <p className="text-sm text-gray-500 mb-6">
        La sezione admin richiede l&apos;autenticazione a due fattori. Inquadra il QR
        con un&apos;app di autenticazione (Google Authenticator, Authy, 1Password…).
      </p>
      <MfaSetup />
    </div>
  )
}
