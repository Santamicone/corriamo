import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { NuovaCorsaForm } from './NuovaCorsaForm'

export default async function NuovaCorsaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: series } = await supabase
    .from('series')
    .select('id, title')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-extrabold text-on-surface mb-2">Proponi una corsa</h1>
        <p className="text-sm text-on-surface-variant mb-6">Crea un evento singolo e invita altri runner.</p>
        <NuovaCorsaForm userId={user.id} userSeries={series ?? []} />
      </main>
    </div>
  )
}
