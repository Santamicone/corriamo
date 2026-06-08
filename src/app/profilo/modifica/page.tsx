import type { Metadata } from 'next'
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { EditProfileForm } from './EditProfileForm'
import type { Profile } from '@/lib/types'

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ unsubscribed?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { unsubscribed } = await searchParams

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-2xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-extrabold text-on-surface mb-6">Modifica profilo</h1>
        {unsubscribed === '1' && (
          <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3.5">
            <span className="material-symbols-filled text-green-600 text-xl shrink-0">check_circle</span>
            <div>
              <p className="text-sm font-bold text-green-800">Disiscrizione completata</p>
              <p className="text-xs text-green-700 mt-0.5">Non riceverai più email da Vieni a correre?. Puoi riabilitarle qui sotto in qualsiasi momento.</p>
            </div>
          </div>
        )}
        <EditProfileForm profile={profile as unknown as Profile} />
      </main>
      <Footer />
    </div>
  )
}
