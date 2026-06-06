import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { Footer } from '@/components/Footer'
import { NuovaCorsaForm } from './NuovaCorsaForm'

export default async function NuovaCorsaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: series } = await supabase
    .from('series').select('id, title').eq('organizer_id', user.id).order('created_at', { ascending: false })

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Header sezione */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Nuova proposta
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Proponi una corsa o una serie</h1>
          <p className="mt-2 text-base text-gray-500">
            Scegli se proporre un singolo appuntamento o una serie ricorrente. Poi dai ai runner le informazioni giuste: dove, quando, quanto e a che ritmo.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuovaCorsaForm userId={user.id} userSeries={series ?? []} />
      </main>
      <Footer />
    </div>
  )
}
