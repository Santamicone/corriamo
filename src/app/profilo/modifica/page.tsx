import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { EditProfileForm } from './EditProfileForm'
import type { Profile } from '@/lib/types'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-2xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-extrabold text-on-surface mb-6">Modifica profilo</h1>
        <EditProfileForm profile={profile as unknown as Profile} />
      </main>
      <Footer />
    </div>
  )
}
