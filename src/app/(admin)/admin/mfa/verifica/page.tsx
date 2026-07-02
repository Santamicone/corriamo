import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'
import { MfaVerify } from './MfaVerify'

export default async function MfaVerifyPage() {
  await getAdminContext()
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Verifica 2FA</h1>
      <p className="text-sm text-gray-500 mb-6">
        Inserisci il codice a 6 cifre della tua app di autenticazione.
      </p>
      <MfaVerify />
      <Link href="/admin/mfa/recupero" className="block text-center text-sm text-gray-400 hover:text-gray-700 mt-4">
        Ho perso il dispositivo
      </Link>
    </div>
  )
}
