import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/PageContainer'
import { ProponiGaraForm } from './ProponiGaraForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ProponiGaraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer width="form" className="py-8 sm:py-12">
      <Link href="/calendario-gare" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Calendario gare
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <span className="material-symbols-outlined text-sm">add_location_alt</span>
          Proponi una gara
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Segnala una gara mancante</h1>
        <p className="mt-2 text-base text-gray-500">
          Conosci una gara che non è nel calendario? Segnalacela: la verifichiamo e la aggiungiamo per tutta la community.
        </p>
      </div>

      <ProponiGaraForm userId={user.id} />
    </PageContainer>
  )
}
