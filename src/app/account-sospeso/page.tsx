import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { UserModeration } from '@/lib/types'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AccountSospesoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('moderation_status, moderation_until').eq('id', user.id).maybeSingle()

  // Se non c'è più alcun provvedimento attivo, rimanda in app
  if (!profile || !['suspended', 'banned'].includes(profile.moderation_status ?? '')) {
    redirect('/bacheca')
  }

  const banned = profile.moderation_status === 'banned'
  const { data: last } = await supabase
    .from('user_moderation').select('*').eq('user_id', user.id)
    .in('action', banned ? ['ban'] : ['suspension'])
    .is('revoked_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const provvedimento = last as unknown as UserModeration | null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-red-500">
          {banned ? 'block' : 'pause_circle'}
        </span>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-3">
          {banned ? 'Account bloccato' : 'Account sospeso'}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {banned
            ? 'Il tuo account è stato bloccato in modo permanente.'
            : profile.moderation_until
              ? `Il tuo account è sospeso fino al ${formatDate(profile.moderation_until)}.`
              : 'Il tuo account è temporaneamente sospeso.'}
        </p>

        {provvedimento?.reason && (
          <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motivazione</p>
            <p className="text-sm text-gray-700">{provvedimento.reason}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Se ritieni si tratti di un errore, scrivi a{' '}
          <a href="mailto:info@vieniacorrere.it" className="text-indigo-600">info@vieniacorrere.it</a>.
        </p>
        <div className="mt-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">Torna alla home</Link>
        </div>
      </div>
    </div>
  )
}
