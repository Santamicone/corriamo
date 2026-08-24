import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { getCompagniMatches, RunnerCard } from '@/components/CompagniBlock'

export const metadata: Metadata = {
  title: 'Runner come te',
  robots: { index: false, follow: false },
}

export default async function CompagniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  const me = meData as Profile | null

  const { hasSignal, matches, groupHref, sameCityCount } = await getCompagniMatches(supabase, me, 24)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <PageContainer width="content" className="py-10">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">diversity_3</span>
              Runner come te
            </h1>
            <p className="text-gray-500 mt-1">
              Persone vicine a te, allo stesso ritmo e con le stesse motivazioni. Scrivi e organizzate una corsa.
            </p>
          </PageContainer>
        </div>

        <PageContainer width="content" className="py-8">

          {!hasSignal ? (
            <EmptyState
              icon="badge"
              title="Completa il profilo per trovare compagni"
              text="Aggiungi città, ritmo e livello: ci servono per suggerirti i runner più affini a te."
              cta={{ href: '/profilo/modifica', label: 'Completa il profilo' }}
            />
          ) : matches.length === 0 ? (
            <EmptyState
              icon="person_search"
              title="Ancora nessun runner compatibile"
              text={me?.city
                ? `Per ora non troviamo runner affini a ${me.city}. Intanto puoi proporre tu una corsa: gli altri ti troveranno.`
                : 'Aggiungi la tua città al profilo per trovare runner vicino a te.'}
              cta={{ href: '/nuova-corsa', label: 'Proponi una corsa' }}
            />
          ) : (
            <>
              {groupHref && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl px-5 py-4 mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl shrink-0">groups</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Ci sono {sameCityCount} runner come te a {me!.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Proponi una corsa al tuo ritmo: la vedranno tutti in bacheca.
                    </p>
                  </div>
                  <Link href={groupHref}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-primary-hover transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Crea un gruppo
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map(m => (
                  <RunnerCard key={m.profile.id} match={m} />
                ))}
              </div>
            </>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}

function EmptyState({ icon, title, text, cta }: {
  icon: string; title: string; text: string; cta: { href: string; label: string }
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center max-w-md mx-auto">
      <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">{icon}</span>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{text}</p>
      <Link href={cta.href}
        className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:underline">
        <span className="material-symbols-outlined text-base">arrow_forward</span>
        {cta.label}
      </Link>
    </div>
  )
}
