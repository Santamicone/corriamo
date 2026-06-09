import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { LEVEL_LABELS } from '@/lib/utils'
import { rankRunners } from '@/lib/matchmaking'

export const metadata: Metadata = {
  title: 'Runner compatibili con te',
  robots: { index: false, follow: false },
}

export default async function CompagniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  const me = meData as Profile | null

  // Profilo troppo scarno: nessun segnale per il matching
  const hasSignal = !!(me?.city || me?.pace_min || me?.level || me?.why_i_run?.length)

  // Candidati: stessa città se disponibile, altrimenti i profili più recenti.
  let query = supabase.from('profiles').select('*').neq('id', user.id).limit(200)
  if (me?.city) query = query.ilike('city', `%${me.city}%`)
  const { data: candData } = await query

  let candidates = (candData ?? []) as Profile[]

  // Se nella stessa città ci sono pochi profili, allarga a tutti.
  if (me?.city && candidates.length < 6) {
    const { data: broad } = await supabase
      .from('profiles').select('*').neq('id', user.id)
      .order('created_at', { ascending: false }).limit(200)
    candidates = (broad ?? []) as Profile[]
  }

  const matches = me && hasSignal ? rankRunners(me, candidates, 24) : []

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">diversity_3</span>
              Runner compatibili
            </h1>
            <p className="text-gray-500 mt-1">
              Persone vicine a te, allo stesso ritmo e con le stesse motivazioni. Scrivi e organizzate una corsa.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map(m => (
                <RunnerCard key={m.profile.id} match={m} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function RunnerCard({ match }: { match: ReturnType<typeof rankRunners>[number] }) {
  const { profile: p, label, reasons } = match
  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <Link href={`/profilo/${p.id}`} className="shrink-0">
          <Avatar name={p.full_name} src={p.avatar_url} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profilo/${p.id}`}
            className="text-sm font-bold text-gray-900 hover:text-primary transition-colors truncate block">
            {p.full_name}
          </Link>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-0.5">
            {p.city && (
              <span className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">place</span>{p.city}
              </span>
            )}
            {p.level && <span>{LEVEL_LABELS[p.level] ?? p.level}</span>}
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 bg-orange-50 text-primary text-[11px] font-bold px-2 py-1 rounded-full">
          <span className="material-symbols-filled text-sm">bolt</span>
          {label}
        </span>
      </div>

      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1 mt-3">
          {reasons.map(r => (
            <li key={r} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="material-symbols-outlined text-sm text-green-500">check</span>
              {r}
            </li>
          ))}
        </ul>
      )}

      <Link href={`/messaggi/direct/${p.id}`}
        className="mt-4 inline-flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-primary-hover transition-colors">
        <span className="material-symbols-outlined text-lg">chat</span>
        Scrivi a {p.full_name.split(' ')[0]}
      </Link>
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
