import type { Metadata } from 'next'
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SpotForm } from './SpotForm'

export default async function NuovaCorsaSpotPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('city').eq('id', user.id).single()

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <Header />
      <main className="flex-1 flex flex-col">

        {/* Header dark */}
        <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
              Corsa spontanea
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            Esci adesso.<br />
            <span className="text-primary">Trova compagnia.</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            30 secondi per pubblicare una corsa. Chi è nei dintorni la vedrà subito.
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 bg-background rounded-t-3xl px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-lg mx-auto w-full">
          <SpotForm userId={user.id} defaultCity={profile?.city ?? ''} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
