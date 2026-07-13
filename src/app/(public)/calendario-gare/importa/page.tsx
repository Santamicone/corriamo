import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/PageContainer'
import { ImportaForm } from './ImportaForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ImportaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) notFound()

  return (
    <PageContainer width="content" className="py-8 sm:py-12">
      <Link href="/calendario-gare/modera" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors mb-6">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Moderazione
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          Ingestione AI
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">Importa gare da fonti grezze</h1>
        <p className="mt-2 text-base text-gray-500">
          Incolla testo, carica volantini (jpg/pdf), elenchi di URL o file xls/csv.
          L&apos;AI estrae una o più gare; controlliamo i doppioni e le salvi come
          bozze da pubblicare in moderazione.
        </p>
      </div>

      <ImportaForm />
    </PageContainer>
  )
}
