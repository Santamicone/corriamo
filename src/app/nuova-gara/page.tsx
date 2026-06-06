import type { Metadata } from 'next'
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { NuovaGaraForm } from './NuovaGaraForm'

export default async function NuovaGaraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <span className="material-symbols-outlined text-sm">emoji_events</span>
            Nuova gara
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Trova compagni per la tua gara</h1>
          <p className="mt-2 text-base text-gray-500">
            Stai cercando un pacer, un compagno di gara o un supporter? Pubblica un post e connettiti con runner che partecipano alla stessa gara.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuovaGaraForm userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
