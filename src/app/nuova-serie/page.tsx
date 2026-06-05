import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { NuovaSerieForm } from './NuovaSerieForm'

export default async function NuovaSeriePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-2xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-extrabold text-on-surface mb-2">Proponi una serie ricorrente</h1>
        <p className="text-sm text-on-surface-variant mb-6">Crea una serie e genera automaticamente i prossimi appuntamenti.</p>
        <NuovaSerieForm userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
