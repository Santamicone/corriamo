'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const labelCls = 'text-xs font-bold uppercase tracking-wider text-gray-400'

export function StravaConnectCard({
  userId,
  connected,
  shareActivities,
  publicProfile,
  status,
}: {
  userId: string
  connected: boolean
  shareActivities: boolean
  publicProfile: boolean
  status?: string
}) {
  const router = useRouter()
  const [share, setShare] = useState(shareActivities)
  const [pub, setPub] = useState(publicProfile)
  const [busy, setBusy] = useState(false)

  const banner = {
    connected: { ok: true,  text: 'Account Strava collegato con successo.' },
    denied:    { ok: false, text: 'Collegamento annullato: non hai autorizzato l\'accesso.' },
    scope:     { ok: false, text: 'Serve il permesso di lettura delle attività per collegare Strava.' },
    error:     { ok: false, text: 'Qualcosa è andato storto durante il collegamento. Riprova.' },
  }[status ?? ''] as { ok: boolean; text: string } | undefined

  const toggleShare = async () => {
    const next = !share
    setShare(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ strava_share_activities: next })
      .eq('id', userId)
    if (error) setShare(!next) // rollback su errore
  }

  const togglePublic = async () => {
    const next = !pub
    setPub(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ strava_public_profile: next })
      .eq('id', userId)
    if (error) setPub(!next) // rollback su errore
  }

  const disconnect = async () => {
    if (!confirm('Scollegare Strava? Le attività importate verranno rimosse dalle tue crew.')) return
    setBusy(true)
    await fetch('/api/strava/disconnect', { method: 'POST' })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col gap-4">
      <div>
        <p className={labelCls}>Strava</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Collega il tuo account per condividere automaticamente le corse con le tue crew private.
        </p>
      </div>

      {banner && (
        <p className={cn(
          'text-sm px-4 py-3 rounded-2xl flex items-center gap-2',
          banner.ok ? 'text-green-700 bg-green-50 border border-green-100'
                    : 'text-amber-700 bg-amber-50 border border-amber-100'
        )}>
          <span className="material-symbols-filled text-base">
            {banner.ok ? 'check_circle' : 'info'}
          </span>
          {banner.text}
        </p>
      )}

      {connected ? (
        <>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FC4C02]/5 border border-[#FC4C02]/20">
            <span className="w-9 h-9 rounded-full bg-[#FC4C02] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-lg">directions_run</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Strava collegato</p>
              <p className="text-xs text-gray-400">Le nuove corse arrivano in automatico.</p>
            </div>
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 rounded-xl px-3 py-1.5 shrink-0 disabled:opacity-50"
            >
              Scollega
            </button>
          </div>

          {/* Toggle condivisione */}
          <label className={cn(
            'flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all',
            share ? 'bg-orange-50 border-orange-200' : 'border-gray-100 hover:bg-gray-50'
          )}>
            <input
              type="checkbox"
              checked={share}
              onChange={toggleShare}
              className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900">
                Condividi le mie corse con le crew private
              </span>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {share
                  ? 'I membri delle tue crew private vedono le tue corse nel feed attività.'
                  : 'Le tue corse restano collegate ma non appaiono nel feed delle crew.'}
              </p>
            </div>
          </label>

          {/* Toggle profilo pubblico */}
          <label className={cn(
            'flex items-start gap-3 cursor-pointer p-3.5 rounded-2xl border transition-all',
            pub ? 'bg-orange-50 border-orange-200' : 'border-gray-100 hover:bg-gray-50'
          )}>
            <input
              type="checkbox"
              checked={pub}
              onChange={togglePublic}
              className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900">
                Mostra le mie corse sul profilo pubblico
              </span>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {pub
                  ? 'Chiunque visiti il tuo profilo vede le tue corse recenti.'
                  : 'Le tue corse non appaiono sul profilo pubblico.'}
              </p>
            </div>
          </label>
        </>
      ) : (
        <a
          href="/api/strava/connect"
          className="inline-flex items-center justify-center gap-2 bg-[#FC4C02] text-white font-semibold text-sm px-5 py-3 rounded-2xl hover:bg-[#e34402] transition-colors"
        >
          <span className="material-symbols-outlined text-base">link</span>
          Collega Strava
        </a>
      )}
    </div>
  )
}
