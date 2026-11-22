import Link from 'next/link'
import { getAdminContext } from '@/lib/admin/guard'
import { CrewImportWorkspace } from '../CrewImportWorkspace'

export default async function AdminImportaCrewPage() {
  await getAdminContext()
  return (
    <div>
      <Link href="/admin/crew" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <span className="material-symbols-outlined text-base">arrow_back</span> Crew
      </Link>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Importa crew</h1>
      <p className="text-sm text-gray-500 mb-6">
        Prima si controlla tutto e si cercano le posizioni: non viene salvato niente finché non confermi.
        Importa solo dati pubblici di organizzazioni, mai telefoni o nomi di persone.
      </p>
      <CrewImportWorkspace mode="batch" />
    </div>
  )
}
