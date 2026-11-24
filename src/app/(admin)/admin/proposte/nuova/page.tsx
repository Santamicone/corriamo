import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'
import { todayItaly } from '@/lib/utils'
import { ProposalForm } from './ProposalForm'

export default async function AdminNuovaPropostaPage() {
  await getAdminContext()
  return (
    <div>
      <Link href="/admin/proposte" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <span className="material-symbols-outlined text-base">arrow_back</span> Proposte
      </Link>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Nuova proposta</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xl">
        Scegli una tipologia: titolo, distanza, ritmo, livello e orario si precompilano e restano modificabili.
        Il luogo è solo indicativo: il ritrovo preciso lo sceglie chi la organizza.
      </p>
      <ProposalForm today={todayItaly()} />
    </div>
  )
}
