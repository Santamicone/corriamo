import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'
import { LEVEL_LABELS, formatPace } from '@/lib/utils'
import { rankRunners } from '@/lib/matchmaking'
import { toRunLevel } from '@/lib/compatibility'

export interface CompagniMatches {
  hasSignal: boolean
  matches: ReturnType<typeof rankRunners>
  /** href precompilato per "crea un gruppo al tuo ritmo", se ≥3 match nella stessa città */
  groupHref: string | null
  sameCityCount: number
}

/** Candidati compatibili per l'utente `me` — usata sia da /compagni (pagina intera) che dal blocco compatto in Bacheca. */
export async function getCompagniMatches(supabase: SupabaseClient, me: Profile | null, limit: number): Promise<CompagniMatches> {
  const hasSignal = !!(me?.city || me?.pace_min || me?.level || me?.why_i_run?.length)
  if (!me || !hasSignal) return { hasSignal, matches: [], groupHref: null, sameCityCount: 0 }

  let query = supabase.from('profiles').select('*').neq('id', me.id).limit(200)
  if (me.city) query = query.ilike('city', `%${me.city}%`)
  const { data: candData } = await query

  let candidates = (candData ?? []) as Profile[]
  if (me.city && candidates.length < 6) {
    const { data: broad } = await supabase
      .from('profiles').select('*').neq('id', me.id)
      .order('created_at', { ascending: false }).limit(200)
    candidates = (broad ?? []) as Profile[]
  }

  const matches = rankRunners(me, candidates, limit)

  const cityNorm = me.city?.toLowerCase().trim()
  const sameCityMatches = cityNorm
    ? matches.filter(m => {
        const c = m.profile.city?.toLowerCase().trim()
        return c && (c === cityNorm || c.includes(cityNorm) || cityNorm.includes(c))
      })
    : []

  let groupHref: string | null = null
  if (me.city && sameCityMatches.length >= 3) {
    const params = new URLSearchParams({ city: me.city, group: '1' })
    if (me.pace_min) params.set('pace', formatPace(me.pace_min, me.pace_max))
    const runLevel = toRunLevel(me.level)
    if (runLevel && runLevel !== 'tutti') params.set('level', runLevel)
    groupHref = `/nuova-corsa?${params.toString()}`
  }

  return { hasSignal, matches, groupHref, sameCityCount: sameCityMatches.length }
}

export function RunnerCard({ match }: { match: ReturnType<typeof rankRunners>[number] }) {
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

/** Blocco compatto "Runner come te" — usato in Bacheca, sotto le corse/serie. Non renderizza nulla se non ci sono match. */
export function CompagniBlockCompact({ matches }: { matches: CompagniMatches }) {
  if (matches.matches.length === 0) return null
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">diversity_3</span>
          <h2 className="text-base font-extrabold text-gray-800">Runner come te</h2>
        </div>
        <Link href="/compagni" className="text-sm font-semibold text-primary hover:underline">
          Vedi tutti i compagni →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {matches.matches.map(m => <RunnerCard key={m.profile.id} match={m} />)}
      </div>
    </div>
  )
}
